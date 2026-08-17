import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-runtime/client'

/** One exact Auto route emitted by the Phase 0P host plugin. */
interface AutoRoute {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort: string
}

/** Durable selection facts emitted by the external Phase 0P host plugin. */
interface AutoRouteDecision {
  readonly current: AutoRoute
  readonly tier: 'fast' | 'standard' | 'strong' | 'fallback'
  readonly reasonCode: string
  readonly reason: string
}

/** Durable decision facts shown when Auto changes its effective route. */
export interface AutoRouteChangeNode extends AutoRouteDecision {
  readonly previous: AutoRoute
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ChatNodeDataMap {
    /** A persisted Phase 0P Auto route transition. */
    'auto-route-change': AutoRouteChangeNode
  }
}

interface AutoRouteChangeState extends AutoRouteChangeNode {
  readonly seq: number
  readonly time: number
}

const SELECTION_EVENT = 'dsh-auto-mode/selection'

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

/**
 * Read the externally owned selection event without assigning it a DSH core
 * Session type. The host namespace parser remains the durable authority.
 */
function selection(event: SessionEvent): AutoRouteDecision | undefined {
  const wire = event as unknown as { readonly type?: unknown; readonly data?: unknown }
  if (wire.type !== SELECTION_EVENT) return undefined
  const data = record(wire.data)
  if (data === undefined
    || typeof data.provider !== 'string'
    || typeof data.model !== 'string'
    || typeof data.reasoningEffort !== 'string'
    || !['fast', 'standard', 'strong', 'fallback'].includes(data.tier as string)
    || typeof data.reasonCode !== 'string'
    || typeof data.reason !== 'string') return undefined
  return {
    current: {
      provider: data.provider,
      model: data.model,
      reasoningEffort: data.reasoningEffort,
    },
    tier: data.tier as AutoRouteChangeNode['tier'],
    reasonCode: data.reasonCode,
    reason: data.reason,
  }
}

/** Build one transcript notice only when a later Auto selection changes model or effort. */
export const autoRouteChangeDefinition: ConversationNodeDefinition<AutoRouteChangeState> = {
  kind: 'auto-route-change',
  target: 'chat',
  match: event => selection(event) === undefined ? null : { id: String(event.seq), role: 'start' },
  start: (_context, match, reader) => {
    const current = selection(match.event)
    if (current === undefined) throw new Error('auto-route-change start requires a valid dsh-auto-mode selection')
    const previous = reader.previous<AutoRouteChangeState>('auto-route-change')?.state.current
    return {
      ...current,
      previous: previous ?? current.current,
      seq: match.event.seq,
      time: match.event.time,
    }
  },
  update: context => context.state,
  buildViewNode: (context) => {
    const state = context.state
    if (state === undefined
      || (state.previous.model === state.current.model
        && state.previous.reasoningEffort === state.current.reasoningEffort)) return null
    return {
      key: context.key,
      kind: 'auto-route-change',
      id: context.id,
      target: 'chat',
      anchorSeq: state.seq,
      location: context.start?.location ?? { kind: 'unresolved' },
      visibility: 'visible',
      data: {
        previous: state.previous,
        current: state.current,
        tier: state.tier,
        reasonCode: state.reasonCode,
        reason: state.reason,
      },
    }
  },
}
