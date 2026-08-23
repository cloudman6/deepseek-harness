/** Package-owned invariant companion. @module @deepseek-ai/dsh-client-ui-settings-auto-mode/invariant */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-settings-auto-mode'

export const name = 'client-ui-settings-auto-mode-invariant'
export const inject = ['invariants']

// No runtime invariant: the browser package is verified by its slot lifecycle,
// Remote contract, component suite, and real-composition Web test.
const install: InvariantInstaller = () => {}

export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
