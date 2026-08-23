/** REAL Loader composition for the optional external Auto admission provider. */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context, type Plugin } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import AutoModeAdmissionService from '../src/index.ts'
import type { RouteAdmissionProjection } from '../src/types.ts'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

class MemorySettings extends SettingsProvider {
  private doc: Record<string, unknown> = {}
  get writable(): boolean { return true }
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve(structuredClone(this.doc)) }
  protected persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    this.doc[String(ns)] = structuredClone(section)
    return Promise.resolve()
  }
}

const key = `evidence-route-key:v1:${'a'.repeat(64)}`
const setId = `route-admission-set:v1:${'b'.repeat(64)}`
const projection: RouteAdmissionProjection = {
  schemaVersion: 1, projectionVersion: 'route-admission-projection/v1', policyVersion: 'route-admission-policy/v1', mode: 'recommended',
  evidencePackId: 'fixture-pack', evidencePackManifestVersion: 'v1', aaSnapshotId: 'fixture-snapshot', bindingRegistryVersion: 'v1', routePolicyVersion: 'v2',
  capabilityField: 'intelligence', capabilityMethodologyVersion: 'v4.1.1', priceField: 'price', priceNormalizationVersion: 'v1', latencyField: 'latency',
  bandPolicy: {
    light: { minimumInclusive: null, maximumExclusive: 35 },
    standard: { minimumInclusive: 35, maximumExclusive: 50 },
    deep: { minimumInclusive: 50, maximumExclusive: null },
  },
  recommendedEvidenceRouteKeyIds: [key],
  admittedEvidenceRouteKeyIds: [key],
  configuredCustomEvidenceRouteKeyIds: [],
  unresolvedCustomEvidenceRouteKeyIds: [],
  recommendedSetId: setId,
  admittedSetId: setId,
  emptyAdmittedLevels: ['light', 'deep'], counts: { hostRoutes: 1, bindings: 1, recommended: 1, admitted: 1, exclusions: 0 },
  rows: [{ evidenceRouteKeyId: key, evidenceRouteKey: { schemaVersion: 1, providerNamespace: 'fixture', modelKey: 'model', evidenceControls: {} }, aaRecordId: 'record', aaRecordLabel: 'Fixture model', evidenceStatus: 'valid', hostStatus: 'callable', admissionStatus: 'enabled', recommended: true, recommendedWinner: true, admittedWinner: true, provider: 'fixture', model: 'model', handlingLevel: 'standard', aaCapabilityScore: 40, aaPrice: 1, aaLatencySeconds: 2, matchBasis: ['fixture'], limitations: [], reasonCodes: [] }],
  exclusions: [],
}

const ExternalProvider: Plugin.Object = {
  inject: ['dshAutoModeAdmission'],
  apply(ctx) {
    ctx.dshAutoModeAdmission.registerProvider({ inspect: settings => Promise.resolve({ ...projection, mode: settings.mode }) })
  },
}

async function loadComposition(): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'dsh-auto-admission-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: 'fixture:settings'",
    "- name: '@deepseek-ai/dsh-host-auto-mode-admission'",
    '- id: external',
    "  name: 'fixture:external-auto'",
    '',
  ].join('\n'))
  context = new Context()
  context.baseUrl = pathToFileURL(root).href + '/'
  await context.plugin(Loader)
  context.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['fixture:settings', MemorySettings],
    ['@deepseek-ai/dsh-host-auto-mode-admission', AutoModeAdmissionService],
    ['fixture:external-auto', ExternalProvider],
  ])
  context.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof context.loader.internal>
  await context.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await context.loader.await()
  return context
}

describe('real Loader composition', () => {
  it('mounts the external provider and releases its capability on provider disposal', async () => {
    const ctx = await loadComposition()
    const service = ctx.get('dshAutoModeAdmission') as AutoModeAdmissionService
    await expect(service.view(new AbortController().signal)).resolves.toMatchObject({ available: true, projection: { evidencePackId: 'fixture-pack' } })
    const external = [...ctx.loader.entries()].find(entry => entry.options.id === 'external')!
    await external.fiber!.dispose()
    await expect(service.view(new AbortController().signal)).resolves.toMatchObject({ available: false, reason: 'provider-unavailable' })
  })
})
