# Agent Note: Experimental Auto model menu

Status: implemented

English | [中文](2026-08-17-experimental-auto-model-menu.zh.md)

## Problem

The Phase 0P Auto plugin can select a provider, model, and reasoning effort at the Host boundary, but a configuration-only switch leaves users unable to tell whether Auto is active, which selection reached the request, or why the policy chose it. The existing model trigger also continues to display its last directory value while an Auto-routed request is running.

## Decision

The maintainer fork extends the existing `conversation.input.model` entry with an optional `dshAutoMode` Session projection. When the projection exists, the root menu places Auto before Model and Effort, marks the active Auto row with the standard check icon, and renders the effective model and reasoning effort under an explicit `Effective selection` label before the latest tier, reason code, explanation, and `experimental-unadmitted` status. The compact trigger prefixes the projected model and reasoning effort with Auto. The explicit label distinguishes Host-selected facts from the manual Model and Effort controls that remain below the Auto details.

The first projected selection establishes the displayed state without animation. A later change to provider, model, or effort briefly highlights the effective route and adds a textual switch notice. The notice uses the same projection fact as the route itself; it does not infer a switch from a task, a directory refresh, or a local timer. `prefers-reduced-motion` suppresses the movement while preserving the visible text.

The external Phase 0P plugin owns Auto state and decisions. It appends `dsh-auto-mode/mode` and `dsh-auto-mode/selection` events, folds them through `ctx.sessionProjections`, and registers `/auto [off]`. Session projection frames update the browser during a running request, so the menu never infers a route or polls the model directory.

The model-selection client invokes `/auto` or `/auto off` through the existing command Remote. Selecting a manual model or effort, through either the composer or `/model`, first disables Auto and then submits the ordinary `session.selectModel` request. An absent projection preserves the standard model menu byte-for-behavior; addressed subagent sessions remain unavailable. When the advisory model catalog omits the effective Auto route, the trigger still renders the exact projected model and effort ids instead of hiding the request fact.

This integration is a maintainer-only, fork-pinned Phase 0P carrier. It does not add Auto policy to DSH Core, ship in a default composition, claim official compatibility, or admit any externally seeded route.

## Verification

Component tests pin menu order, checked state, the explicit effective-selection label and model/effort value, projected provider/model/effort, missing-catalog display, live projection replacement, the no-animation initial selection, the switch notice, route explanation, and the disable-Auto-before-manual-selection order. Browser-plugin tests pin `/auto` and `/auto off` command carriage, `/model` mutual exclusion, and error mapping. A committed keyless assembled-Web snapshot pins Auto as the first checked row, a projection change from an absent fast route to an absent strong route, the resulting switch notice, and the unadmitted label. A real Web composition with the external plugin verifies that a running simple task changes the visible selection from Flash/High to Auto/Flash/Off before completion, shows its `fast` reason, and returns to the ordinary trigger after a manual Pro selection.

## Alternatives considered

**Keep Auto as a global startup option.** Rejected because it gives no per-Session user control and provides no visible evidence that the request changed.

**Maintain inferred Auto state in the browser.** Rejected because client-local policy or optimism can diverge from the Host decision. The Session projection is the only displayed Auto fact.

**Add a separate Auto control outside the model menu.** Rejected for this prototype because provider, model, and reasoning effort already have one composer-owned selection surface. Splitting the controls would hide their mutual exclusion and duplicate status presentation.

## Consequences

Users can select Auto where they already choose a model and can identify the effective model and effort as Auto output, rather than infer them from manual controls, while work is running. Manual selection has explicit precedence in the interaction and the standard menu remains unchanged when the external capability is absent. The fork accepts an Auto-specific optional type and command bridge in `ui-model-selection`; a production plugin ecosystem needs an upstream-neutral contribution contract before this integration can leave the pinned experiment.
