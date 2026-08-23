import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { RouteAdmissionRow, RouteAdmissionView } from '@deepseek-ai/dsh-api-remotes/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AutoModeLocaleKey } from './locales.ts'
import css from './AutoModeSettingsSection.module.css'

export interface AutoModeSettingsInjected {
  view: () => Promise<RouteAdmissionView>
  setMode: (mode: 'recommended' | 'custom') => Promise<RouteAdmissionView>
  setRoute: (evidenceRouteKeyId: string, enabled: boolean) => Promise<RouteAdmissionView>
}

export type AutoModeSettingsProps = PropsRuntime<'settings.section'>
  & PropsLocale<'settings.autoMode'>
  & InjectFace<AutoModeSettingsInjected>

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready' | 'saving' | 'saved' | 'save-error'; view: RouteAdmissionView }

const LEVELS = ['light', 'standard', 'deep'] as const

function metric(value: number | null | undefined, suffix = ''): string {
  return value === null || value === undefined ? '—' : `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })}${suffix}`
}

function rowName(row: RouteAdmissionRow): string {
  const route = [row.provider, row.model].filter(Boolean).join(' / ')
  return route || row.aaRecordLabel
}

function statusKey(row: RouteAdmissionRow): AutoModeLocaleKey {
  if (row.admissionStatus === 'enabled') return 'enabled'
  if (row.admissionStatus === 'disabled') return 'disabled'
  if (row.admissionStatus === 'excluded') return 'excluded'
  return 'unavailableTag'
}

function RouteCard({ row, custom, writable, pending, onToggle, t }: {
  row: RouteAdmissionRow
  custom: boolean
  writable: boolean
  pending: boolean
  onToggle: (row: RouteAdmissionRow, enabled: boolean) => void
  t: AutoModeSettingsProps['t']
}): ReactNode {
  const controllable = custom && row.evidenceStatus === 'valid' && row.hostStatus === 'callable'
  const checked = row.admissionStatus === 'enabled'
  const name = rowName(row)
  return (
    <li className={css.routeCard} data-route-key={row.evidenceRouteKeyId} data-admitted={checked ? 'true' : 'false'}>
      <div className={css.routeHead}>
        <div className={css.routeIdentity}>
          <strong>{name}</strong>
          <span>{row.aaRecordLabel}</span>
        </div>
        {controllable ? (
          <label className={css.switchLabel}>
            <span>{t(checked ? 'enabled' : 'disabled')}</span>
            <input
              type="checkbox"
              checked={checked}
              disabled={!writable || pending}
              aria-label={`${name}: ${t(checked ? 'enabled' : 'disabled')}`}
              onChange={(event) => { onToggle(row, event.currentTarget.checked) }}
            />
          </label>
        ) : <span className={css.tag} data-status={row.admissionStatus}>{t(statusKey(row))}</span>}
      </div>
      <div className={css.tags}>
        {row.recommended ? <span className={css.tag}>{t('recommendedTag')}</span> : null}
        {row.admittedWinner ? <span className={css.winner}>{t('winner')}</span> : null}
        <span className={css.tag}>{row.evidenceStatus}</span>
        <span className={css.tag}>{row.hostStatus}</span>
      </div>
      <dl className={css.metrics}>
        <div><dt>{t('capability')}</dt><dd>{metric(row.aaCapabilityScore)}</dd></div>
        <div><dt>{t('price')}</dt><dd>{metric(row.aaPrice)}</dd></div>
        <div><dt>{t('latency')}</dt><dd>{metric(row.aaLatencySeconds, 's')}</dd></div>
      </dl>
      <details className={css.details}>
        <summary>{t('showDetails')}</summary>
        <dl>
          <div><dt>{t('exactKey')}</dt><dd><code>{row.evidenceRouteKeyId}</code></dd></div>
          <div><dt>{t('record')}</dt><dd><code>{row.aaRecordId}</code></dd></div>
          <div><dt>{t('evidence')}</dt><dd>{row.evidenceStatus}</dd></div>
          <div><dt>{t('host')}</dt><dd>{row.hostStatus}</dd></div>
          <div><dt>{t('admission')}</dt><dd>{row.admissionStatus}</dd></div>
          {row.reasonCodes.length > 0 ? <div><dt>{t('reason')}</dt><dd>{row.reasonCodes.join(', ')}</dd></div> : null}
        </dl>
      </details>
    </li>
  )
}

export function AutoModeSettingsSection({ view, setMode, setRoute, t }: AutoModeSettingsProps): ReactNode {
  const [request, setRequest] = useState(0)
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let current = true
    void Promise.resolve().then(() => view()).then(
      (value) => { if (current) setState({ status: 'ready', view: value }) },
      () => { if (current) setState({ status: 'error' }) },
    )
    return () => { current = false }
  }, [request, view])

  const mutate = async (operation: () => Promise<RouteAdmissionView>): Promise<void> => {
    if (state.status === 'loading' || state.status === 'error') return
    setState({ status: 'saving', view: state.view })
    try {
      setState({ status: 'saved', view: await operation() })
    } catch (_failure) {
      try { setState({ status: 'save-error', view: await view() }) }
      catch (_refreshFailure) { setState({ status: 'error' }) }
    }
  }

  const projection = state.status === 'ready' || state.status === 'saving' || state.status === 'saved' || state.status === 'save-error'
    ? state.view.available ? state.view.projection : undefined
    : undefined
  const rows = projection?.rows ?? []
  const rowsByLevel = useMemo(() => Object.fromEntries([
    ...LEVELS.map(level => [level, rows.filter(row => row.handlingLevel === level)]),
    ['unassigned', rows.filter(row => row.handlingLevel === undefined)],
  ]) as Record<(typeof LEVELS)[number] | 'unassigned', RouteAdmissionRow[]>, [rows])

  if (state.status === 'loading') return <p className={css.status}>{t('loading')}</p>
  if (state.status === 'error') return (
    <div className={css.failure}><p role="alert">{t('error')}</p><button type="button" onClick={() => { setState({ status: 'loading' }); setRequest(value => value + 1) }}>{t('retry')}</button></div>
  )

  if (!state.view.available) return (
    <section className={css.section}>
      <h2>{t('title')}</h2><p className={css.intro}>{t('intro')}</p>
      <p role="status" className={css.notice}>{t('unavailable')}</p>
    </section>
  )

  const { projection: p, settings, writable, recommendedChanges } = state.view
  const custom = settings.mode === 'custom'
  const pending = state.status === 'saving'
  const changed = recommendedChanges.addedEvidenceRouteKeyIds.length + recommendedChanges.removedEvidenceRouteKeyIds.length > 0
  return (
    <section className={css.section} aria-busy={pending}>
      <header><h2>{t('title')}</h2><p className={css.intro}>{t('intro')}</p><p className={css.notice}>{t('evidenceNotice')}</p></header>
      <fieldset className={css.modePicker} disabled={!writable || pending}>
        <legend className={css.visuallyHidden}>{t('title')}</legend>
        {(['recommended', 'custom'] as const).map(mode => (
          <label key={mode} data-selected={settings.mode === mode ? 'true' : undefined}>
            <input type="radio" name="route-admission-mode" value={mode} aria-label={t(mode)} checked={settings.mode === mode} onChange={() => { void mutate(() => setMode(mode)) }} />
            <span><strong>{t(mode)}</strong><small>{t(mode === 'recommended' ? 'recommendedHelp' : 'customHelp')}</small></span>
          </label>
        ))}
      </fieldset>
      {!writable ? <p className={css.notice}>{t('readOnly')}</p> : null}
      {state.status === 'saving' ? <p role="status" className={css.status}>{t('saving')}</p> : null}
      {state.status === 'saved' ? <p role="status" className={css.success}>{t('saved')}</p> : null}
      {state.status === 'save-error' ? <p role="alert" className={css.failureText}>{t('saveError')}</p> : null}
      {changed ? <div className={css.changeNotice}><strong>{t('recommendedChanged')}</strong><span>{t('added')} {recommendedChanges.addedEvidenceRouteKeyIds.length} · {t('removed')} {recommendedChanges.removedEvidenceRouteKeyIds.length}</span></div> : null}
      <div className={css.summary} aria-label={t('coverage')}>
        <span><strong>{p.counts.admitted}</strong> {t('routes')}</span><span><strong>{p.counts.bindings}</strong> {t('bindings')}</span><span><strong>{p.counts.exclusions}</strong> {t('exclusions')}</span>
      </div>
      {p.unresolvedCustomEvidenceRouteKeyIds.length > 0 ? (
        <div className={css.unresolved} role="status">
          <p>{t('unresolvedCustom')}</p>
          <ul>{p.unresolvedCustomEvidenceRouteKeyIds.map(key => <li key={key}><code>{key}</code></li>)}</ul>
        </div>
      ) : null}
      {LEVELS.map(level => (
        <section className={css.level} key={level} data-level={level}>
          <h3>{t(level)}</h3>
          {p.emptyAdmittedLevels.includes(level) ? <p className={css.empty}>{t('emptyLevel')}</p> : null}
          <ul>{rowsByLevel[level].map(row => (
            <RouteCard
              key={row.evidenceRouteKeyId}
              row={row}
              custom={custom}
              writable={writable}
              pending={pending}
              t={t}
              onToggle={(target, enabled) => { void mutate(() => setRoute(target.evidenceRouteKeyId, enabled)) }}
            />
          ))}</ul>
        </section>
      ))}
      {rowsByLevel.unassigned.length > 0 ? (
        <section className={css.level}>
          <h3>{t('unassigned')}</h3>
          <ul>{rowsByLevel.unassigned.map(row => (
            <RouteCard
              key={row.evidenceRouteKeyId}
              row={row}
              custom={custom}
              writable={writable}
              pending={pending}
              t={t}
              onToggle={(target, enabled) => { void mutate(() => setRoute(target.evidenceRouteKeyId, enabled)) }}
            />
          ))}</ul>
        </section>
      ) : null}
      <section className={css.basis}>
        <h3>{t('versions')}</h3>
        <dl>
          <div><dt>{t('pack')}</dt><dd><code>{p.evidencePackId}</code></dd></div><div><dt>{t('snapshot')}</dt><dd><code>{p.aaSnapshotId}</code></dd></div>
          <div><dt>{t('bindingRegistry')}</dt><dd><code>{p.bindingRegistryVersion}</code></dd></div><div><dt>{t('policy')}</dt><dd><code>{p.routePolicyVersion}</code></dd></div>
          <div><dt>{t('admissionPolicy')}</dt><dd><code>{p.policyVersion}</code></dd></div><div><dt>{t('capabilityBasis')}</dt><dd><code>{p.capabilityField}</code></dd></div>
          <div><dt>{t('priceBasis')}</dt><dd><code>{p.priceField}</code></dd></div><div><dt>{t('latencyBasis')}</dt><dd><code>{p.latencyField}</code></dd></div>
          <div><dt>{t('bands')}</dt><dd>{LEVELS.map(level => `${t(level)} ${p.bandPolicy[level].minimumInclusive ?? '−∞'}–${p.bandPolicy[level].maximumExclusive ?? '∞'}`).join(' · ')}</dd></div>
        </dl>
      </section>
      <details className={css.exclusions}>
        <summary>{t('exclusionsTitle')} ({p.exclusions.length})</summary>
        {p.exclusions.length === 0 ? <p>{t('noExclusions')}</p> : <ul>{p.exclusions.map((item, index) => <li key={`${item.source}-${item.evidenceRouteKeyId ?? item.hostRouteId ?? index}`}><code>{item.evidenceRouteKeyId ?? item.hostRouteId ?? item.aaRecordId}</code><span>{item.reasonCode}{item.quarantineReasonCode ? ` · ${item.quarantineReasonCode}` : ''}</span></li>)}</ul>}
      </details>
    </section>
  )
}
