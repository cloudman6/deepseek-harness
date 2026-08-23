/** Auto route-admission Settings page registration. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { AutoModeSettingsSection, type AutoModeSettingsInjected } from './AutoModeSettingsSection.tsx'
import { en, zh, type AutoModeLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'settings.autoMode': AutoModeLocaleKey }
}

export const inject = ['slots', 'locale', 'remote', 'remote.dshAutoModeAdmission']
const NS = 'settings.autoMode'

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-auto-mode: dictionaries')
  type RemoteResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } }
  const call = async <T>(request: Promise<RemoteResult<T>>): Promise<T> => {
    const result = await request
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
    return result.value
  }
  const injected = (): AutoModeSettingsInjected => ({
    view: () => call(ctx.remote.dshAutoModeAdmission.view()),
    setMode: mode => call(ctx.remote.dshAutoModeAdmission.setMode(mode)),
    setRoute: (key, enabled) => call(ctx.remote.dshAutoModeAdmission.setRoute(key, enabled)),
  })
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'auto-mode', order: 20, label: () => t('nav'), locale: NS, inject: injected,
  }, AutoModeSettingsSection))
}
