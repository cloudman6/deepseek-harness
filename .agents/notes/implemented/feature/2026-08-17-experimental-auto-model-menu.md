# Agent Note: Experimental Auto model menu

Status: implemented

English | [中文](2026-08-17-experimental-auto-model-menu.zh.md)

## Problem

The external Auto plugin can select a provider, model, and optional reasoning effort at the Host boundary, but users need to distinguish the effective request route from the independent task-handling level and understand whether AA evidence or a configured Deep fallback supplied that route. A browser-owned label or inferred state could diverge from the persisted Host decision.

## Decision

The maintainer fork extends the existing `conversation.input.model` entry with an optional `dshAutoMode` Session projection. When the projection exists, the root menu places Auto before Model and Effort, marks the active row with the standard check icon, and renders the effective model plus reasoning effort when the provider exposes one. It separately renders the Host-owned Light, Standard, or Deep task-handling level and names either AA data or the configured Deep fallback as the route basis. An AA-matched decision displays its exact snapshot id; a configured fallback explicitly says that an AA snapshot does not apply instead of implying an evidence match. The compact trigger prefixes the projected route with Auto, while the explicit `Effective selection` label distinguishes Host-selected facts from the manual controls below it. The UI describes AA routing as a heuristic that has not been validated by a project Benchmark.

The first projected selection establishes the displayed state without animation. On a later decision, the Host projection carries the immediately preceding decision together with the effective one. The client rolls only a changed model, reasoning effort, or task-handling level from the preceding value to the effective value over 1.2 seconds. Auto and each changed target use the DSH business-blue state while the value arrives, then breathe twice before returning to the surrounding label color. A level-only decision therefore animates the level and Auto marker while leaving the route static. `prefers-reduced-motion` suppresses movement while preserving the final values and update text.

The external plugin owns Auto state and decisions. It appends `dsh-auto-mode/mode` and `dsh-auto-mode/selection` events, folds them through `ctx.sessionProjections`, and registers `/auto [off]`. A schema-v2 selection carries task-handling level and route basis without publishing the prototype `fast`/`standard`/`strong` tier. The maintained client still maps schema-v1 tier values while replaying existing Sessions, but never emits them. Each changed persisted selection becomes a chat-timeline route fact at its durable event position before the resulting assistant response. A changed field displays its prior value, arrow, and business-blue effective value; an unchanged field displays only its effective value. A route without an effort dimension omits that row rather than inventing a provider effort.

The model-selection client invokes `/auto` or `/auto off` through the existing command Remote. Selecting a manual model or effort, through either the composer or `/model`, first disables Auto and then submits the ordinary `session.selectModel` request. An absent projection preserves the standard model menu byte-for-behavior; addressed subagent sessions remain unavailable. When the advisory model catalog omits the effective Auto route, the trigger still renders the exact projected model and effort ids instead of hiding the request fact.

This integration is a maintainer-only, fork-pinned carrier. It does not add Auto policy to DSH Core, ship in a default composition, claim official compatibility, or treat AA data as project-Benchmark evidence.

## Verification

Component tests pin menu order, exact projected route display with optional effort, localized task-handling levels, AA and fallback basis labels, exact AA snapshot presentation, schema-v1 replay, live projection replacement, level-only notices, reduced-motion behavior, and disable-Auto-before-manual-selection ordering. The keyless assembled-Web fixture independently exercises model-only, effort-only, combined model-and-effort, and level-only changes against the built bundle. It requires the affected value tracks to roll for 1.2 seconds, each changed target and Auto to use the breathing animation, unaffected values to remain static, and Chinese and English accessibility snapshots to expose the current level and basis. An optional cross-repository beta fixture mounts the external Auto plugin and drives the real browser, agent loop, Session log, and request header through Light, Standard, Deep, and Manual. Its Standard pool proves price-first and latency-second selection, and every Auto turn requires the displayed route and snapshot, persisted selection, and effective request configuration to agree exactly.

## Alternatives considered

**Keep Auto as a global startup option.** Rejected because it gives no per-Session user control and provides no visible evidence that the request changed.

**Maintain inferred Auto state in the browser.** Rejected because client-local policy or optimism can diverge from the Host decision. The Session projection is the only displayed Auto fact.

**Add a separate Auto control outside the model menu.** Rejected for this prototype because provider, model, and reasoning effort already have one composer-owned selection surface. Splitting the controls would hide their mutual exclusion and duplicate status presentation.

## Consequences

Users can identify the effective route, required handling level, and evidence basis without conflating Deep with a provider effort or fallback with a fourth level. Manual selection has explicit precedence, the standard menu remains unchanged when the external capability is absent, and existing schema-v1 Sessions remain readable. The fork accepts an Auto-specific optional type, legacy read path, and command bridge in `ui-model-selection`; a production plugin ecosystem needs an upstream-neutral contribution contract before this integration can leave the pinned experiment.
