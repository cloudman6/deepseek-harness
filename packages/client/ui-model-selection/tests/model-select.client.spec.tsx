// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ModelSelection } from '@deepseek-ai/dsh-api-remotes/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { ComponentProps } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ModelDirectoryState } from '../src/client/directory.ts'
import { ModelSelect } from '../src/client/ModelSelect.tsx'
import type { DshAutoModeProjection } from '../src/client/slots.ts'
import { zh } from '../src/client/locales.ts'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import css from '../src/client/ModelSelect.module.css'

// The seat's key domain is model ∪ common; the stub mirrors the real lookup
// chain: package dictionary, then common vocabulary, then the key.
const t: ComponentProps<typeof ModelSelect>['t'] = (key, params) => {
  const template = (zh as Record<string, string>)[key]
    ?? (commonZh as Record<string, string>)[key]
    ?? key
  return params === undefined
    ? template
    : template.replace(/\{(\w+)\}/g, (match, name: string) => name in params ? String(params[name]) : match)
}

const reasoning = {
  efforts: [
    { id: 'off', name: 'Off' },
    { id: 'high', name: 'High' },
    { id: 'max', name: 'Max', description: 'Largest budget' },
  ],
  defaultEffort: 'high',
}

type ModelRuntime = Omit<PropsRuntime<'conversation.input.model'>, 'locked'>

const runtime = (useProjection: ComponentProps<typeof ModelSelect>['useProjection']): ModelRuntime => ({
  useProjection,
} as unknown as ModelRuntime)

function state(overrides: Partial<ModelDirectoryState> = {}): ModelDirectoryState {
  return {
    current: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
    routable: true,
    groups: [{
      id: 'deepseek-official',
      name: 'DeepSeek',
      models: [{ id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', reasoning }],
    }],
    failures: [],
    status: 'ready',
    error: null,
    ...overrides,
  }
}

afterEach(cleanup)

describe('ModelSelect reasoning effort', () => {
  it('renders adapter metadata and submits the effort as part of the session selection', async () => {
    const directory = createSnapshotStore<ModelDirectoryState>(state())
    const select = vi.fn(async (selection: ModelSelection) => {
      directory.set(state({ current: selection }))
      return true
    })
    render(<ModelSelect
      locked={false}
      available
      directory={directory}
      load={vi.fn()}
      select={select}
      setAuto={vi.fn().mockResolvedValue(null)}
      {...runtime(vi.fn(() => undefined))}
      t={t}
    />)

    const trigger = screen.getByRole('button', {
      name: '选择模型，当前 DeepSeek-V4-Flash，推理等级 High',
    })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: /推理等级/ }))
    expect(screen.getAllByRole('menuitemradio').map(item => item.textContent))
      .toEqual(['Off', 'High', 'MaxLargest budget'])

    fireEvent.click(screen.getByRole('menuitemradio', { name: /Max/ }))
    await waitFor(() => {
      expect(select).toHaveBeenCalledWith({
        provider: 'deepseek-official',
        model: 'deepseek-v4-flash',
        reasoningEffort: 'max',
      })
      expect(trigger.getAttribute('aria-label')).toBe('选择模型，当前 DeepSeek-V4-Flash，推理等级 Max')
    })
  })

  it('offers provider default only when the adapter does not configure a model default', () => {
    const directory = createSnapshotStore(state({
      groups: [{
        id: 'provider',
        name: 'Provider',
        models: [{
          id: 'model',
          name: 'Model',
          reasoning: { efforts: [{ id: 'standard', name: 'Standard' }] },
        }],
      }],
      current: { provider: 'provider', model: 'model' },
    }))
    render(<ModelSelect
      locked={false}
      available
      directory={directory}
      load={vi.fn()}
      select={vi.fn().mockResolvedValue(true)}
      setAuto={vi.fn().mockResolvedValue(null)}
      {...runtime(vi.fn(() => undefined))}
      t={t}
    />)

    fireEvent.click(screen.getByRole('button', {
      name: '选择模型，当前 Model，推理等级 Default',
    }))
    fireEvent.click(screen.getByRole('menuitem', { name: /推理等级/ }))
    expect(screen.getAllByRole('menuitemradio').map(item => item.textContent))
      .toEqual(['Default', 'Standard'])
  })

  it('prompts for a selection when the current model is no longer advertised', () => {
    const directory = createSnapshotStore(state({
      current: { provider: 'deepseek-official', model: 'removed-model' },
    }))
    const select = vi.fn().mockResolvedValue(true)
    render(<ModelSelect
      locked={false}
      available
      directory={directory}
      load={vi.fn()}
      select={select}
      setAuto={vi.fn().mockResolvedValue(null)}
      {...runtime(vi.fn(() => undefined))}
      t={t}
    />)

    const trigger = screen.getByRole('button', { name: '选择模型' })
    expect(trigger.textContent).toContain('选择模型')
    fireEvent.click(trigger)
    expect(screen.queryByRole('menuitem', { name: /推理等级/ })).toBeNull()
    fireEvent.click(screen.getByRole('menuitem', { name: /模型/ }))
    expect(screen.queryByText('removed-model')).toBeNull()
    expect(screen.getByRole('menuitemradio', { name: 'DeepSeek-V4-Flash' })).toBeTruthy()
  })

  it('announces a rejected selection as a transient toast and keeps the in-menu strip for loads', async () => {
    const groups = [{
      id: 'deepseek-official',
      name: 'DeepSeek',
      models: [
        { id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', reasoning },
        { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro' },
      ],
    }]
    const directory = createSnapshotStore<ModelDirectoryState>(state({ groups }))
    const select = vi.fn(async () => {
      directory.set(state({ groups, status: 'error', error: 'model-unavailable: session already contains images' }))
      return false
    })
    render(<ModelSelect
      locked={false}
      available
      directory={directory}
      load={vi.fn()}
      select={select}
      setAuto={vi.fn().mockResolvedValue(null)}
      {...runtime(vi.fn(() => undefined))}
      t={t}
    />)

    fireEvent.click(screen.getByRole('button', { name: /选择模型|当前/ }))
    fireEvent.click(screen.getByRole('menuitem', { name: /模型/ }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /DeepSeek-V4-Pro/ }))
    const toast = await screen.findByRole('alert')
    expect(toast.textContent).toContain('模型操作失败：model-unavailable: session already contains images')
    // The selection failure does not render the in-menu load strip (no Retry).
    expect(screen.queryByRole('button', { name: '重试' })).toBeNull()
  })

  it('renders no Agent-bound control for an addressed subagent session', () => {
    const load = vi.fn()
    render(<ModelSelect
      locked={false}
      available={false}
      directory={createSnapshotStore(state())}
      load={load}
      select={vi.fn().mockResolvedValue(false)}
      setAuto={vi.fn().mockResolvedValue(null)}
      {...runtime(vi.fn(() => undefined))}
      t={t}
    />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(load).not.toHaveBeenCalled()
  })

  it('shows Auto first with a check, updates its decision live, and exits Auto before manual selection', async () => {
    const directory = createSnapshotStore<ModelDirectoryState>(state({
      groups: [{
        id: 'deepseek-official',
        name: 'DeepSeek',
        models: [
          { id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', reasoning },
          { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro', reasoning },
        ],
      }],
    }))
    const setAuto = vi.fn().mockResolvedValue(null)
    const select = vi.fn().mockResolvedValue(true)
    let projection: DshAutoModeProjection = {
      active: true,
      evidenceStatus: 'experimental-unadmitted' as const,
      decision: {
        turn: 1,
        step: 0,
        tier: 'fast' as const,
        provider: 'deepseek-official',
        model: 'deepseek-v4-flash',
        reasoningEffort: 'off',
        reasonCode: 'bounded-simple-task',
        reason: 'Matched a bounded low-complexity task signal.',
      },
    }
    const useProjection = vi.fn(() => projection)
    const view = render(<ModelSelect
      locked={false}
      available
      directory={directory}
      load={vi.fn()}
      select={select}
      setAuto={setAuto}
      {...runtime(useProjection)}
      t={t}
    />)

    const trigger = screen.getByRole('button', { name: /Auto.*DeepSeek-V4-Flash.*Off/ })
    fireEvent.click(trigger)
    const autoItem = screen.getByRole('menuitemradio', { name: /Auto/ })
    expect(autoItem.getAttribute('aria-checked')).toBe('true')
    expect(screen.getAllByRole('menuitem')[0]?.textContent).toContain('模型')
    expect(screen.getByText('实际选择')).toBeTruthy()
    expect(screen.getByText('DeepSeek-V4-Flash · Off')).toBeTruthy()
    expect(screen.getByText(/fast.*bounded-simple-task/i)).toBeTruthy()
    expect(screen.queryByText('已切换模型与推理等级')).toBeNull()

    projection = {
      ...projection,
      previousDecision: projection.decision,
      decision: {
        turn: 1,
        step: 1,
        tier: 'strong',
        provider: 'deepseek-official',
        model: 'deepseek-v4-pro',
        reasoningEffort: 'max',
        reasonCode: 'high-complexity-task',
        reason: 'Matched a high-complexity or high-consequence task signal.',
      },
    }
    view.rerender(<ModelSelect
      locked={false}
      available
      directory={directory}
      load={vi.fn()}
      select={select}
      setAuto={setAuto}
      {...runtime(useProjection)}
      t={t}
    />)
    expect(trigger.getAttribute('aria-label')).toMatch(/Auto.*DeepSeek-V4-Pro.*Max/)
    expect(screen.getAllByText('DeepSeek-V4-Pro')).not.toHaveLength(0)
    expect(screen.getAllByText('Max')).not.toHaveLength(0)
    expect(screen.getByText(/strong.*high-complexity-task/i)).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText('已切换模型与推理等级')).toBeTruthy()
      const rollingValues = [...view.container.querySelectorAll(`.${css.routeRollTrack}`)]
        .map(element => element.textContent)
      expect(rollingValues).toContain('DeepSeek-V4-FlashDeepSeek-V4-Pro')
      expect(rollingValues).toContain('OffMax')
      expect(view.container.querySelectorAll(`.${css.routeRollTarget}`)).toHaveLength(4)
      expect(view.container.querySelectorAll(`.${css.autoTriggerChanged}`)).toHaveLength(1)
    })

    fireEvent.click(screen.getByRole('menuitem', { name: /模型/ }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'DeepSeek-V4-Flash' }))
    await waitFor(() => {
      expect(setAuto).toHaveBeenCalledWith(false)
      expect(select).toHaveBeenCalledWith({
        provider: 'deepseek-official',
        model: 'deepseek-v4-flash',
      })
      expect(setAuto.mock.invocationCallOrder[0]).toBeLessThan(select.mock.invocationCallOrder[0]!)
    })
  })

  it('shows the exact Auto model and effort even when the advisory catalog has no matching row', () => {
    const projection: DshAutoModeProjection = {
      active: true,
      evidenceStatus: 'experimental-unadmitted',
      decision: {
        turn: 1,
        step: 0,
        tier: 'fallback',
        provider: 'maintainer-provider',
        model: 'maintainer-strong-model',
        reasoningEffort: 'max',
        reasonCode: 'missing-exact-route',
        reason: 'The selected tier was unavailable, so Auto used the configured fallback.',
      },
    }
    render(<ModelSelect
      locked={false}
      available
      directory={createSnapshotStore(state({ groups: [] }))}
      load={vi.fn()}
      select={vi.fn().mockResolvedValue(true)}
      setAuto={vi.fn().mockResolvedValue(null)}
      {...runtime(vi.fn(() => projection))}
      t={t}
    />)

    expect(screen.getByRole('button', {
      name: /Auto.*maintainer-strong-model.*max/i,
    })).toBeTruthy()
  })
})
