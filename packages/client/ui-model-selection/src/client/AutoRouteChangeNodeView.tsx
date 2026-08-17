import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import css from './AutoRouteChangeNodeView.module.css'

type AutoRouteChangeNodeViewProps = PropsRuntime<'conversation.chat.node', 'auto-route-change'> & PropsLocale<'model'>

/** Render one exact, persisted Auto route transition in the chat timeline. */
export function AutoRouteChangeNodeView({ node, t }: AutoRouteChangeNodeViewProps) {
  const data = (node as ChatNode<'auto-route-change'>).data
  const modelChanged = data.previous.model !== data.current.model
  const effortChanged = data.previous.reasoningEffort !== data.current.reasoningEffort
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
        <span>
          {effortChanged
            ? <>{t('chat.autoRouteEffortChanged', { previous: data.previous.reasoningEffort })}<span className={css.changedValue}>{data.current.reasoningEffort}</span></>
            : t('chat.autoRouteEffortStable', { current: data.current.reasoningEffort })}
        </span>
        <span>{t('chat.autoRouteReason', { tier: data.tier, code: data.reasonCode })}</span>
        <span className={css.reason}>{data.reason}</span>
      </div>
    </section>
  )
}
