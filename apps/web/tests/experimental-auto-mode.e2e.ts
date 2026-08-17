// Keyless assembled-Web proof for the maintainer-only experimental Auto carrier.
// The fixture projection owns no model call and intentionally names a route absent
// from the advisory catalog: the menu must still show the exact effective model,
// effort, tier, reason, and unadmitted label that crossed the Session projection.
import { fileURLToPath } from 'node:url'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  assertFixtureInventory, captureStableAria, compareOrRefreshGolden,
  launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspaceZh, saveFailureShot, ZH_BROWSER_LOCALE } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./snapshots/experimental-auto-mode', import.meta.url))
const UI_EXPECTED = fileURLToPath(new URL('./snapshots/experimental-auto-mode/ui.expected.md', import.meta.url))
const MODE = webSnapshotMode()
interface AutoProjection {
  active: boolean
  evidenceStatus: 'experimental-unadmitted'
  decision: {
    turn: number
    step: number
    tier: 'fast' | 'standard' | 'strong' | 'fallback'
    provider: string
    model: string
    reasoningEffort: string
    reasonCode: string
    reason: string
  } | null
}

const AUTO: AutoProjection = {
  active: true,
  evidenceStatus: 'experimental-unadmitted',
  decision: {
    turn: 1,
    step: 0,
    tier: 'strong',
    provider: 'maintainer-provider',
    model: 'maintainer-strong-model',
    reasoningEffort: 'max',
    reasonCode: 'high-complexity-task',
    reason: 'Matched a high-complexity or high-consequence task signal.',
  },
}

describe.skipIf(MODE === 'record')('web e2e: experimental Auto model menu', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({})
    const projections = (scaffold.ctx as unknown as {
      sessionProjections: {
        register(definition: {
          key: string
          schema: { parse(value: unknown): AutoProjection }
          init(): AutoProjection
          apply(state: AutoProjection, event: unknown): AutoProjection
          view(state: AutoProjection): AutoProjection
          stateVersion: number
        }): void
      }
    }).sessionProjections
    projections.register({
      key: 'dshAutoMode',
      schema: { parse: value => value as AutoProjection },
      init: () => AUTO,
      apply: state => state,
      view: state => state,
      stateVersion: 1,
    })
    const executablePath = process.env.DSH_PLAYWRIGHT_EXECUTABLE_PATH
    browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
    page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: ZH_BROWSER_LOCALE })
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
    await connectFreshWorkspaceZh(page, scaffold.workspaceCwd, 'experimental-auto-mode')
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('shows Auto first, checked, and explains the exact projected route', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-experimental-auto-mode'))
    const trigger = page.getByRole('button', {
      name: /Auto.*maintainer-strong-model.*max/i,
    })
    await trigger.waitFor({ timeout: 15_000 })
    await trigger.click()

    const auto = page.getByRole('menuitemradio', { name: /Auto/ })
    await expect.poll(() => auto.getAttribute('aria-checked')).toBe('true')
    await page.getByText('实际选择', { exact: true }).waitFor()
    await page.getByText('maintainer-strong-model · max', { exact: true }).waitFor()
    await page.getByText('strong · high-complexity-task', { exact: true }).waitFor()
    await page.getByText('实验模式 · 未经质量准入', { exact: true }).waitFor()
    const snapshot = await captureStableAria(page, '[role="menu"]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(UI_EXPECTED, snapshot, MODE)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('keeps its snapshot inventory closed', async () => {
    await assertFixtureInventory(SNAPSHOT_DIR, ['ui.expected.md'])
  })
})
