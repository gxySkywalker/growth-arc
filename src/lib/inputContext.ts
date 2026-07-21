// ── Input Context Gate ────────────────────────────────────────
// Module-level variable (not React state) so it can be read
// synchronously inside keyboard event handlers without re-renders.

export type InputContext = 'world' | 'menu' | 'dialog'

let currentContext: InputContext = 'menu'

export function getInputContext(): InputContext { return currentContext }
export function setInputContext(ctx: InputContext): void { currentContext = ctx }

/** Returns true when the caller's context matches the active one. */
export function canHandle(ctx: InputContext): boolean { return currentContext === ctx }
