import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { TestRemote, usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject } from '../src/client/index.ts'
import { AutoModeSettingsSection } from '../src/client/AutoModeSettingsSection.tsx'

usePinnedBrowserLanguages('zh-CN')

describe('ui-settings-auto-mode apply', () => {
  it('registers a locale-following Settings section and disposes it with the fiber', async () => {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    const locale = new LocaleRuntime(ctx)
    ctx.provide('locale', locale)
    new TestRemote(ctx)
    ctx.provide('remote.dshAutoModeAdmission', {})
    const slots = ctx.get('slots') as SlotRegistry
    slots.register({ name: 'root', children: { 'settings.section': { kind: 'list', scope: 'root' } } } as never, () => null)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const entry = slots.entries('settings.section')[0]!
    expect(inject).toEqual(['slots', 'locale', 'remote', 'remote.dshAutoModeAdmission'])
    expect(entry.component).toBe(AutoModeSettingsSection)
    expect(entry.options).toMatchObject({ id: 'auto-mode', order: 20 })
    expect(resolveSlotLabel(entry.options.label)).toBe('Auto 模式')
    locale.setLocale('en')
    expect(resolveSlotLabel(entry.options.label)).toBe('Auto Mode')
    await fiber.dispose()
    expect(slots.entries('settings.section')).toHaveLength(0)
    await ctx.fiber.dispose()
  })
})
