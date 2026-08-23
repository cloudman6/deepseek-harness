import { describe, expect, it } from 'vitest'
import { apply, inject, name } from '../src/invariant.ts'

describe('ui-settings-auto-mode invariant companion', () => {
  it('registers under the package identity', () => {
    expect(name).toBe('client-ui-settings-auto-mode-invariant')
    expect(inject).toEqual(['invariants'])
    expect(typeof apply).toBe('function')
  })
})
