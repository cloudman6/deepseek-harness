import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './AutoRouteChangeNodeView.module.css'

type AutoRouteChangeNodeViewProps = PropsRuntime<'conversation.chat.node', 'auto-route-change'> & PropsLocale<'model'>

function levelLabel(level: 'light' | 'standard' | 'deep', t: AutoRouteChangeNodeViewProps['t']): string {
  if (level === 'light') return t('level.light')
  if (level === 'standard') return t('level.standard')
  return t('level.deep')
}

function basisLabel(
  basis: 'aa-matched' | 'configured-deep-fallback',
  t: AutoRouteChangeNodeViewProps['t'],
): string {
  return basis === 'aa-matched' ? t('basis.aaMatched') : t('basis.configuredDeepFallback')
}

/** Render one exact, persisted Auto route transition in the chat timeline. */
export function AutoRouteChangeNodeView({ node, t }: AutoRouteChangeNodeViewProps) {
  const { data } = node
  const modelChanged = data.previous.model !== data.current.model
  const effortChanged = data.previous.reasoningEffort !== data.current.reasoningEffort
  const levelChanged = data.previous.handlingLevel !== data.current.handlingLevel
  const previousLevel = levelLabel(data.previous.handlingLevel, t)
  const currentLevel = levelLabel(data.current.handlingLevel, t)
  const previousEffort = data.previous.reasoningEffort ?? t('effort.providerDefault')
  const currentEffort = data.current.reasoningEffort ?? t('effort.providerDefault')
  return (
    <section className={css.row} role="status" aria-label={t('chat.autoRouteChanged')}>
      <span className={css.dot} aria-hidden="true" />
      <div className={css.copy}>
        <span className={css.title}>{t('chat.autoRouteChanged')}</span>
        <span>
          {modelChanged
            ? <>{t('chat.autoRouteModelChanged', { previous: data.previous.model })}<span className={css.changedValue}>{data.current.model}</span></>
            : t('chat.autoRouteModelStable', { current: data.current.model })}
        </span>
        {(data.previous.reasoningEffort !== undefined || data.current.reasoningEffort !== undefined) && (
          <span>
            {effortChanged
              ? <>{t('chat.autoRouteEffortChanged', { previous: previousEffort })}<span className={css.changedValue}>{currentEffort}</span></>
              : t('chat.autoRouteEffortStable', { current: currentEffort })}
          </span>
        )}
        <span>
          {levelChanged
            ? <>{t('chat.autoRouteLevelChanged', { previous: previousLevel })}<span className={css.changedValue}>{currentLevel}</span></>
            : t('chat.autoRouteLevelStable', { current: currentLevel })}
        </span>
        <span>{t('chat.autoRouteReason', {
          basis: basisLabel(data.current.routeBasis, t),
          code: data.reasonCode,
        })}</span>
        <span className={css.reason}>{data.reason}</span>
      </div>
    </section>
  )
}
