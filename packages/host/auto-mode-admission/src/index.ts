/** User-settings and Remote integration for the external Auto route-admission provider. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace, type SettingsScope } from '@deepseek-ai/dsh-settings'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {} from 'zod'
import type {
  RecommendedChanges,
  RecommendedObservation,
  RouteAdmissionMode,
  RouteAdmissionProjection,
  RouteAdmissionProjectionProvider,
  RouteAdmissionSettings,
  RouteAdmissionStoredSettings,
  RouteAdmissionView,
} from './types.ts'

export type * from './types.ts'

/** User Settings namespace owned by the optional Auto admission bridge. */
export const AUTO_MODE_SETTINGS_NAMESPACE = settingsNamespace('dsh-auto-mode')
const KEY_ID = /^evidence-route-key:v1:[a-f0-9]{64}$/
const SET_ID = /^route-admission-set:v1:[a-f0-9]{64}$/
const MAX_OBSERVATIONS = 8
const MAX_PROJECTION_ITEMS = 10_000

const ObservationSchema: z<RecommendedObservation> = z.object({
  setId: z.string().required(),
  evidenceRouteKeyIds: z.array(z.string()).default([]),
  evidencePackId: z.string().required(),
  aaSnapshotId: z.string().required(),
  observedAt: z.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).required(),
})

/** Stored Settings schema for user admission and bounded local observations. */
export const AUTO_MODE_SETTINGS_SCHEMA: z<RouteAdmissionStoredSettings> = z.object({
  mode: z.union(['recommended', 'custom'] as const).default('recommended'),
  customEvidenceRouteKeyIds: z.array(z.string()).default([]),
  recommendedObservations: z.array(ObservationSchema).default([]),
})

function exactIds(values: readonly string[], label: string): string[] {
  if (values.some(value => !KEY_ID.test(value))) throw new TypeError(`${label} must contain canonical EvidenceRouteKey IDs`)
  if (new Set(values).size !== values.length) throw new TypeError(`${label} must not contain duplicates`)
  return [...values].sort()
}

function validateSettings(value: RouteAdmissionStoredSettings): void {
  exactIds(value.customEvidenceRouteKeyIds, 'customEvidenceRouteKeyIds')
  if (value.recommendedObservations.length > MAX_OBSERVATIONS) {
    throw new TypeError(`recommendedObservations must contain at most ${String(MAX_OBSERVATIONS)} entries`)
  }
  for (const observation of value.recommendedObservations) {
    if (!SET_ID.test(observation.setId)) throw new TypeError('recommended observation setId is invalid')
    exactIds(observation.evidenceRouteKeyIds, 'recommended observation keys')
  }
}

function publicSettings(value: RouteAdmissionStoredSettings): RouteAdmissionSettings {
  return {
    mode: value.mode,
    customEvidenceRouteKeyIds: [...value.customEvidenceRouteKeyIds],
  }
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  const normalizedLeft = [...left].sort()
  const normalizedRight = [...right].sort()
  return normalizedLeft.length === normalizedRight.length
    && normalizedLeft.every((value, index) => value === normalizedRight[index])
}

function differs(actual: unknown, expected: unknown): boolean {
  return actual !== expected
}

function assertProjection(value: RouteAdmissionProjection, settings?: RouteAdmissionSettings): void {
  const packBindings = value.counts.packBindings
  const automaticBindings = value.counts.automaticBindings
  const projectionVersionValid = value.projectionVersion === 'route-admission-projection/v2'
    || value.projectionVersion === 'route-admission-projection/v3'
  const automaticBindingFactsValid = value.projectionVersion === 'route-admission-projection/v2'
    || (typeof value.localBindingOverlayId === 'string'
      && /^aa-local-binding-overlay:v1:[a-f0-9]{64}$/.test(value.localBindingOverlayId)
      && value.localBindingCompilerVersion === 'aa-local-binding-compiler/v1'
      && typeof packBindings === 'number'
      && typeof automaticBindings === 'number'
      && Number.isSafeInteger(packBindings)
      && Number.isSafeInteger(automaticBindings)
      && packBindings >= 0
      && automaticBindings >= 0
      && packBindings + automaticBindings === value.counts.bindings
      && value.rows.every(row => row.bindingOrigin === 'pack' || row.bindingOrigin === 'local-automatic'))
  if (differs(value.schemaVersion, 1)
    || !projectionVersionValid
    || !automaticBindingFactsValid
    || differs(value.policyVersion, 'route-admission-policy/v2')
    || !SET_ID.test(value.recommendedSetId)
    || !SET_ID.test(value.admittedSetId)
    || value.rows.length > MAX_PROJECTION_ITEMS
    || value.exclusions.length > MAX_PROJECTION_ITEMS) {
    throw new TypeError('Auto admission provider returned an invalid projection')
  }
  const callableIds = exactIds(value.callableEvidenceRouteKeyIds, 'callable projection keys')
  const recommendedIds = exactIds(value.recommendedEvidenceRouteKeyIds, 'recommended projection keys')
  const admittedIds = exactIds(value.admittedEvidenceRouteKeyIds, 'admitted projection keys')
  const configuredIds = exactIds(value.configuredCustomEvidenceRouteKeyIds, 'configured Custom projection keys')
  const unresolvedIds = exactIds(value.unresolvedCustomEvidenceRouteKeyIds, 'unresolved Custom projection keys')
  const rowIds = exactIds(value.rows.map(row => row.evidenceRouteKeyId), 'projection row keys')
  const rowIdSet = new Set(rowIds)
  const callableIdSet = new Set(callableIds)
  if (callableIds.some(key => !rowIdSet.has(key))
    || recommendedIds.some(key => !callableIdSet.has(key))
    || admittedIds.some(key => !callableIdSet.has(key))
    || unresolvedIds.some(key => !configuredIds.includes(key))
    || (settings !== undefined && (value.mode !== settings.mode
      || !sameIds(configuredIds, settings.customEvidenceRouteKeyIds)))) {
    throw new TypeError('Auto admission provider returned an inconsistent projection')
  }
}

function difference(current: readonly string[], previous: readonly string[]): string[] {
  const other = new Set(previous)
  return current.filter(value => !other.has(value))
}

function recommendedChanges(
  projection: RouteAdmissionProjection,
  observations: readonly RecommendedObservation[],
): RecommendedChanges {
  const latest = observations.at(-1)
  const previous = latest?.setId === projection.recommendedSetId
    ? observations.at(-2)
    : latest
  const previousKeys = previous?.evidenceRouteKeyIds ?? []
  return {
    addedEvidenceRouteKeyIds: difference(projection.recommendedEvidenceRouteKeyIds, previousKeys),
    removedEvidenceRouteKeyIds: difference(previousKeys, projection.recommendedEvidenceRouteKeyIds),
    ...(previous === undefined ? {} : { fromSetId: previous.setId }),
    toSetId: projection.recommendedSetId,
  }
}

/** Optional maintained-fork bridge; the external plugin remains the evidence and policy owner. */
export class AutoModeAdmissionService extends TypertRemoteService {
  static inject = ['settings']

  private readonly scope: SettingsScope<RouteAdmissionStoredSettings>
  private provider: RouteAdmissionProjectionProvider | undefined
  private mutationTail: Promise<void> = Promise.resolve()

  constructor(ctx: Context) {
    super(ctx, 'dshAutoModeAdmission')
    this.scope = ctx.settings.register(AUTO_MODE_SETTINGS_NAMESPACE, AUTO_MODE_SETTINGS_SCHEMA, {
      applies: 'live',
      validate: validateSettings,
    })
  }

  /**
   * Register the sole external projection owner for this process.
   * @param provider - trusted external Auto plugin projection provider.
   * @returns disposer that removes this exact provider registration.
   */
  registerProvider(provider: RouteAdmissionProjectionProvider): () => void {
    if (this.provider !== undefined) throw new Error('dshAutoModeAdmission already has a projection provider')
    this.provider = provider
    let active = true
    const dispose = (): void => {
      if (!active) return
      active = false
      if (this.provider === provider) this.provider = undefined
    }
    this.ctx.effect(() => dispose, 'auto-mode-admission.provider')
    return dispose
  }

  /**
   * Read current user-owned admission fields; audit observations never enter eligibility.
   * @returns detached settings supplied to the external projection provider.
   */
  getSettings(): RouteAdmissionSettings {
    return publicSettings(this.scope.get())
  }

  private hasPersistedCustomSelection(): boolean {
    const descriptor = this.ctx.settings.describe().find(entry =>
      entry.ns === AUTO_MODE_SETTINGS_NAMESPACE)
    return descriptor?.user !== undefined
      && descriptor.user !== null
      && typeof descriptor.user === 'object'
      && Object.hasOwn(descriptor.user, 'customEvidenceRouteKeyIds')
  }

  private serializeMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationTail.then(operation, operation)
    this.mutationTail = result.then(() => undefined, () => undefined)
    return result
  }

  /**
   * Persist one bounded observation only when the exact Recommended set changed.
   * @param projection - validated browser projection for the current local recommendation.
   */
  async observeRecommended(projection: RouteAdmissionProjection): Promise<void> {
    assertProjection(projection)
    await this.serializeMutation(async () => {
      const current = this.scope.get()
      if (current.recommendedObservations.at(-1)?.setId === projection.recommendedSetId) return
      const observation: RecommendedObservation = {
        setId: projection.recommendedSetId,
        evidenceRouteKeyIds: [...projection.recommendedEvidenceRouteKeyIds],
        evidencePackId: projection.evidencePackId,
        aaSnapshotId: projection.aaSnapshotId,
        observedAt: Date.now(),
      }
      await this.scope.update({
        recommendedObservations: [...current.recommendedObservations, observation].slice(-MAX_OBSERVATIONS),
      })
    })
  }

  /**
   * Read a fresh bounded projection; provider absence remains explicit capability absence.
   * @param signal - caller cancellation forwarded to provider inspection.
   * @returns current settings and either a validated projection or explicit unavailability.
   */
  @Remote('view')
  async view(signal: AbortSignal): Promise<RouteAdmissionView> {
    const stored = this.scope.get()
    const settings = publicSettings(stored)
    if (this.provider === undefined) {
      return { available: false, writable: this.ctx.settings.writable, settings, reason: 'provider-unavailable' }
    }
    const projection = await this.provider.inspect(settings, signal)
    assertProjection(projection, settings)
    return {
      available: true,
      writable: this.ctx.settings.writable,
      settings,
      projection,
      recommendedChanges: recommendedChanges(projection, stored.recommendedObservations),
    }
  }

  /**
   * Change mode; the first Custom entry copies Recommended and later entries restore the saved subset.
   * @param mode - user-selected Recommended or Custom admission mode.
   * @param signal - caller cancellation forwarded to provider inspection.
   * @returns refreshed settings and projection after the committed mutation.
   */
  @Remote('setMode')
  async setMode(mode: RouteAdmissionMode, signal: AbortSignal): Promise<RouteAdmissionView> {
    if (!['recommended', 'custom'].includes(mode)) throw new TypeError('route admission mode is invalid')
    return this.serializeMutation(async () => {
      const stored = this.scope.get()
      if (mode === 'custom' && !this.hasPersistedCustomSelection()) {
        if (this.provider === undefined) throw new Error('Auto admission provider is unavailable')
        const settings = publicSettings(stored)
        const projection = await this.provider.inspect(settings, signal)
        assertProjection(projection, settings)
        await this.scope.update({
          mode,
          customEvidenceRouteKeyIds: [...projection.recommendedEvidenceRouteKeyIds],
        })
      } else {
        await this.scope.update({ mode })
      }
      return this.view(signal)
    })
  }

  /**
   * Enable or disable one current callable exact binding in Custom mode.
   * @param evidenceRouteKeyId - canonical exact evidence route identity to edit.
   * @param enabled - whether the route remains admitted for later Auto calls.
   * @param signal - caller cancellation forwarded to provider inspection.
   * @returns refreshed settings and projection after the committed mutation.
   */
  @Remote('setRoute')
  async setRoute(evidenceRouteKeyId: string, enabled: boolean, signal: AbortSignal): Promise<RouteAdmissionView> {
    if (!KEY_ID.test(evidenceRouteKeyId)) throw new TypeError('route identity must be a canonical EvidenceRouteKey ID')
    return this.serializeMutation(async () => {
      const stored = this.scope.get()
      if (stored.mode !== 'custom') throw new Error('individual routes can be changed only in Custom mode')
      if (this.provider === undefined) throw new Error('Auto admission provider is unavailable')
      const settings = publicSettings(stored)
      const projection = await this.provider.inspect(settings, signal)
      assertProjection(projection, settings)
      const row = projection.rows.find(candidate => candidate.evidenceRouteKeyId === evidenceRouteKeyId)
      if (row?.evidenceStatus !== 'valid' || row.hostStatus !== 'callable') {
        throw new Error('route is not a current callable exact binding')
      }
      const next = new Set(stored.customEvidenceRouteKeyIds)
      if (enabled) next.add(evidenceRouteKeyId)
      else next.delete(evidenceRouteKeyId)
      await this.scope.update({ customEvidenceRouteKeyIds: [...next].sort() })
      return this.view(signal)
    })
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    dshAutoModeAdmission: AutoModeAdmissionService
  }
}

export default AutoModeAdmissionService
