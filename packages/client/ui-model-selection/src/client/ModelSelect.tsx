/**
 * ModelSelect: the composer's named model seat (`conversation.input.model`).
 * Two-level selection per figma 496:26454's MenuDropdown: the root menu is
 * the Model / Effort row pair (label + current value + a right chevron),
 * each drilling into its own list — the provider-grouped model list over
 * the shared directory, and the effort levels. The trigger (313:14108's
 * ToggleButton) shows both: model name + effort in the caption tone.
 * Data and submission ride the SAME per-session ModelDirectory as the
 * /model popup; exact-model reasoning metadata and the selected effort come
 * from the Host rather than a client-owned vocabulary. A rejected selection
 * announces through the shared transient Toast anchored to the composer
 * card; the in-menu strip with Retry remains the catalog-load surface.
 */
import {
  useEffect, useId, useMemo, useRef, useState, useSyncExternalStore,
  type KeyboardEvent, type FocusEvent,
} from 'react'
import clsx from 'clsx'
import type { ModelReasoningEffort, ModelSelection } from '@deepseek-ai/dsh-api-remotes/client'
import {
  IconCheckOutline16, IconChevronDownOutline14, IconChevronRightOutline14,
  IconWarningOutline16, Toast,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ModelSelectInjected } from './slots.ts'
import css from './ModelSelect.module.css'

/** Full model-seat props: runtime owner/projection shares, injected verbs, and locale. */
export type ModelSelectProps = PropsRuntime<'conversation.input.model'>
  & InjectFace<ModelSelectInjected>
  & PropsLocale<'model'>

/** Which pane the dropdown shows: the two-row root or one drilled-in list. */
type Pane = 'root' | 'model' | 'effort'

/** One dynamic effort row; undefined means preserve the provider default. */
interface EffortChoice {
  key: string
  effort: string | undefined
  label: string
  description?: string
}

/** An Auto route before its current projection replaced it. */
interface AutoRoute {
  provider: string
  model: string
  reasoningEffort: string
}

/** Render the current route value, rolling from the preceding value when it changed. */
function RouteValueRoll({ current, previous }: { current: string; previous: string | undefined }) {
  if (previous === undefined || previous === current) return current
  return (
    <span className={css.routeRoller}>
      <span className={css.routeRollTrack} aria-hidden="true">
        <span>{previous}</span>
        <span className={css.routeRollTarget}>{current}</span>
      </span>
      <span className={css.srOnly}>{current}</span>
    </span>
  )
}

/**
 * Render the composer model seat.
 * @param props - owner share (locked) + injected face (shared directory
 * store/verbs) + the standard locale seat.
 * @returns the trigger and, while open, the two-level menu.
 */
export function ModelSelect(
  { locked, available, directory, load, select, setAuto, useProjection, t }: ModelSelectProps,
) {
  const auto = useProjection('dshAutoMode')
  const state = useSyncExternalStore(
    fn => directory.subscribe(fn),
    () => directory.getSnapshot(),
  )
  const [open, setOpen] = useState(false)
  const [pane, setPane] = useState<Pane>('root')
  // The in-menu error strip serves catalog loads (its Retry re-runs the
  // load); a rejected SELECTION announces through the transient toast
  // instead, so the strip renders only while the latest failure-capable
  // action was a load.
  const lastActionRef = useRef<'load' | 'select'>('load')
  const [toast, setToast] = useState<{ seq: number; text: string } | null>(null)
  const toastSeq = useRef(0)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const id = useId()

  const choices = useMemo(() => state.groups.flatMap(group =>
    group.models.map(model => ({
      group,
      model,
      selection: {
        provider: group.id,
        model: model.id,
        ...model.reasoning?.defaultEffort === undefined
          ? {}
          : { reasoningEffort: model.reasoning.defaultEffort },
      } satisfies ModelSelection,
    }))), [state.groups])
  const effectiveSelection: ModelSelection | null = auto?.active && auto.decision !== null
    ? {
      provider: auto.decision.provider,
      model: auto.decision.model,
      reasoningEffort: auto.decision.reasoningEffort,
    }
    : state.current
  const selectedIndex = effectiveSelection === null
    ? -1
    : choices.findIndex(c => c.selection.provider === effectiveSelection.provider && c.selection.model === effectiveSelection.model)
  const currentChoice = choices[selectedIndex]
  const reasoning = currentChoice?.model.reasoning
  const effectiveEffort = effectiveSelection?.reasoningEffort ?? reasoning?.defaultEffort
  const effortLabel = reasoning === undefined
    ? auto?.active ? effectiveEffort : undefined
    : effectiveEffort === undefined
      ? t('effort.providerDefault')
      : reasoning.efforts.find(level => level.id === effectiveEffort)?.name ?? effectiveEffort
  const effortChoices = useMemo<readonly EffortChoice[]>(() => reasoning === undefined
    ? []
    : [
      ...reasoning.defaultEffort === undefined
        ? [{ key: 'provider-default', effort: undefined, label: t('effort.providerDefault') }]
        : [],
      ...reasoning.efforts.map((effort: ModelReasoningEffort) => ({
        key: `effort:${effort.id}`,
        effort: effort.id,
        label: effort.name,
        ...effort.description === undefined ? {} : { description: effort.description },
      })),
    ], [reasoning, t])
  const [autoBusy, setAutoBusy] = useState(false)
  const busy = state.status === 'selecting' || autoBusy
  const autoRoute = useMemo<AutoRoute | null>(() => auto?.active && auto.decision !== null
    ? {
      provider: auto.decision.provider,
      model: auto.decision.model,
      reasoningEffort: auto.decision.reasoningEffort,
    }
    : null, [
    auto?.active,
    auto?.decision?.provider,
    auto?.decision?.model,
    auto?.decision?.reasoningEffort,
  ])
  const projectedPreviousAutoRoute = auto?.active && auto.previousDecision !== null && auto.previousDecision !== undefined
    ? {
      provider: auto.previousDecision.provider,
      model: auto.previousDecision.model,
      reasoningEffort: auto.previousDecision.reasoningEffort,
    }
    : null
  const autoRouteChanged = autoRoute !== null && projectedPreviousAutoRoute !== null
    && (autoRoute.model !== projectedPreviousAutoRoute.model
      || autoRoute.reasoningEffort !== projectedPreviousAutoRoute.reasoningEffort)
  const autoRouteSwitched = autoRouteChanged
  const previousAutoRoute = autoRouteSwitched ? projectedPreviousAutoRoute : null

  const reload = (): void => {
    lastActionRef.current = 'load'
    load()
  }

  // Mount-time load resolves the trigger label; every open refreshes.
  useEffect(() => {
    if (available) {
      lastActionRef.current = 'load'
      load()
    }
  }, [available, load])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => { document.removeEventListener('mousedown', closeOutside) }
  }, [open])

  if (!available) return null

  const show = (): void => {
    setPane('root')
    setOpen(true)
    reload()
  }

  const close = (restoreFocus = false): void => {
    setOpen(false)
    setPane('root')
    if (restoreFocus) queueMicrotask(() => { triggerRef.current?.focus() })
  }

  const moveFocus = (offset: number): void => {
    const items = itemRefs.current.filter(item => item !== null)
    if (items.length === 0) return
    const active = items.findIndex(item => item === document.activeElement)
    const next = (Math.max(active, 0) + offset + items.length) % items.length
    items[next]?.focus()
  }

  const onRootKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      // Escape backs out of a drilled pane first, then closes.
      if (pane !== 'root') setPane('root')
      else close(true)
      return
    }
    if (!open) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveFocus(event.key === 'ArrowDown' ? 1 : -1)
    }
  }

  const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
    if (event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget)) return
    close()
  }

  const settleSelection = (accepted: boolean): void => {
    if (accepted) {
      if (rootRef.current !== null) close(true)
      return
    }
    const message = directory.getSnapshot().error
    if (message !== null) {
      toastSeq.current += 1
      setToast({ seq: toastSeq.current, text: t('error.action', { message }) })
    }
  }

  const autoFailure = (message: string): void => {
    toastSeq.current += 1
    setToast({ seq: toastSeq.current, text: t('error.auto', { message }) })
  }

  const changeAuto = (active: boolean, after?: () => Promise<boolean>): void => {
    setAutoBusy(true)
    void setAuto(active).then(async (failure) => {
      if (failure !== null) {
        autoFailure(failure)
        return false
      }
      return after === undefined ? true : after()
    }).then((accepted) => {
      if (after === undefined) {
        if (accepted) close(true)
        return
      }
      settleSelection(accepted)
    }, (reason: unknown) => {
      autoFailure(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => { setAutoBusy(false) })
  }

  const choose = (selection: ModelSelection): void => {
    if (!auto?.active && state.current?.provider === selection.provider && state.current.model === selection.model) {
      close(true)
      return
    }
    lastActionRef.current = 'select'
    if (auto?.active) {
      changeAuto(false, () => select(selection))
    } else {
      void select(selection).then(settleSelection)
    }
  }

  const chooseEffort = (effort: string | undefined): void => {
    if (effectiveSelection === null) return
    if (!auto?.active && effectiveEffort === effort) {
      close(true)
      return
    }
    const selection: ModelSelection = {
      provider: effectiveSelection.provider,
      model: effectiveSelection.model,
      ...effort === undefined ? {} : { reasoningEffort: effort },
    }
    lastActionRef.current = 'select'
    if (auto?.active) {
      changeAuto(false, () => select(selection))
    } else {
      void select(selection).then(settleSelection)
    }
  }

  const modelLabel = currentChoice?.model.name
    ?? (auto?.active && auto.decision !== null ? auto.decision.model : t('trigger.fallback'))
  const previousChoice = previousAutoRoute === null
    ? undefined
    : choices.find(choice => choice.selection.provider === previousAutoRoute.provider && choice.selection.model === previousAutoRoute.model)
  const previousModelLabel = previousAutoRoute === null
    ? undefined
    : previousChoice?.model.name ?? previousAutoRoute.model
  const previousEffort = previousAutoRoute === null
    ? undefined
    : previousAutoRoute.reasoningEffort
  const previousEffortLabel = previousAutoRoute === null
    ? undefined
    : previousChoice?.model.reasoning?.efforts.find(level => level.id === previousEffort)?.name ?? previousEffort
  const autoPrefix = auto?.active ? `${t('menu.auto')} · ` : ''
  const triggerLabel = effortLabel === undefined ? `${autoPrefix}${modelLabel}` : `${autoPrefix}${modelLabel} · ${effortLabel}`
  const triggerAria = auto?.active && auto.decision !== null && effortLabel !== undefined
    ? t('trigger.autoAria', { model: modelLabel, effort: effortLabel })
    : currentChoice === undefined
      ? t('trigger.selectAria')
      : effortLabel === undefined
        ? t('trigger.aria', { model: modelLabel })
        : t('trigger.ariaEffort', { model: modelLabel, effort: effortLabel })
  itemRefs.current = []
  let itemIndex = 0
  const itemRef = () => {
    const at = itemIndex++
    return (node: HTMLButtonElement | null) => { itemRefs.current[at] = node }
  }

  return (
    <div ref={rootRef} className={css.root} onKeyDown={onRootKeyDown} onBlur={onBlur}>
      <button
        ref={triggerRef}
        type="button"
        className={clsx(css.trigger, autoRouteSwitched && css.triggerChanged)}
        aria-label={triggerAria}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        title={triggerLabel}
        disabled={locked}
        onClick={() => {
          if (open) {
            close()
          } else {
            show()
          }
        }}
      >
        {auto?.active && (
          <span className={clsx(css.autoTrigger, autoRouteSwitched && css.autoTriggerChanged)}>
            {t('menu.auto')}
          </span>
        )}
        <span className={css.triggerLabel}><RouteValueRoll current={modelLabel} previous={previousModelLabel} /></span>
        {effortLabel !== undefined && (
          <span className={css.triggerEffort}><RouteValueRoll current={effortLabel} previous={previousEffortLabel} /></span>
        )}
        <IconChevronDownOutline14 className={clsx(css.chevron, open && css.chevronOpen)} />
      </button>

      {open && (
        <div
          id={`${id}-menu`}
          className={css.menu}
          role="menu"
          aria-label={t('menu.aria')}
          aria-busy={state.status === 'loading' || busy}
        >
          {pane === 'root' && (
            <>
              {auto !== undefined && (
                <>
                  <button
                    ref={itemRef()}
                    type="button"
                    role="menuitemradio"
                    aria-checked={auto.active}
                    className={clsx(css.autoOption, auto.active && css.selected)}
                    disabled={busy}
                    onClick={() => {
                      if (auto.active) close(true)
                      else changeAuto(true)
                    }}
                  >
                    <span className={css.optionCopy}>
                      <span className={css.modelName}>{t('menu.auto')}</span>
                      <span className={css.description}>{t('menu.autoDescription')}</span>
                    </span>
                    <span className={css.check}>{auto.active ? <IconCheckOutline16 /> : null}</span>
                  </button>
                  {auto.active && (
                    <div className={css.autoDetails} role="status">
                      {auto.decision !== null && (
                        <>
                          <span className={clsx(css.autoRoute, autoRouteSwitched && css.autoRouteChanged)}>
                            <span className={css.autoRouteLabel}>{t('menu.autoEffective')}</span>
                            <span
                              className={css.autoRouteValue}
                              title={`${auto.decision.provider} / ${auto.decision.model} / ${auto.decision.reasoningEffort}`}
                            >
                              <RouteValueRoll current={modelLabel} previous={previousModelLabel} /> · <RouteValueRoll
                                current={effortLabel ?? auto.decision.reasoningEffort}
                                previous={previousEffortLabel}
                              />
                            </span>
                            {autoRouteSwitched && (
                              <span className={css.autoSwitchNotice}>{t('menu.autoSwitched')}</span>
                            )}
                          </span>
                          <span className={css.autoDecision}>{auto.decision.tier} · {auto.decision.reasonCode}</span>
                          <span>{auto.decision.reason}</span>
                        </>
                      )}
                      <span className={css.autoEvidence}>{t('menu.autoEvidence')}</span>
                    </div>
                  )}
                  <div className={css.divider} />
                </>
              )}
              <button ref={itemRef()} type="button" role="menuitem" className={css.cell} onClick={() => { setPane('model') }}>
                <span className={css.cellLabel}>{t('menu.model')}</span>
                <span className={css.cellValue}>{modelLabel}</span>
                <IconChevronRightOutline14 className={css.cellChevron} />
              </button>
              {reasoning !== undefined && (
                <button ref={itemRef()} type="button" role="menuitem" className={css.cell} onClick={() => { setPane('effort') }}>
                  <span className={css.cellLabel}>{t('menu.effort')}</span>
                  <span className={css.cellValue}>{effortLabel}</span>
                  <IconChevronRightOutline14 className={css.cellChevron} />
                </button>
              )}
            </>
          )}

          {pane === 'model' && (
            <>
              {state.status === 'loading' && (
                <div className={css.status}>{t('status.loading')}</div>
              )}
              {state.error !== null && lastActionRef.current === 'load' && (
                <div className={css.error}>
                  <span>{t('error.action', { message: state.error })}</span>
                  <button type="button" className={css.retry} onClick={reload}>{t('retry')}</button>
                </div>
              )}
              {state.failures.map(failure => (
                <div className={css.warning} key={failure.id}>
                  <span>{t('warning.groupLoad', { name: failure.name, message: failure.message })}</span>
                  <button type="button" className={css.retry} onClick={reload}>{t('retry')}</button>
                </div>
              ))}
              <div className={clsx(css.groups, 'scrollable')}>
                {state.groups.map((group) => {
                  const headingId = `${id}-${group.id}`
                  return (
                    <section role="group" aria-labelledby={headingId} className={css.group} key={group.id}>
                      <div className={css.groupTitle} id={headingId}>{group.name}</div>
                      {group.models.map((model) => {
                        const selected = state.current?.provider === group.id && state.current.model === model.id
                        return (
                          <button
                            ref={itemRef()}
                            type="button"
                            role="menuitemradio"
                            aria-checked={selected}
                            className={clsx(css.option, selected && css.selected)}
                            key={model.id}
                            title={model.name}
                            disabled={busy}
                            onClick={() => { choose({ provider: group.id, model: model.id }) }}
                          >
                            <span className={css.optionCopy}>
                              <span className={css.modelName}>{model.name}</span>
                              {model.description !== undefined && (
                                <span className={css.description}>{model.description}</span>
                              )}
                            </span>
                            <span className={css.check}>
                              {selected ? <IconCheckOutline16 /> : null}
                            </span>
                          </button>
                        )
                      })}
                    </section>
                  )
                })}
              </div>
              {state.status === 'ready' && choices.length === 0 && (
                <div className={css.empty}>{t('empty.models')}</div>
              )}
            </>
          )}

          {pane === 'effort' && (
            <>
              {state.error !== null && lastActionRef.current === 'load' && (
                <div className={css.error}>
                  <span>{t('error.action', { message: state.error })}</span>
                  <button type="button" className={css.retry} onClick={reload}>{t('action.reload')}</button>
                </div>
              )}
              {effortChoices.length === 0
                ? <div className={css.empty}>{t('empty.efforts')}</div>
                : effortChoices.map(level => (
                  <button
                    ref={itemRef()}
                    type="button"
                    role="menuitemradio"
                    aria-checked={effectiveEffort === level.effort}
                    className={clsx(css.option, effectiveEffort === level.effort && css.selected)}
                    key={level.key}
                    disabled={busy}
                    onClick={() => { chooseEffort(level.effort) }}
                  >
                    <span className={css.optionCopy}>
                      <span className={css.modelName}>{level.label}</span>
                      {level.description !== undefined && (
                        <span className={css.description}>{level.description}</span>
                      )}
                    </span>
                    <span className={css.check}>
                      {effectiveEffort === level.effort ? <IconCheckOutline16 /> : null}
                    </span>
                  </button>
                ))}
            </>
          )}
        </div>
      )}
      {toast !== null && (
        <Toast
          key={toast.seq}
          text={toast.text}
          icon={<IconWarningOutline16 />}
          anchor={rootRef.current?.closest<HTMLElement>('[data-composer-card]') ?? null}
          onDone={() => { setToast(null) }}
        />
      )}
    </div>
  )
}
