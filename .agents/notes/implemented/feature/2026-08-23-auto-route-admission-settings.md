# Agent Note: Auto route-admission Settings

Status: implemented

English | [中文](2026-08-23-auto-route-admission-settings.zh.md)

## Problem

The external Auto plugin could derive an Active Catalog, but users could not see which exact bindings Recommended admitted or restrict those candidates without editing plugin configuration. Treating a user toggle as binding activation would mix three independent facts: AA evidence validity, current Host callability, and user admission.

## Decision

The maintained Web composition now mounts an optional Host bridge and a dedicated Settings section. The bridge owns only the `dsh-auto-mode` Settings namespace, a bounded history of distinct Recommended-set observations, and three direct Remotes. The external plugin remains the projection provider and the sole owner of Evidence Pack compilation and route resolution.

The [Recommended winner and callable Custom decision](../bug-fix/2026-08-23-recommended-winners-preserve-callable-custom-universe.md) owns the admitted-set semantics and supersedes this note's original complete-callable-set definition. The first Custom entry atomically copies the current Recommended set and stores exact Evidence Route Key ids as a candidate restriction. Later mode switches preserve that stored restriction, including an intentionally empty set, instead of reinitializing it. It never mutates `valid`, `quarantined`, callable, or unavailable evidence state. Missing or stale Custom keys remain stored and visible but cannot route. A level may be empty; the existing escalation or explicit-failure policy handles that condition.

The browser receives a bounded projection rather than the full AA snapshot. Projection v3 distinguishes authoritative Pack rows from runtime local-automatic rows, binds the local overlay/compiler identities, and gives Host-route exclusions readable provider/model/display-name/effort facts. The Settings page groups those exclusions by model, localizes the stable reason, and retains exact route IDs as technical detail. Valid v2 projections remain accepted for compatibility. The browser receives no AA credentials, acquisition payload, raw snapshot, or complete effective request configuration. Settings changes apply to a later model call; a route already frozen for the current call remains unchanged.

The external plugin records the admission mode and exact Recommended/admitted set identities in selection and resolution-failure events. The maintained client accepts selection schema version 3 while preserving versions 1 and 2 for historical Sessions.

## Alternatives considered

- **Let users set binding status** — rejected because evidence validity and Host availability are derived facts, not preferences.
- **Store provider/model strings** — rejected because aliases and optional reasoning controls are not an exact evidence identity.
- **Send the full Evidence Pack to the browser** — rejected because the UI needs a narrow explanatory projection, not acquisition or redistribution data.
- **Require one route in every level** — rejected because that would silently change the accepted escalation and no-route behavior.

## Consequences

Users can inspect the exact Recommended result, see whether each callable row came from the Pack or the local automatic overlay, understand why newly configured routes remain excluded, and constrain Auto without weakening evidence checks or changing Manual mode. The bridge remains useful when the external plugin is absent by reporting explicit capability absence. A point-in-time page does not live-subscribe to background Pack or Host-route changes; reopening, retrying, or writing refreshes it.

## Verification

Host unit and real-Loader composition tests cover Settings defaults, one-time atomic Custom initialization, preservation across mode switches (including an empty set), v2/v3 projection validation, route validation, bounded observations, unavailable intent, provider teardown, and Remote shape. Component and slot tests cover Pack/automatic origin, grouped readable exclusions, every visible status, version basis, Custom interaction, failure containment, locale behavior, and disposal. One shipped Web e2e verifies that the page is present and fails closed when no external provider is installed; another edits Custom in a real browser, inspects grouped qwen-token-plan-cn exclusion reasons, round-trips through Recommended, and verifies both the restored checkboxes and persisted Settings. The external plugin suite verifies local exact-binding admission and that both assessor and user-task catalogs use the admitted set.
