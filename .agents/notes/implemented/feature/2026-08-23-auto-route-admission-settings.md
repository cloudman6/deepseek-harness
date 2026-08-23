# Agent Note: Auto route-admission Settings

Status: implemented

English | [中文](2026-08-23-auto-route-admission-settings.zh.md)

## Problem

The external Auto plugin could derive an Active Catalog, but users could not see which exact bindings Recommended admitted or restrict those candidates without editing plugin configuration. Treating a user toggle as binding activation would mix three independent facts: AA evidence validity, current Host callability, and user admission.

## Decision

The maintained Web composition now mounts an optional Host bridge and a dedicated Settings section. The bridge owns only the `dsh-auto-mode` Settings namespace, a bounded history of distinct Recommended-set observations, and three direct Remotes. The external plugin remains the projection provider and the sole owner of Evidence Pack compilation and route resolution.

Recommended is the complete set of current Host-callable, policy-eligible, exact-bound routes. Custom is initialized by atomically copying that current set and then stores exact Evidence Route Key ids as a candidate restriction. It never mutates `valid`, `quarantined`, callable, or unavailable evidence state. Missing or stale Custom keys remain stored and visible but cannot route. A level may be empty; the existing escalation or explicit-failure policy handles that condition.

The browser receives a bounded projection rather than the full AA snapshot. It shows active and unavailable bindings, per-level winners, exclusions, metrics and field identities, handling bands, and pack/snapshot/policy versions. It receives no AA credentials, acquisition payload, raw snapshot, or complete effective request configuration. Settings changes apply to a later model call; a route already frozen for the current call remains unchanged.

The external plugin records the admission mode and exact Recommended/admitted set identities in selection and resolution-failure events. The maintained client accepts selection schema version 3 while preserving versions 1 and 2 for historical Sessions.

## Alternatives considered

- **Let users set binding status** — rejected because evidence validity and Host availability are derived facts, not preferences.
- **Store provider/model strings** — rejected because aliases and optional reasoning controls are not an exact evidence identity.
- **Send the full Evidence Pack to the browser** — rejected because the UI needs a narrow explanatory projection, not acquisition or redistribution data.
- **Require one route in every level** — rejected because that would silently change the accepted escalation and no-route behavior.

## Consequences

Users can inspect the exact Recommended result and constrain Auto without weakening evidence checks or changing Manual mode. The bridge remains useful when the external plugin is absent by reporting explicit capability absence. A point-in-time page does not live-subscribe to background Pack or Host-route changes; reopening, retrying, or writing refreshes it.

## Verification

Host unit and real-Loader composition tests cover Settings defaults, atomic Custom initialization, route validation, bounded observations, unavailable intent, provider teardown, and Remote shape. Component and slot tests cover every visible status, version basis, Custom interaction, failure containment, locale behavior, and disposal. The shipped Web e2e verifies that the page is present and fails closed when no external provider is installed; the external plugin suite verifies the active projection and that both assessor and user-task catalogs use the admitted set.
