// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ComponentProps } from 'react'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { AutoRouteChangeNodeView } from '../src/client/AutoRouteChangeNodeView.tsx'
import { zh } from '../src/client/locales.ts'
import css from '../src/client/AutoRouteChangeNodeView.module.css'

const t: ComponentProps<typeof AutoRouteChangeNodeView>['t'] = (key, params) => {
  const template = (zh as Record<string, string>)[key] ?? key
  return params === undefined
    ? template
    : template.replace(/\{(\w+)\}/g, (match, name: string) => name in params ? String(params[name]) : match)
}

function node(
  previous: { model: string; reasoningEffort?: string; handlingLevel?: 'light' | 'standard' | 'deep' },
  current: { model: string; reasoningEffort?: string; handlingLevel?: 'light' | 'standard' | 'deep' },
) {
  return {
    data: {
      previous: { provider: 'deepseek-official', handlingLevel: 'light', routeBasis: 'aa-matched', ...previous },
      current: { provider: 'deepseek-official', handlingLevel: 'light', routeBasis: 'aa-matched', ...current },
      reasonCode: 'bounded-simple-task',
      reason: 'Matched a bounded low-complexity task signal.',
    },
  } as ChatNode<'auto-route-change'>
}

function renderRouteChange(
  previous: { model: string; reasoningEffort?: string; handlingLevel?: 'light' | 'standard' | 'deep' },
  current: { model: string; reasoningEffort?: string; handlingLevel?: 'light' | 'standard' | 'deep' },
) {
  return render(<AutoRouteChangeNodeView {...({ node: node(previous, current), t } as ComponentProps<typeof AutoRouteChangeNodeView>)} />)
}

afterEach(cleanup)

describe('Auto route-change chat view', () => {
  it('keeps an unchanged model stable and highlights only the changed effort', () => {
    const view = renderRouteChange(
      { model: 'deepseek-v4-flash', reasoningEffort: 'max' },
      { model: 'deepseek-v4-flash', reasoningEffort: 'off' },
    )

    expect(screen.getByText('模型：deepseek-v4-flash', { exact: true })).toBeTruthy()
    expect(screen.getByText('推理等级：max →', { exact: true })).toBeTruthy()
    expect(view.container.querySelector(`.${css.changedValue}`)?.textContent).toBe('off')
    expect(view.container.textContent).not.toContain('deepseek-v4-flash →')
  })

  it('keeps an unchanged effort stable and highlights only the changed model', () => {
    const view = renderRouteChange(
      { model: 'deepseek-v4-flash', reasoningEffort: 'off' },
      { model: 'deepseek-v4-pro', reasoningEffort: 'off' },
    )

    expect(screen.getByText('模型：deepseek-v4-flash →', { exact: true })).toBeTruthy()
    expect(screen.getByText('推理等级：off', { exact: true })).toBeTruthy()
    expect(view.container.querySelector(`.${css.changedValue}`)?.textContent).toBe('deepseek-v4-pro')
    expect(view.container.textContent).not.toContain('off →')
  })

  it('shows a localized level-only change and its AA basis', () => {
    const view = renderRouteChange(
      { model: 'deepseek-v4-flash', reasoningEffort: 'high', handlingLevel: 'standard' },
      { model: 'deepseek-v4-flash', reasoningEffort: 'high', handlingLevel: 'deep' },
    )

    expect(screen.getByText('任务处理级别：常规 →', { exact: true })).toBeTruthy()
    expect(view.container.querySelector(`.${css.changedValue}`)?.textContent).toBe('深度')
    expect(screen.getByText(/依据：AA 数据.*bounded-simple-task/i)).toBeTruthy()
  })

  it('omits reasoning effort when the route has no effort dimension', () => {
    renderRouteChange(
      { model: 'model-a' },
      { model: 'model-b' },
    )

    expect(screen.queryByText(/推理等级：/)).toBeNull()
  })
})
