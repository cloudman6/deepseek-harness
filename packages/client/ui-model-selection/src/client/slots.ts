/**
 * ModelSelect's injected face. The target 'conversation.input.model' seat is
 * declared (children table) and typed by ui-conversation's composer-bar
 * entry; this package only contributes the single occupant, so no SlotMap
 * merge lives here.
 */
import type { ModelSelection } from '@deepseek-ai/dsh-api-remotes/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { ModelDirectoryState } from './directory.ts'

/** Injected business face of the composer model seat. */
export interface ModelSelectInjected {
  /** Whether this session supports Agent-bound model inspection and selection. */
  available: boolean
  /** The session's shared directory store (same instance the /model popup reads). */
  directory: SnapshotStore<ModelDirectoryState>
  /** Refresh the advisory directory (fire-and-forget; errors land on the store). */
  load: () => void
  /**
   * Select a complete provider/model/reasoning selection.
   * @param selection - model selection and optional adapter-owned effort.
   * @returns whether the host accepted the selection.
   */
  select: (selection: ModelSelection) => Promise<boolean>
  /** Enable or disable the optional experimental Auto capability for this session. */
  setAuto: (active: boolean) => Promise<string | null>
}

/** One route decision published by the experimental Auto host plugin. */
export interface DshAutoModeDecision {
  turn: number
  step: number
  tier: 'fast' | 'standard' | 'strong' | 'fallback'
  provider: string
  model: string
  reasoningEffort: string
  reasonCode: string
  reason: string
}

/** Optional projection: absence means the experimental Auto plugin is not composed. */
export interface DshAutoModeProjection {
  active: boolean
  evidenceStatus: 'experimental-unadmitted'
  decision: DshAutoModeDecision | null
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Maintainer-only Phase 0P Auto state and its latest effective decision. */
    dshAutoMode: DshAutoModeProjection
  }
}
