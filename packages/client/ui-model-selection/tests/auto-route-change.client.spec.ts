import { describe, expect, it } from 'vitest'
import type {
  ChatConversationViewNode, ConversationContextReader, ConversationMatch,
  ConversationPreviousContext,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import { autoRouteChangeDefinition } from '../src/client/auto-route-change.ts'

const current = {
  provider: 'deepseek-official',
  model: 'deepseek-v4-pro',
  reasoningEffort: 'high',
}

describe('Auto route-change chat node', () => {
  it('anchors a route notice immediately after the triggering user message', () => {
    const event = {
      type: 'dsh-auto-mode/selection',
      seq: 24,
      time: 1_700_000_000_000,
      data: {
        ...current,
        tier: 'strong',
        reasonCode: 'high-complexity-task',
        reason: 'Matched a high-complexity task signal.',
      },
    } as unknown as SessionEvent
    const match = {
      event,
      view: undefined,
      role: 'start',
      location: { kind: 'unresolved' },
    } as ConversationMatch
    const predecessor = <State>(state: State): ConversationPreviousContext<State> => ({
      key: 'previous',
      kind: 'previous',
      id: 'previous',
      startSeq: 1,
      state,
      matches: [],
    })
    const reader = {
      previous: (kind: string) => {
        if (kind === 'input-message') return predecessor({ kind: 'user' as const, seq: 17 })
        if (kind === 'auto-route-change') {
          return predecessor({
            current: {
              provider: 'deepseek-official',
              model: 'deepseek-v4-pro',
              reasoningEffort: 'max',
            },
          })
        }
        return undefined
      },
    } as unknown as ConversationContextReader
    const start = autoRouteChangeDefinition.start
    if (start === undefined) throw new Error('Auto route-change definition must have a start function')
    const state = start(
      {} as never,
      match,
      reader,
    )
    const buildViewNode = autoRouteChangeDefinition.buildViewNode
    if (buildViewNode === undefined) throw new Error('Auto route-change definition must build a chat node')
    const node = buildViewNode({
      key: 'auto-route-change:24',
      kind: 'auto-route-change',
      id: '24',
      matches: [match],
      start: match,
      state,
      current: new Map(),
    } as never) as ChatConversationViewNode

    expect(node.anchorSeq).toBe(17.05)
  })
})
