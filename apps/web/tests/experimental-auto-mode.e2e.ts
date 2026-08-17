// Keyless assembled-Web proof for the maintainer-only experimental Auto carrier.
// The fixture projection owns no model call and intentionally names a route absent
// from the advisory catalog: the menu must still show the exact effective model,
// effort, tier, reason, and unadmitted label that crossed the Session projection.
import { fileURLToPath } from 'node:url'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
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
  previousDecision?: AutoProjection['decision']
}

const AUTO: AutoProjection = {
  active: true,
  evidenceStatus: 'experimental-unadmitted',
  decision: {
    turn: 1,
    step: 0,
    tier: 'fast',
    provider: 'maintainer-provider',
    model: 'maintainer-fast-model',
    reasoningEffort: 'off',
    reasonCode: 'bounded-simple-task',
    reason: 'Matched a bounded low-complexity task signal.',
  },
}

const MODEL_ONLY_AUTO: AutoProjection = {
  active: true,
  evidenceStatus: 'experimental-unadmitted',
  decision: {
    turn: 2,
    step: 0,
    tier: 'standard',
    provider: 'maintainer-provider',
    model: 'maintainer-standard-model',
    reasoningEffort: 'off',
    reasonCode: 'default-standard-task',
    reason: 'Selected the prototype default.',
  },
  previousDecision: AUTO.decision,
}

const EFFORT_ONLY_AUTO: AutoProjection = {
  active: true,
  evidenceStatus: 'experimental-unadmitted',
  decision: {
    turn: 3,
    step: 0,
    tier: 'standard',
    provider: 'maintainer-provider',
    model: 'maintainer-standard-model',
    reasoningEffort: 'max',
    reasonCode: 'high-complexity-task',
    reason: 'Matched a high-complexity task signal.',
  },
  previousDecision: MODEL_ONLY_AUTO.decision,
}

const SWITCHED_AUTO: AutoProjection = {
  active: true,
  evidenceStatus: 'experimental-unadmitted',
  decision: {
    turn: 4,
    step: 0,
    tier: 'strong',
    provider: 'maintainer-provider',
    model: 'maintainer-strong-model',
    reasoningEffort: 'high',
    reasonCode: 'high-complexity-task',
    reason: 'Matched a high-complexity or high-consequence task signal.',
  },
  previousDecision: EFFORT_ONLY_AUTO.decision,
}

const SELECTION_EVENT = 'dsh-auto-mode/selection'
const INITIAL_TASK = 'Format a bounded README change.'
const MODEL_ONLY_TASK = 'Move this request to another model without changing effort.'
const EFFORT_ONLY_TASK = 'Increase the reasoning budget without changing model.'
const SWITCH_TASK = 'Review an authentication race condition.'

function selectionData(decision: NonNullable<AutoProjection['decision']>) {
  return {
    schemaVersion: 1,
    mode: 'auto',
    evidenceStatus: 'experimental-unadmitted' as const,
    ...decision,
  }
}

function appendAutoSelection(
  agent: { session: unknown },
  decision: NonNullable<AutoProjection['decision']>,
): void {
  (agent.session as { append(type: string, data: ReturnType<typeof selectionData>): void })
    .append(SELECTION_EVENT, selectionData(decision))
}

/** Append the user input that precedes one Auto selection in the live timeline. */
function appendUserInput(agent: { session: unknown }, text: string): void {
  (agent.session as {
    append(type: 'user/message', data: ReturnType<typeof createUserMessage>, options: { surfaceOp: 'append' }): void
  }).append('user/message', createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  }), { surfaceOp: 'append' })
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
      apply: (state, event) => {
        const candidate = event as { type?: unknown; data?: unknown }
        if (candidate.type !== SELECTION_EVENT) return state
        const data = candidate.data as { model?: unknown; reasoningEffort?: unknown }
        if (
          data.model === MODEL_ONLY_AUTO.decision?.model
          && data.reasoningEffort === MODEL_ONLY_AUTO.decision?.reasoningEffort
        ) return MODEL_ONLY_AUTO
        if (
          data.model === EFFORT_ONLY_AUTO.decision?.model
          && data.reasoningEffort === EFFORT_ONLY_AUTO.decision?.reasoningEffort
        ) return EFFORT_ONLY_AUTO
        if (
          data.model === SWITCHED_AUTO.decision?.model
          && data.reasoningEffort === SWITCHED_AUTO.decision?.reasoningEffort
        ) return SWITCHED_AUTO
        return AUTO
      },
      view: state => state,
      stateVersion: 1,
    })
    const sessions = (scaffold.ctx as unknown as {
      sessions: {
        registerEventNamespace(registration: {
          namespace: string
          owner: string
          version: number
          events: Record<string, { parse(value: unknown): unknown }>
        }): void
      }
    }).sessions
    sessions.registerEventNamespace({
      namespace: 'dsh-auto-mode',
      owner: 'experimental-auto-mode-fixture',
      version: 1,
      events: { [SELECTION_EVENT]: { parse: value => value } },
    })
    const executablePath = process.env.DSH_PLAYWRIGHT_EXECUTABLE_PATH
    browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
    page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: ZH_BROWSER_LOCALE })
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
    await connectFreshWorkspaceZh(page, scaffold.workspaceCwd, 'experimental-auto-mode')
    const agent = scaffold.ctx.agents.roots()[0]
    if (agent === undefined) throw new Error('experimental Auto fixture opened no root Agent')
    appendUserInput(agent, INITIAL_TASK)
    appendAutoSelection(agent, AUTO.decision!)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('shows Auto first, checked, and marks a changed projected route', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-experimental-auto-mode'))
    const trigger = page.getByRole('button', {
      name: /Auto.*maintainer-fast-model.*off/i,
    })
    await trigger.waitFor({ timeout: 15_000 })
    await trigger.click()

    const auto = page.getByRole('menuitemradio', { name: /Auto/ })
    await expect.poll(() => auto.getAttribute('aria-checked')).toBe('true')
    await page.getByText('实际选择', { exact: true }).waitFor()
    await page.getByText('maintainer-fast-model · off', { exact: true }).waitFor()
    await page.getByText('fast · bounded-simple-task', { exact: true }).waitFor()
    await expect.poll(async () => await page.getByText('已切换模型与推理等级', { exact: true }).count()).toBe(0)
    await page.getByText('实验模式 · 未经质量准入', { exact: true }).waitFor()
    // Let React commit the initial projection as the non-animated baseline.
    await page.waitForTimeout(50)

    const agent = scaffold.ctx.agents.roots()[0]
    if (agent === undefined) throw new Error('experimental Auto fixture opened no root Agent')
    appendUserInput(agent, MODEL_ONLY_TASK)
    appendAutoSelection(agent, MODEL_ONLY_AUTO.decision!)
    await page.getByText(MODEL_ONLY_TASK, { exact: true }).waitFor()
    await page.getByText('standard · default-standard-task', { exact: true }).waitFor()
    const rollingValues = page.locator('[class*="routeRollTrack"]')
    await expect.poll(() => rollingValues.count()).toBe(2)
    await expect.poll(() => rollingValues.allTextContents()).toEqual(expect.arrayContaining([
      'maintainer-fast-modelmaintainer-standard-model',
    ]))
    await page.getByText('已切换模型与推理等级', { exact: true }).waitFor()
    await page.getByText('Auto 已切换模型和推理等级', { exact: true }).waitFor()
    const routeNotices = page.getByRole('status', { name: 'Auto 已切换模型和推理等级' })
    await expect.poll(() => routeNotices.last().textContent()).toContain('模型：maintainer-fast-model → maintainer-standard-model')
    await expect.poll(() => routeNotices.last().textContent()).toContain('推理等级：off')
    await expect.poll(() => routeNotices.last().locator('[class*="changedValue"]').textContent()).toBe('maintainer-standard-model')
    await expect.poll(() => rollingValues.first().evaluate(element => getComputedStyle(element).animationName))
      .toMatch(/auto-route-value-roll$/)
    await expect.poll(() => rollingValues.first().evaluate(element => getComputedStyle(element).animationDuration))
      .toBe('1.2s')
    await expect.poll(() => rollingValues.first().evaluate(element => getComputedStyle(element).animationPlayState))
      .toBe('running')
    const changedTargets = page.locator('[class*="routeRollTarget"]')
    await expect.poll(() => changedTargets.count()).toBe(2)
    await expect.poll(() => changedTargets.first().evaluate(element => getComputedStyle(element).animationDelay))
      .toBe('1.2s')
    await expect.poll(() => changedTargets.first().evaluate(element => getComputedStyle(element).animationPlayState))
      .toBe('running')
    const changedAuto = page.locator('[class*="autoTriggerChanged"]')
    await expect.poll(() => changedAuto.count()).toBe(1)
    await expect.poll(() => changedAuto.evaluate(element => getComputedStyle(element).animationName))
      .toMatch(/auto-route-target-breathe$/)
    await expect.poll(() => changedAuto.evaluate(element => getComputedStyle(element).animationPlayState))
      .toBe('running')

    appendUserInput(agent, EFFORT_ONLY_TASK)
    appendAutoSelection(agent, EFFORT_ONLY_AUTO.decision!)
    await page.getByText(EFFORT_ONLY_TASK, { exact: true }).waitFor()
    await page.getByText('standard · high-complexity-task', { exact: true }).waitFor()
    await expect.poll(() => rollingValues.count()).toBe(2)
    await expect.poll(() => rollingValues.allTextContents()).toEqual(expect.arrayContaining([
      'offmax',
    ]))
    await expect.poll(() => routeNotices.last().textContent()).toContain('模型：maintainer-standard-model')
    await expect.poll(() => routeNotices.last().textContent()).toContain('推理等级：off → max')
    await expect.poll(() => routeNotices.last().locator('[class*="changedValue"]').textContent()).toBe('max')
    await expect.poll(() => rollingValues.first().evaluate(element => getComputedStyle(element).animationPlayState))
      .toBe('running')
    await expect.poll(() => changedTargets.count()).toBe(2)
    await expect.poll(() => changedTargets.first().evaluate(element => getComputedStyle(element).animationPlayState))
      .toBe('running')
    await expect.poll(() => changedAuto.evaluate(element => getComputedStyle(element).animationPlayState))
      .toBe('running')

    appendUserInput(agent, SWITCH_TASK)
    appendAutoSelection(agent, SWITCHED_AUTO.decision!)
    await page.getByText(SWITCH_TASK, { exact: true }).waitFor()
    await page.getByText('strong · high-complexity-task', { exact: true }).waitFor()
    await expect.poll(() => rollingValues.count()).toBe(4)
    await expect.poll(() => rollingValues.allTextContents()).toEqual(expect.arrayContaining([
      'maintainer-standard-modelmaintainer-strong-model',
      'maxhigh',
    ]))
    await expect.poll(() => routeNotices.last().textContent()).toContain('模型：maintainer-standard-model → maintainer-strong-model')
    await expect.poll(() => routeNotices.last().textContent()).toContain('推理等级：max → high')
    await expect.poll(() => routeNotices.last().locator('[class*="changedValue"]').allTextContents())
      .toEqual(['maintainer-strong-model', 'high'])
    await expect.poll(() => changedTargets.count()).toBe(4)
    await expect.poll(() => changedTargets.first().evaluate(element => getComputedStyle(element).animationPlayState))
      .toBe('running')
    await expect.poll(() => changedAuto.evaluate(element => getComputedStyle(element).animationPlayState))
      .toBe('running')
    const snapshot = await captureStableAria(page, '[role="menu"]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(UI_EXPECTED, snapshot, MODE)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('keeps its snapshot inventory closed', async () => {
    await assertFixtureInventory(SNAPSHOT_DIR, ['ui.expected.md'])
  })
})
