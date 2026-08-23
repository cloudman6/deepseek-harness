/** Package-owned invariant companion. @module @deepseek-ai/dsh-host-auto-mode-admission/invariant */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-host-auto-mode-admission'

export const name = 'host-auto-mode-admission-invariant'
export const inject = ['invariants']

// No runtime invariant: schema and projection validation run at every mutation/read boundary.
const install: InvariantInstaller = () => {}

export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
