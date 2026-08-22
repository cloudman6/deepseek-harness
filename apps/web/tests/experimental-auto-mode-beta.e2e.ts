// Cross-repository, keyless vertical proof for the maintained Auto carrier.
// The scenario mounts the external plugin only when DSH_AUTO_MODE_ROOT names
// its checkout, then drives the real browser, agent loop, Session log, and
// request header through one shared decision path.
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  LlmAdapter, ReasoningEffortId,
  type GenerateOptions, type LlmModelInfo, type LlmResolvedModelInfo, type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import {
  launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, saveFailureShot } from './support.ts'

const MODE = webSnapshotMode()
const AUTO_MODE_ROOT = process.env.DSH_AUTO_MODE_ROOT
const RUN_INTEGRATION = MODE !== 'record'
  && typeof AUTO_MODE_ROOT === 'string'
  && AUTO_MODE_ROOT !== ''
const PROVIDER = 'auto-beta-fixture'
const SNAPSHOT_ID = 'aa-auto-beta-browser-fixture'
const LIGHT_ROUTE = { provider: PROVIDER, model: 'light-route', reasoningEffort: 'off' }
const STANDARD_EXPENSIVE_ROUTE = {
  provider: PROVIDER, model: 'standard-expensive-route', reasoningEffort: 'high',
}
const STANDARD_SLOW_ROUTE = {
  provider: PROVIDER, model: 'standard-slow-route', reasoningEffort: 'high',
}
const STANDARD_FAST_ROUTE = {
  provider: PROVIDER, model: 'standard-fast-route', reasoningEffort: 'high',
}
const DEEP_ROUTE = { provider: PROVIDER, model: 'deep-route', reasoningEffort: 'max' }
const MANUAL_ROUTE = { provider: PROVIDER, model: 'manual-route', reasoningEffort: 'off' }
const AUTO_ROUTES = [
  LIGHT_ROUTE,
  STANDARD_EXPENSIVE_ROUTE,
  STANDARD_SLOW_ROUTE,
  STANDARD_FAST_ROUTE,
  DEEP_ROUTE,
] as const

interface ExternalAutoPlugin {
  readonly name: string
  readonly inject: readonly string[]
  readonly apply: (ctx: unknown, config: unknown) => void
}

interface HostRouteIdentity {
  readonly routeId: string
  readonly effectiveConfigFingerprint: string
}

interface AutoSelectionData {
  readonly schemaVersion: 2
  readonly handlingLevel: 'light' | 'standard' | 'deep'
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
  readonly effectiveConfig: Record<string, unknown>
  readonly routeBasis: 'aa-matched' | 'configured-deep-fallback'
  readonly aaSnapshotId?: string
  readonly reasonCode: string
}

interface AutoModeData {
  readonly active: boolean
}

function assessmentInput(options: GenerateOptions): { readonly currentMessage?: unknown } | undefined {
  const message = options.messages?.find((candidate) => {
    const source = candidate?.source as { readonly plugin?: unknown } | undefined
    return source?.plugin === 'dsh-auto-mode'
  })
  const text = message?.content?.find(block => block?.type === 'text')?.text
  if (typeof text !== 'string') return undefined
  const separator = text.indexOf('\n')
  if (separator < 0) return undefined
  try {
    return JSON.parse(text.slice(separator + 1)) as { readonly currentMessage?: unknown }
  } catch {
    return undefined
  }
}

function assessmentFor(task: string): Record<string, unknown> {
  if (task.includes('[light]')) {
    return {
      taskKind: 'coding', scope: 'bounded', complexity: 'low', risk: 'low',
      verifiability: 'mechanical', confidence: 1,
      reasons: ['explicit-single-step', 'mechanically-checkable'],
    }
  }
  if (task.includes('[standard]')) {
    return {
      taskKind: 'coding', scope: 'normal', complexity: 'medium', risk: 'low',
      verifiability: 'partial', confidence: 1,
      reasons: ['multiple-dependent-steps', 'partially-checkable'],
    }
  }
  return {
    taskKind: 'architecture', scope: 'broad', complexity: 'high', risk: 'medium',
    verifiability: 'partial', confidence: 1,
    reasons: ['open-ended-scope', 'partially-checkable'],
  }
}

function textResponse(text: string): StreamChunk[] {
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'block-end', index: 0, block: { type: 'text', text } },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}

/** One deterministic provider serves both the fixed assessor and user-task routes. */
class AutoBetaAdapter extends LlmAdapter {
  readonly calls: GenerateOptions[] = []
  private readonly routes = [...AUTO_ROUTES, MANUAL_ROUTE]

  override listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve(this.routes.map(route => ({
      provider,
      id: route.model,
      name: route.model,
    })))
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    const route = this.routes.find(candidate => candidate.model === model)
    const effort = route?.reasoningEffort ?? 'off'
    return Promise.resolve({
      provider,
      id: model,
      name: model,
      reasoning: {
        efforts: [
          { id: ReasoningEffortId('off'), name: 'Off' },
          { id: ReasoningEffortId('high'), name: 'High' },
          { id: ReasoningEffortId('max'), name: 'Max' },
        ],
        defaultEffort: ReasoningEffortId(effort),
      },
    })
  }

  override async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.calls.push(options)
    const input = assessmentInput(options)
    if (input !== undefined) {
      const task = typeof input.currentMessage === 'string' ? input.currentMessage : ''
      yield { type: 'text-delta', index: 0, text: JSON.stringify(assessmentFor(task)) }
      yield { type: 'finish', reason: { kind: 'stop' } }
      return
    }
    yield * textResponse(`BETA ROUTE ${options.model}`)
  }
}

function eventData(event: SessionEvent): unknown {
  return event.data
}

function eventType(event: SessionEvent): string {
  return (event as unknown as { readonly type: string }).type
}

function selection(events: readonly SessionEvent[]): AutoSelectionData {
  const event = events.find(candidate => eventType(candidate) === 'dsh-auto-mode/selection')
  if (event === undefined) throw new Error('turn did not persist an Auto selection')
  return eventData(event) as AutoSelectionData
}

function requestConfig(events: readonly SessionEvent[]): Record<string, unknown> {
  const event = events.find(candidate => candidate.type === 'request/header')
  if (event === undefined) throw new Error('turn did not persist a request header')
  return (eventData(event) as { readonly header: { readonly config: Record<string, unknown> } }).header.config
}

async function loadExternalContracts() {
  if (!RUN_INTEGRATION || AUTO_MODE_ROOT === undefined) {
    throw new Error('external Auto integration is disabled')
  }
  const plugin = await import(pathToFileURL(join(AUTO_MODE_ROOT, 'src/plugin.mjs')).href) as ExternalAutoPlugin
  const identityModule = await import(
    pathToFileURL(join(AUTO_MODE_ROOT, 'src/aa-evidence-binding.mjs')).href,
  ) as { readonly createHostRouteIdentity: (config: Record<string, unknown>) => HostRouteIdentity }
  return { plugin, createHostRouteIdentity: identityModule.createHostRouteIdentity }
}

describe.skipIf(!RUN_INTEGRATION)('web e2e: AA-informed Auto beta vertical path', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>
  let sessionEvents: SessionEvent[]

  beforeAll(async () => {
    const { plugin, createHostRouteIdentity } = await loadExternalContracts()
    const records = [
      { route: LIGHT_ROUTE, score: 30, price: 0.05, latency: 1 },
      { route: STANDARD_EXPENSIVE_ROUTE, score: 40, price: 0.2, latency: 0.1 },
      { route: STANDARD_SLOW_ROUTE, score: 41, price: 0.1, latency: 2 },
      { route: STANDARD_FAST_ROUTE, score: 42, price: 0.1, latency: 1 },
      { route: DEEP_ROUTE, score: 55, price: 0.3, latency: 1 },
    ].map(({ route, score, price, latency }) => ({
      identity: createHostRouteIdentity(route),
      route,
      record: {
        recordId: `aa-${route.model}`,
        label: route.model,
        capabilityFacts: ['Task 8 browser fixture'],
        evaluations: { artificial_analysis_intelligence_index: score },
        pricing: { price_1m_blended_7_to_2_to_1: price },
        performance: { median_time_to_first_answer_token_seconds: latency },
      },
    }))
    const seed = {
      schemaVersion: 1,
      catalogVersion: 'aa-evidence-catalog/v1',
      bindingVersion: 'aa-evidence-binding/v1',
      snapshot: { snapshotId: SNAPSHOT_ID, records: records.map(entry => entry.record) },
      bindings: records.map(entry => ({
        bindingVersion: 'aa-evidence-binding/v1',
        hostRouteId: entry.identity.routeId,
        effectiveConfigFingerprint: entry.identity.effectiveConfigFingerprint,
        aaSnapshotId: SNAPSHOT_ID,
        aaRecordId: entry.record.recordId,
        matchBasis: ['Task 8 browser fixture'],
        limitations: [],
      })),
    }

    scaffold = await launchWebScaffold()
    const adapter = new AutoBetaAdapter()
    scaffold.ctx.effect(
      () => scaffold.ctx.llm.registerAdapter([PROVIDER], adapter),
      'AA-informed Auto beta fixture adapter',
    )
    await scaffold.ctx.plugin(plugin, {
      mode: 'auto',
      seed,
      hostRoutes: AUTO_ROUTES,
      deepFallback: DEEP_ROUTE,
    })
    sessionEvents = []
    scaffold.ctx.on('session/event', (_session, event: SessionEvent) => { sessionEvents.push(event) })

    const executablePath = process.env.DSH_PLAYWRIGHT_EXECUTABLE_PATH
    browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
    page = await newEnglishPage(browser)
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
    await connectFreshWorkspace(page, scaffold.workspaceCwd, 'auto-beta-vertical')
  }, 120_000)

  afterAll(async () => {
    const failures: unknown[] = []
    await browser?.close().catch((error: unknown) => failures.push(error))
    await scaffold?.close().catch((error: unknown) => failures.push(error))
    if (failures.length === 1) throw failures[0]
    if (failures.length > 1) throw new AggregateError(failures, 'Auto beta browser cleanup failed')
  })

  it('keeps browser, Session, and request facts equal across all levels and Manual exit', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-auto-beta-vertical'))
    const composer = page.locator('textarea:enabled').last()
    await composer.waitFor({ timeout: 15_000 })
    const fixtures = [
      { prompt: '[light] Format one line.', level: 'light', route: LIGHT_ROUTE, label: 'Light' },
      {
        prompt: '[standard] Change two files.', level: 'standard',
        route: STANDARD_FAST_ROUTE, label: 'Standard',
      },
      { prompt: '[deep] Design an architecture.', level: 'deep', route: DEEP_ROUTE, label: 'Deep' },
    ] as const

    for (const fixture of fixtures) {
      const eventStart = sessionEvents.length
      const settled = scaffold.whenTurnSettled(60_000)
      await composer.fill(fixture.prompt)
      await composer.press('Enter')
      await settled
      const events = sessionEvents.slice(eventStart)
      const persisted = selection(events)
      const effective = requestConfig(events)

      expect(persisted.handlingLevel).toBe(fixture.level)
      expect(persisted.routeBasis).toBe('aa-matched')
      expect(persisted.aaSnapshotId).toBe(SNAPSHOT_ID)
      expect(persisted.effectiveConfig).toEqual(effective)
      expect(effective).toEqual(fixture.route)
      await page.getByText(`BETA ROUTE ${fixture.route.model}`, { exact: true }).last()
        .waitFor({ timeout: 15_000 })

      const trigger = page.getByRole('button', {
        name: new RegExp(`Auto.*${fixture.route.model}.*${fixture.route.reasoningEffort}`, 'i'),
      })
      await trigger.waitFor({ timeout: 15_000 })
      const menu = page.getByRole('menu')
      if (!await menu.isVisible()) await trigger.click()
      const autoStatus = menu.getByRole('status')
      await autoStatus.waitFor({ timeout: 10_000 })
      await expect.poll(() => autoStatus.innerText(), { timeout: 10_000 })
        .toContain('Task-handling level:')
      await expect.poll(() => autoStatus.innerText(), { timeout: 10_000 })
        .toContain(fixture.label)
      await autoStatus.getByText(new RegExp(`Basis: AA data.*${persisted.reasonCode}`, 'i')).waitFor()
      await autoStatus.getByText(`AA snapshot: ${SNAPSHOT_ID}`, { exact: true }).waitFor()
      await expect.poll(() => autoStatus.innerText(), { timeout: 10_000 })
        .toContain(fixture.route.model)
      await expect.poll(() => autoStatus.innerText(), { timeout: 10_000 })
        .toContain(`${fixture.route.reasoningEffort[0]?.toUpperCase()}${fixture.route.reasoningEffort.slice(1)}`)
      if (await menu.isVisible()) await trigger.click()
    }

    const autoTrigger = page.getByRole('button', { name: /Auto.*deep-route.*max/i })
    await autoTrigger.click()
    await page.getByRole('menuitem', { name: /^Model.*deep-route$/i }).click()
    await page.getByRole('menuitemradio', { name: MANUAL_ROUTE.model, exact: true }).click()
    await expect.poll(
      () => page.getByRole('button', { name: /manual-route/i }).getAttribute('aria-label'),
      { timeout: 10_000 },
    ).not.toMatch(/^Auto/i)

    const manualStart = sessionEvents.length
    const manualSettled = scaffold.whenTurnSettled(60_000)
    await composer.fill('Manual verification turn.')
    await composer.press('Enter')
    await manualSettled
    const manualEvents = sessionEvents.slice(manualStart)
    expect(manualEvents.some(event => eventType(event) === 'dsh-auto-mode/selection')).toBe(false)
    expect(requestConfig(manualEvents)).toEqual(MANUAL_ROUTE)
    const latestMode = sessionEvents.findLast(event => eventType(event) === 'dsh-auto-mode/mode')
    expect(latestMode === undefined ? undefined : (eventData(latestMode) as AutoModeData).active).toBe(false)
    expect(tripwire.pageErrors).toEqual([])
  }, 120_000)
})
