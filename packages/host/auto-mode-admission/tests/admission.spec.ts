import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import AutoModeAdmissionService from '../src/index.ts'
import type {
  RouteAdmissionProjection,
  RouteAdmissionSettings,
} from '../src/types.ts'

class MemorySettings extends SettingsProvider {
  readonly persisted: Array<{ ns: string; section: Record<string, unknown> }> = []
  private doc: Record<string, unknown>

  constructor(ctx: Context, doc: Record<string, unknown> = {}) {
    super(ctx)
    this.doc = structuredClone(doc)
  }

  get writable(): boolean { return true }
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve(structuredClone(this.doc)) }
  protected persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    this.doc[String(ns)] = structuredClone(section)
    this.persisted.push({ ns: String(ns), section: structuredClone(section) })
    return Promise.resolve()
  }
}

const keyA = `evidence-route-key:v1:${'a'.repeat(64)}`
const keyB = `evidence-route-key:v1:${'b'.repeat(64)}`
const keyC = `evidence-route-key:v1:${'c'.repeat(64)}`
const indexedKey = (index: number) =>
  `evidence-route-key:v1:${index.toString(16).padStart(64, '0')}`

function projection({
  callable = [keyA, keyB],
  recommended = [keyA],
}: {
  callable?: readonly string[]
  recommended?: readonly string[]
} = {}): RouteAdmissionProjection {
  return {
    schemaVersion: 1,
    projectionVersion: 'route-admission-projection/v3',
    policyVersion: 'route-admission-policy/v2',
    mode: 'recommended',
    evidencePackId: 'pack',
    evidencePackManifestVersion: 'aa-evidence-pack-manifest/v1',
    aaSnapshotId: 'snapshot',
    bindingRegistryVersion: 'aa-binding-registry/v1',
    localBindingOverlayId: `aa-local-binding-overlay:v1:${'d'.repeat(64)}`,
    localBindingCompilerVersion: 'aa-local-binding-compiler/v1',
    routePolicyVersion: 'aa-route-policy/v2',
    capabilityField: 'evaluations.artificial_analysis_intelligence_index',
    capabilityMethodologyVersion: 'v4.1.1',
    priceField: 'pricing.price_1m_normalized_7_to_2_to_1',
    priceNormalizationVersion: 'aa-price-normalization/v1',
    latencyField: 'performance.median_time_to_first_answer_token_seconds',
    bandPolicy: {
      light: { minimumInclusive: null, maximumExclusive: 35 },
      standard: { minimumInclusive: 35, maximumExclusive: 50 },
      deep: { minimumInclusive: 50, maximumExclusive: null },
    },
    callableEvidenceRouteKeyIds: [...callable],
    recommendedEvidenceRouteKeyIds: [...recommended],
    admittedEvidenceRouteKeyIds: [...recommended],
    configuredCustomEvidenceRouteKeyIds: [],
    unresolvedCustomEvidenceRouteKeyIds: [],
    recommendedSetId: `route-admission-set:v1:${recommended.join('').slice(-64).padStart(64, '0')}`,
    admittedSetId: `route-admission-set:v1:${recommended.join('').slice(-64).padStart(64, '0')}`,
    emptyAdmittedLevels: ['light', 'standard', 'deep'],
    counts: {
      hostRoutes: callable.length,
      bindings: callable.length,
      packBindings: callable.length,
      automaticBindings: 0,
      callable: callable.length,
      recommended: recommended.length,
      admitted: recommended.length,
      exclusions: 0,
    },
    rows: callable.map((key, index) => ({
      evidenceRouteKeyId: key,
      evidenceRouteKey: { schemaVersion: 1, providerNamespace: 'fixture', modelKey: `m${String(index)}`, evidenceControls: {} },
      aaRecordId: `record-${String(index)}`,
      aaRecordLabel: `Record ${String(index)}`,
      evidenceStatus: 'valid',
      hostStatus: 'callable',
      admissionStatus: recommended.includes(key) ? 'enabled' : 'disabled',
      recommended: recommended.includes(key),
      recommendedWinner: recommended.includes(key),
      admittedWinner: recommended.includes(key),
      bindingOrigin: 'pack',
      provider: 'fixture',
      model: `m${String(index)}`,
      handlingLevel: 'standard',
      aaCapabilityScore: 40 + index,
      aaPrice: 1 + index,
      aaLatencySeconds: 1,
      matchBasis: ['fixture'],
      limitations: [],
      reasonCodes: [],
    })),
    exclusions: [],
  }
}

const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

async function harness(doc: Record<string, unknown> = {}) {
  const ctx = new Context()
  contexts.push(ctx)
  const settingsFiber = ctx.plugin(MemorySettings, doc)
  await settingsFiber
  const serviceFiber = ctx.plugin(AutoModeAdmissionService)
  await serviceFiber
  const service = ctx.get('dshAutoModeAdmission') as AutoModeAdmissionService
  let current = projection()
  const disposeProvider = service.registerProvider({
    inspect: (settings: RouteAdmissionSettings) => {
      const callable = new Set(current.callableEvidenceRouteKeyIds)
      const recommended = new Set(current.recommendedEvidenceRouteKeyIds)
      const configured = [...settings.customEvidenceRouteKeyIds]
      const admitted = settings.mode === 'recommended'
        ? [...recommended]
        : configured.filter(key => callable.has(key))
      return Promise.resolve({
        ...current,
        mode: settings.mode,
        configuredCustomEvidenceRouteKeyIds: configured,
        unresolvedCustomEvidenceRouteKeyIds: configured.filter(key =>
          !current.rows.some(row => row.evidenceRouteKeyId === key)),
        admittedEvidenceRouteKeyIds: admitted,
        rows: current.rows.map(row => ({
          ...row,
          admissionStatus: admitted.includes(row.evidenceRouteKeyId) ? 'enabled' : 'disabled',
          admittedWinner: admitted.includes(row.evidenceRouteKeyId),
        })),
      })
    },
  })
  return {
    ctx,
    service,
    settings: ctx.settings as MemorySettings,
    disposeProvider,
    setProjection: (next: RouteAdmissionProjection) => { current = next },
  }
}

describe('AutoModeAdmissionService', () => {
  it('owns one Settings namespace and three direct Remote methods', async () => {
    const { ctx, service } = await harness()
    expect(remoteMethods(service)).toEqual([
      { method: 'view', invocation: { kind: 'direct' } },
      { method: 'setMode', invocation: { kind: 'direct' } },
      { method: 'setRoute', invocation: { kind: 'direct' } },
    ])
    expect(ctx.settings.describe().find(entry => entry.ns === 'dsh-auto-mode')?.value).toEqual({
      mode: 'recommended',
      customEvidenceRouteKeyIds: [],
      recommendedObservations: [],
    })
    await expect(service.view(new AbortController().signal)).resolves.toMatchObject({
      available: true,
      writable: true,
      settings: { mode: 'recommended', customEvidenceRouteKeyIds: [] },
      projection: {
        callableEvidenceRouteKeyIds: [keyA, keyB],
        recommendedEvidenceRouteKeyIds: [keyA],
      },
    })
  })

  it('initializes Custom from Recommended and can add a callable non-Recommended row', async () => {
    const { service, settings } = await harness()
    const custom = await service.setMode('custom', new AbortController().signal)
    expect(custom).toMatchObject({
      available: true,
      settings: { mode: 'custom', customEvidenceRouteKeyIds: [keyA] },
    })
    expect(settings.persisted.at(-1)?.section).toMatchObject({
      mode: 'custom',
      customEvidenceRouteKeyIds: [keyA],
    })

    const added = await service.setRoute(keyB, true, new AbortController().signal)
    expect(added).toMatchObject({ settings: { customEvidenceRouteKeyIds: [keyA, keyB] } })
    const disabled = await service.setRoute(keyA, false, new AbortController().signal)
    expect(disabled).toMatchObject({ settings: { customEvidenceRouteKeyIds: [keyB] } })
    await expect(service.setRoute(keyC, true, new AbortController().signal)).rejects.toThrow(/current callable exact binding/)
    await service.setMode('recommended', new AbortController().signal)
    await expect(service.setRoute(keyA, false, new AbortController().signal)).rejects.toThrow(/Custom mode/)
  })

  it('preserves an initialized Custom selection across Recommended mode round trips', async () => {
    const { service } = await harness()
    const signal = new AbortController().signal
    await service.setMode('custom', signal)
    await service.setRoute(keyA, false, signal)
    await service.setRoute(keyB, true, signal)
    await expect(service.view(signal)).resolves.toMatchObject({
      settings: { mode: 'custom', customEvidenceRouteKeyIds: [keyB] },
    })

    await service.setMode('recommended', signal)
    await service.setMode('custom', signal)

    await expect(service.view(signal)).resolves.toMatchObject({
      settings: { mode: 'custom', customEvidenceRouteKeyIds: [keyB] },
    })
  })

  it('preserves an intentionally empty Custom selection across Recommended mode round trips', async () => {
    const { service } = await harness()
    const signal = new AbortController().signal
    await service.setMode('custom', signal)
    await service.setRoute(keyA, false, signal)

    await service.setMode('recommended', signal)
    await service.setMode('custom', signal)

    await expect(service.view(signal)).resolves.toMatchObject({
      settings: { mode: 'custom', customEvidenceRouteKeyIds: [] },
    })
  })

  it('serializes concurrent route edits so one client cannot overwrite another', async () => {
    const { service, settings } = await harness()
    await service.setMode('custom', new AbortController().signal)
    const signal = new AbortController().signal
    await Promise.all([
      service.setRoute(keyA, false, signal),
      service.setRoute(keyB, false, signal),
    ])
    await expect(service.view(signal)).resolves.toMatchObject({
      settings: { mode: 'custom', customEvidenceRouteKeyIds: [] },
    })
    const persisted = settings.persisted.at(-1)?.section
    expect(persisted).toBeDefined()
    const resumed = await harness({ 'dsh-auto-mode': persisted })
    await expect(resumed.service.view(signal)).resolves.toMatchObject({
      settings: { mode: 'custom', customEvidenceRouteKeyIds: [] },
    })
  })

  it('records bounded Recommended changes only when the exact set identity changes', async () => {
    const { ctx, service, setProjection } = await harness()
    await service.observeRecommended(projection())
    await service.observeRecommended(projection())
    for (let index = 0; index < 10; index += 1) {
      const next = projection({ callable: [indexedKey(index)], recommended: [indexedKey(index)] })
      setProjection(next)
      await service.observeRecommended(next)
    }
    const stored = ctx.settings.get('dsh-auto-mode' as SettingsNamespace) as {
      recommendedObservations: readonly unknown[]
    }
    expect(stored.recommendedObservations).toHaveLength(8)
    const view = await service.view(new AbortController().signal)
    expect(view).toMatchObject({
      available: true,
      recommendedChanges: {
        addedEvidenceRouteKeyIds: [indexedKey(9)],
        removedEvidenceRouteKeyIds: [indexedKey(8)],
      },
    })
  })

  it('preserves unavailable Custom intent in storage and reports provider absence explicitly', async () => {
    const { service, setProjection, disposeProvider } = await harness({
      'dsh-auto-mode': { mode: 'custom', customEvidenceRouteKeyIds: [keyA, keyC] },
    })
    setProjection(projection({ callable: [keyB], recommended: [keyB] }))
    const view = await service.view(new AbortController().signal)
    expect(view).toMatchObject({
      available: true,
      settings: { mode: 'custom', customEvidenceRouteKeyIds: [keyA, keyC] },
    })
    disposeProvider()
    await expect(service.view(new AbortController().signal)).resolves.toMatchObject({ available: false })
  })
})
