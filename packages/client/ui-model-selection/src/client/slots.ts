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

/** Host-owned task-handling levels. They are independent of provider effort names. */
export type DshAutoModeHandlingLevel = 'light' | 'standard' | 'deep'

/** Evidence basis for the effective route. Fallback remains a Deep decision. */
export type DshAutoModeRouteBasis = 'aa-matched' | 'configured-deep-fallback'

/** One route decision published by the experimental Auto host plugin. */
export interface DshAutoModeDecision {
  turn: number
  step: number
  requestedHandlingLevel: DshAutoModeHandlingLevel
  handlingLevel: DshAutoModeHandlingLevel
  routeBasis: DshAutoModeRouteBasis
  fallback: boolean
  provider: string
  model: string
  reasoningEffort?: string
  aaSnapshotId?: string
  aaRecordId?: string
  reasonCode: string
  reason: string
}

/** Optional projection: absence means the experimental Auto plugin is not composed. */
export interface DshAutoModeProjection {
  active: boolean
  evidenceStatus: 'experimental-unadmitted'
  decision: DshAutoModeDecision | null
  /** The preceding selection for a live route transition; absent on the initial projection. */
  previousDecision?: DshAutoModeDecision | null
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Maintainer-only AA-informed Auto state and its latest effective decision. */
    dshAutoMode: DshAutoModeProjection
  }
}
