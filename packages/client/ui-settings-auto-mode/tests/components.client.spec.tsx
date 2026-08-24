// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RouteAdmissionView } from '@deepseek-ai/dsh-api-remotes/client'
import { AutoModeSettingsSection, type AutoModeSettingsProps } from '../src/client/AutoModeSettingsSection.tsx'
import { en, type AutoModeLocaleKey } from '../src/client/locales.ts'

afterEach(cleanup)

const keyA = `evidence-route-key:v1:${'a'.repeat(64)}`
const keyB = `evidence-route-key:v1:${'b'.repeat(64)}`
const t = ((key: AutoModeLocaleKey): string => en[key]) as AutoModeSettingsProps['t']
const unusedHook = (() => { throw new Error('unused by Auto Mode Settings tests') }) as never

function available(
  mode: 'recommended' | 'custom' = 'recommended',
  customEvidenceRouteKeyIds: readonly string[] = mode === 'custom' ? [keyA] : [],
): RouteAdmissionView {
  const admittedEvidenceRouteKeyIds = mode === 'recommended' ? [keyA] : [...customEvidenceRouteKeyIds]
  return {
    available: true,
    writable: true,
    settings: { mode, customEvidenceRouteKeyIds: [...customEvidenceRouteKeyIds] },
    recommendedChanges: {
      addedEvidenceRouteKeyIds: [keyA],
      removedEvidenceRouteKeyIds: [],
      toSetId: `route-admission-set:v1:${'1'.repeat(64)}`,
    },
    projection: {
      schemaVersion: 1, projectionVersion: 'route-admission-projection/v3', policyVersion: 'route-admission-policy/v2', mode,
      evidencePackId: 'pack-private-2026-08-23', evidencePackManifestVersion: 'v1', aaSnapshotId: 'snapshot-42', bindingRegistryVersion: 'bindings-v2', routePolicyVersion: 'aa-route-policy/v2',
      localBindingOverlayId: `aa-local-binding-overlay:v1:${'c'.repeat(64)}`, localBindingCompilerVersion: 'aa-local-binding-compiler/v1',
      capabilityField: 'intelligence', capabilityMethodologyVersion: 'v4.1.1', priceField: 'normalized-price', priceNormalizationVersion: 'v1', latencyField: 'ttfat',
      bandPolicy: {
        light: { minimumInclusive: null, maximumExclusive: 35 },
        standard: { minimumInclusive: 35, maximumExclusive: 50 },
        deep: { minimumInclusive: 50, maximumExclusive: null },
      },
      callableEvidenceRouteKeyIds: [keyA, keyB],
      recommendedEvidenceRouteKeyIds: [keyA],
      admittedEvidenceRouteKeyIds,
      configuredCustomEvidenceRouteKeyIds: [...customEvidenceRouteKeyIds],
      unresolvedCustomEvidenceRouteKeyIds: [],
      recommendedSetId: `route-admission-set:v1:${'1'.repeat(64)}`, admittedSetId: `route-admission-set:v1:${'1'.repeat(64)}`, emptyAdmittedLevels: ['light'],
      counts: {
        hostRoutes: 2, bindings: 2, packBindings: 1, automaticBindings: 1,
        callable: 2, recommended: 1, admitted: admittedEvidenceRouteKeyIds.length, exclusions: 0,
      },
      rows: [
        { evidenceRouteKeyId: keyA, evidenceRouteKey: { schemaVersion: 1, providerNamespace: 'deepseek', modelKey: 'pro', evidenceControls: { effort: 'high' } }, aaRecordId: 'record-a', aaRecordLabel: 'DeepSeek Pro High', evidenceStatus: 'valid', hostStatus: 'callable', admissionStatus: admittedEvidenceRouteKeyIds.includes(keyA) ? 'enabled' : 'disabled', recommended: true, recommendedWinner: true, admittedWinner: admittedEvidenceRouteKeyIds.includes(keyA), bindingOrigin: 'pack', provider: 'deepseek-official', model: 'deepseek-v4-pro', modelName: 'DeepSeek V4 Pro', reasoningEffort: 'high', handlingLevel: 'standard', aaCapabilityScore: 43.7, aaPrice: 0.173, aaLatencySeconds: 28.34, matchBasis: ['exact'], limitations: [], reasonCodes: [] },
        { evidenceRouteKeyId: keyB, evidenceRouteKey: { schemaVersion: 1, providerNamespace: 'deepseek', modelKey: 'flash', evidenceControls: { effort: 'off' } }, aaRecordId: 'record-b', aaRecordLabel: 'DeepSeek Flash Non-reasoning', evidenceStatus: 'valid', hostStatus: 'callable', admissionStatus: admittedEvidenceRouteKeyIds.includes(keyB) ? 'enabled' : 'disabled', recommended: false, recommendedWinner: false, admittedWinner: admittedEvidenceRouteKeyIds.includes(keyB), bindingOrigin: 'local-automatic', provider: 'deepseek-official', model: 'deepseek-v4-flash', modelName: 'DeepSeek V4 Flash', reasoningEffort: 'off', handlingLevel: 'light', aaCapabilityScore: 29.3, aaPrice: 0.087, aaLatencySeconds: null, matchBasis: ['exact'], limitations: [], reasonCodes: admittedEvidenceRouteKeyIds.includes(keyB) ? [] : ['user-route-not-admitted'] },
      ],
      exclusions: [],
    },
  }
}

function props(overrides: Partial<AutoModeSettingsProps> = {}): AutoModeSettingsProps {
  return {
    t,
    close: vi.fn(),
    useSessions: unusedHook,
    useWorkspaces: unusedHook,
    view: vi.fn(async () => available()),
    setMode: vi.fn(async (mode: 'recommended' | 'custom') => available(mode)),
    setRoute: vi.fn(async (_key: string, enabled: boolean) => available('custom', enabled ? [keyA, keyB] : [keyA])),
    ...overrides,
  }
}

describe('AutoModeSettingsSection', () => {
  it('shows every Recommended, unavailable, winner, exclusion, metric, and version fact', async () => {
    const view = render(<AutoModeSettingsSection {...props()} />)
    expect(screen.getByText(en.loading)).toBeTruthy()
    expect(await screen.findByRole('heading', { name: en.title })).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>('radio', { name: new RegExp(en.recommended) }).checked).toBe(true)
    expect(screen.getByText(en.winner)).toBeTruthy()
    expect(screen.getByText('43.7')).toBeTruthy()
    expect(screen.getByText('0.173')).toBeTruthy()
    expect(screen.getByText('28.34s')).toBeTruthy()
    expect(screen.getByText('pack-private-2026-08-23')).toBeTruthy()
    expect(screen.getByText('snapshot-42')).toBeTruthy()
    expect(screen.getByText(/This level has no available route/)).toBeTruthy()
    expect(view.container.querySelectorAll('[data-route-key]')).toHaveLength(2)
    expect(screen.getByText(`${en.exclusionsTitle} (0)`)).toBeTruthy()
    expect(screen.getByText(en.recommendedChanged)).toBeTruthy()
  })

  it('shows Default for omitted effort and preserves explicit effort on route cards', async () => {
    const base = available()
    if (!base.available) throw new Error('fixture must be available')
    const explicitRow = base.projection.rows.find(row => row.evidenceRouteKeyId === keyA)
    const sourceDefaultRow = base.projection.rows.find(row => row.evidenceRouteKeyId === keyB)
    if (explicitRow === undefined || sourceDefaultRow === undefined) throw new Error('fixture rows must be available')
    const { reasoningEffort: sourceEffort, ...defaultSource } = sourceDefaultRow
    if (sourceEffort === undefined) throw new Error('source fixture effort must be explicit')
    const defaultRow = { ...defaultSource, aaRecordLabel: 'MiniMax-M2.5' }
    const view: RouteAdmissionView = {
      ...base,
      projection: {
        ...base.projection,
        rows: [explicitRow, defaultRow],
      },
    }

    const rendered = render(<AutoModeSettingsSection {...props({ view: async () => view })} />)
    await screen.findByRole('heading', { name: en.title })

    const explicitCard = rendered.container.querySelector(`[data-route-key="${keyA}"]`)
    const defaultCard = rendered.container.querySelector(`[data-route-key="${keyB}"]`)
    expect(explicitCard).not.toBeNull()
    expect(defaultCard).not.toBeNull()
    expect(within(explicitCard as HTMLElement).getByText('Effort: high')).toBeTruthy()
    expect(within(explicitCard as HTMLElement).getByText('DeepSeek Pro High')).toBeTruthy()
    expect(within(defaultCard as HTMLElement).getByText('Effort: Default')).toBeTruthy()
    expect(within(defaultCard as HTMLElement).getByText('MiniMax-M2.5 (Default)')).toBeTruthy()
  })

  it('groups exclusions by readable Host identity and localizes automatic-binding failures', async () => {
    const base = available()
    if (!base.available) throw new Error('fixture must be available')
    const exclusions = [
      {
        source: 'host-route',
        hostRouteId: `host-route:v1:${'1'.repeat(64)}`,
        provider: 'qwen-token-plan-cn',
        model: 'qwen3.7-plus',
        modelName: 'Qwen3.7 Plus',
        reasoningEffort: 'low',
        reasonCode: 'aa-local-binding-record-missing',
      },
      {
        source: 'host-route',
        hostRouteId: `host-route:v1:${'2'.repeat(64)}`,
        provider: 'qwen-token-plan-cn',
        model: 'qwen3.7-plus',
        modelName: 'Qwen3.7 Plus',
        reasoningEffort: 'high',
        reasonCode: 'aa-local-binding-record-ambiguous',
      },
    ] as const
    const view: RouteAdmissionView = {
      ...base,
      projection: {
        ...base.projection,
        counts: { ...base.projection.counts, exclusions: exclusions.length },
        exclusions,
      },
    }
    render(<AutoModeSettingsSection {...props({ view: async () => view })} />)
    await screen.findByRole('heading', { name: en.title })
    fireEvent.click(screen.getByText(`${en.exclusionsTitle} (2)`))

    expect(screen.getByRole('heading', { name: 'Qwen3.7 Plus' })).toBeTruthy()
    expect(screen.getByText('qwen-token-plan-cn / qwen3.7-plus')).toBeTruthy()
    expect(screen.getByText(`${en.effort}: low`)).toBeTruthy()
    expect(screen.getByText(en.noExactAARecord)).toBeTruthy()
    expect(screen.getByText(en.ambiguousAARecord)).toBeTruthy()
    expect(screen.getAllByText(/host-route:v1:/)).toHaveLength(2)
  })

  it('initializes Custom through the Host and toggles only its callable route', async () => {
    const setMode = vi.fn(async () => available('custom'))
    const setRoute = vi.fn(async () => available('custom', [keyA, keyB]))
    render(<AutoModeSettingsSection {...props({ setMode, setRoute })} />)
    await screen.findByRole('heading', { name: en.title })
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(en.custom) }))
    await waitFor(() => { expect(setMode).toHaveBeenCalledWith('custom') })
    const recommendedToggle = await screen.findByRole('checkbox', { name: /deepseek-official \/ deepseek-v4-pro/ })
    const callableToggle = screen.getByRole('checkbox', { name: /deepseek-official \/ deepseek-v4-flash/ })
    expect((recommendedToggle as HTMLInputElement).checked).toBe(true)
    expect((callableToggle as HTMLInputElement).checked).toBe(false)
    fireEvent.click(callableToggle)
    await waitFor(() => { expect(setRoute).toHaveBeenCalledWith(keyB, true) })
    expect(screen.getByText(en.saved)).toBeTruthy()
  })

  it('contains read and write failures and retries', async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error('private')).mockResolvedValueOnce(available())
    const rendered = render(<AutoModeSettingsSection {...props({ view: read })} />)
    expect((await screen.findByRole('alert')).textContent).toBe(en.error)
    expect(rendered.queryByText('private')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: en.retry }))
    expect(await screen.findByRole('heading', { name: en.title })).toBeTruthy()

    const failedMode = vi.fn().mockRejectedValue(new Error('write-secret'))
    rendered.rerender(<AutoModeSettingsSection {...props({ view: async () => available(), setMode: failedMode })} />)
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(en.custom) }))
    expect((await screen.findByRole('alert')).textContent).toBe(en.saveError)
    expect(rendered.queryByText('write-secret')).toBeNull()
  })

  it('reports provider absence without rendering stale routes', async () => {
    render(<AutoModeSettingsSection {...props({ view: async () => ({ available: false, writable: true, settings: { mode: 'recommended', customEvidenceRouteKeyIds: [] }, reason: 'provider-unavailable' }) })} />)
    expect((await screen.findByRole('status')).textContent).toBe(en.unavailable)
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('ignores a late result after unmount', async () => {
    const deferred = Promise.withResolvers<RouteAdmissionView>()
    const rendered = render(<AutoModeSettingsSection {...props({ view: () => deferred.promise })} />)
    rendered.unmount()
    await act(async () => { deferred.resolve(available()) })
  })
})
