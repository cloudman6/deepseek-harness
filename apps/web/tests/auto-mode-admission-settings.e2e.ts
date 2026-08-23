// Web e2e scenario: Custom route admission survives a Recommended round trip.
// A real browser drives the assembled Settings UI through generated Remotes and
// the Host Settings provider; no model call or external AA service is involved.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import type {
  RouteAdmissionProjection,
  RouteAdmissionProjectionProvider,
  RouteAdmissionSettings,
} from '../../../packages/host/auto-mode-admission/src/types.ts'
import {
  launchWebScaffold, watchConsole, type WebScaffold,
} from './scaffold.ts'
import { ZH_BROWSER_LOCALE, saveFailureShot } from './support.ts'

const RECOMMENDED_KEY = `evidence-route-key:v1:${'a'.repeat(64)}`
const CUSTOM_KEY = `evidence-route-key:v1:${'b'.repeat(64)}`
const RECOMMENDED_SET = `route-admission-set:v1:${'c'.repeat(64)}`
const CUSTOM_SET = `route-admission-set:v1:${'d'.repeat(64)}`

interface AdmissionService {
  registerProvider(provider: RouteAdmissionProjectionProvider): () => void
}

function projection(settings: RouteAdmissionSettings): RouteAdmissionProjection {
  const callable = [RECOMMENDED_KEY, CUSTOM_KEY]
  const admitted = settings.mode === 'recommended'
    ? [RECOMMENDED_KEY]
    : settings.customEvidenceRouteKeyIds.filter(key => callable.includes(key))
  const admittedSetId = admitted.length === 1 && admitted[0] === CUSTOM_KEY
    ? CUSTOM_SET
    : RECOMMENDED_SET
  return {
    schemaVersion: 1,
    projectionVersion: 'route-admission-projection/v3',
    policyVersion: 'route-admission-policy/v2',
    mode: settings.mode,
    evidencePackId: 'e2e-pack',
    evidencePackManifestVersion: 'aa-evidence-pack-manifest/v1',
    aaSnapshotId: 'e2e-snapshot',
    bindingRegistryVersion: 'aa-binding-registry/v1',
    localBindingOverlayId: `aa-local-binding-overlay:v1:${'e'.repeat(64)}`,
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
    callableEvidenceRouteKeyIds: callable,
    recommendedEvidenceRouteKeyIds: [RECOMMENDED_KEY],
    admittedEvidenceRouteKeyIds: admitted,
    configuredCustomEvidenceRouteKeyIds: [...settings.customEvidenceRouteKeyIds],
    unresolvedCustomEvidenceRouteKeyIds: [],
    recommendedSetId: RECOMMENDED_SET,
    admittedSetId,
    emptyAdmittedLevels: ['standard', 'deep'],
    counts: {
      hostRoutes: 2,
      bindings: 2,
      packBindings: 1,
      automaticBindings: 1,
      callable: 2,
      recommended: 1,
      admitted: admitted.length,
      exclusions: 2,
    },
    rows: [
      { key: RECOMMENDED_KEY, model: 'recommended-route', label: 'Recommended route', price: 1 },
      { key: CUSTOM_KEY, model: 'custom-route', label: 'Custom route', price: 2 },
    ].map(({ key, model, label, price }, index) => ({
      evidenceRouteKeyId: key,
      evidenceRouteKey: {
        schemaVersion: 1,
        providerNamespace: 'e2e-provider',
        modelKey: model,
        evidenceControls: {},
      },
      aaRecordId: `aa-${model}`,
      aaRecordLabel: label,
      evidenceStatus: 'valid' as const,
      hostStatus: 'callable' as const,
      admissionStatus: admitted.includes(key) ? 'enabled' as const : 'disabled' as const,
      recommended: key === RECOMMENDED_KEY,
      recommendedWinner: key === RECOMMENDED_KEY,
      admittedWinner: admitted.includes(key),
      bindingOrigin: index === 0 ? 'pack' as const : 'local-automatic' as const,
      routeId: `e2e-provider/${model}`,
      provider: 'e2e-provider',
      model,
      handlingLevel: 'light' as const,
      aaCapabilityScore: 30,
      aaPrice: price,
      aaLatencySeconds: 1,
      matchBasis: ['e2e fixture'],
      limitations: [],
      reasonCodes: [],
    })),
    exclusions: [
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
    ],
  }
}

describe('web e2e: Auto route-admission Settings persistence', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>
  let disposeProvider: () => void

  beforeAll(async () => {
    scaffold = await launchWebScaffold({})
    const service = scaffold.ctx.get('dshAutoModeAdmission') as AdmissionService
    const provider: RouteAdmissionProjectionProvider = {
      inspect: settings => Promise.resolve(projection(settings)),
    }
    disposeProvider = service.registerProvider(provider)
    const executablePath = process.env.DSH_PLAYWRIGHT_EXECUTABLE_PATH
    browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
    page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: ZH_BROWSER_LOCALE })
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    disposeProvider?.()
    await browser?.close()
    await scaffold?.close()
  })

  it('restores non-default and empty Custom subsets after Recommended round trips', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-auto-admission-custom-round-trip'))
    await page.getByRole('button', { name: '设置', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '设置' })
    await dialog.getByRole('button', { name: 'Auto 模式', exact: true }).click()
    await dialog.getByRole('heading', { name: 'Auto 路由', exact: true }).waitFor({ timeout: 10_000 })
    expect(await dialog.locator('[data-route-key]').filter({ hasText: 'Recommended route' }).getByText('推理等级: Default', { exact: true }).isVisible()).toBe(true)

    await dialog.getByText('排除详情 (2)', { exact: true }).click()
    expect(await dialog.getByRole('heading', { name: 'Qwen3.7 Plus', exact: true }).isVisible()).toBe(true)
    expect(await dialog.getByText('qwen-token-plan-cn / qwen3.7-plus', { exact: true }).isVisible()).toBe(true)
    expect(await dialog.getByText('推理等级: low', { exact: true }).isVisible()).toBe(true)
    expect(await dialog.getByText('当前 AA Snapshot 中没有精确对应记录。', { exact: true }).isVisible()).toBe(true)
    expect(await dialog.getByText('当前 AA Snapshot 中有多条同名记录，已隔离。', { exact: true }).isVisible()).toBe(true)
    expect(await dialog.getByText(`host-route:v1:${'1'.repeat(64)}`, { exact: true }).isVisible()).toBe(true)

    await dialog.getByRole('radio', { name: 'Custom', exact: true }).click()
    const recommended = dialog.locator('[data-route-key]').filter({ hasText: 'Recommended route' })
    const custom = dialog.locator('[data-route-key]').filter({ hasText: 'Custom route' })
    const recommendedCheckbox = recommended.getByRole('checkbox')
    const customCheckbox = custom.getByRole('checkbox')
    await expect.poll(() => recommendedCheckbox.isChecked(), { timeout: 5_000 }).toBe(true)
    expect(await customCheckbox.isChecked()).toBe(false)

    await customCheckbox.click()
    await expect.poll(() => customCheckbox.isChecked(), { timeout: 5_000 }).toBe(true)
    await recommendedCheckbox.click()
    await expect.poll(() => customCheckbox.isChecked(), { timeout: 5_000 }).toBe(true)
    await expect.poll(() => recommendedCheckbox.isChecked(), { timeout: 5_000 }).toBe(false)

    await dialog.getByRole('radio', { name: 'Recommended', exact: true }).click()
    await dialog.getByRole('radio', { name: 'Custom', exact: true }).click()
    await expect.poll(() => customCheckbox.isChecked(), { timeout: 5_000 }).toBe(true)
    await expect.poll(() => recommendedCheckbox.isChecked(), { timeout: 5_000 }).toBe(false)

    let settingsDocument = await readFile(join(scaffold.harnessHome, 'settings.yaml'), 'utf8')
    expect(settingsDocument).toContain(CUSTOM_KEY)
    expect(settingsDocument).not.toContain(RECOMMENDED_KEY)

    await customCheckbox.click()
    await expect.poll(() => customCheckbox.isChecked(), { timeout: 5_000 }).toBe(false)
    await dialog.getByRole('radio', { name: 'Recommended', exact: true }).click()
    await dialog.getByRole('radio', { name: 'Custom', exact: true }).click()
    await expect.poll(() => customCheckbox.isChecked(), { timeout: 5_000 }).toBe(false)
    await expect.poll(() => recommendedCheckbox.isChecked(), { timeout: 5_000 }).toBe(false)

    settingsDocument = await readFile(join(scaffold.harnessHome, 'settings.yaml'), 'utf8')
    expect(settingsDocument).not.toContain(CUSTOM_KEY)
    expect(settingsDocument).not.toContain(RECOMMENDED_KEY)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)
})
