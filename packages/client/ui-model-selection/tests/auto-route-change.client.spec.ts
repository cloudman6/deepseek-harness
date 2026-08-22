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
  it('anchors a route notice at its durable selection event', () => {
    const event = {
      type: 'dsh-auto-mode/selection',
      seq: 24,
      time: 1_700_000_000_000,
      data: {
        schemaVersion: 2,
        ...current,
        requestedHandlingLevel: 'deep',
        handlingLevel: 'deep',
        routeBasis: 'aa-matched',
        fallback: false,
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
        if (kind === 'auto-route-change') {
          return predecessor({
            current: {
              provider: 'deepseek-official',
              model: 'deepseek-v4-pro',
              reasoningEffort: 'max',
              handlingLevel: 'standard',
              routeBasis: 'aa-matched',
            },
          })
        }
        return undefined
      },
    } as unknown as ConversationContextReader
    if (autoRouteChangeDefinition.start === undefined) throw new Error('Auto route-change definition must have a start function')
    const state = autoRouteChangeDefinition.start(
      {} as never,
      match,
      reader,
    )
    if (autoRouteChangeDefinition.buildViewNode === undefined) throw new Error('Auto route-change definition must build a chat node')
    const node = autoRouteChangeDefinition.buildViewNode({
      key: 'auto-route-change:24',
      kind: 'auto-route-change',
      id: '24',
      matches: [match],
      start: match,
      state,
      current: new Map(),
    }) as ChatConversationViewNode

    expect(node.anchorSeq).toBe(24)
  })

  it('keeps a notice when only the task-handling level changes', () => {
    const event = {
      type: 'dsh-auto-mode/selection',
      seq: 25,
      time: 1_700_000_000_001,
      data: {
        schemaVersion: 2,
        ...current,
        requestedHandlingLevel: 'deep',
        handlingLevel: 'deep',
        routeBasis: 'aa-matched',
        fallback: false,
        reasonCode: 'high-complexity-task',
        reason: 'Matched a high-complexity task signal.',
      },
    } as unknown as SessionEvent
    const match = { event, role: 'start', location: { kind: 'unresolved' } } as ConversationMatch
    const reader = {
      previous: () => ({
        state: {
          current: {
            ...current,
            handlingLevel: 'standard',
            routeBasis: 'aa-matched',
          },
        },
      }),
    } as unknown as ConversationContextReader
    const state = autoRouteChangeDefinition.start?.({} as never, match, reader)
    const node = autoRouteChangeDefinition.buildViewNode?.({
      key: 'auto-route-change:25',
      kind: 'auto-route-change',
      id: '25',
      matches: [match],
      start: match,
      state,
      current: new Map(),
    })

    expect(node).not.toBeNull()
  })
})
