# @deepseek-ai/dsh-host-auto-mode-admission

English | [中文](README.zh.md)

Optional DSH Web bridge between the external `dsh-auto-mode` plugin and Host Settings. It owns the `dsh-auto-mode` Settings namespace, whose user fields are `mode` (`recommended` or `custom`) and `customEvidenceRouteKeyIds`. The bounded `recommendedObservations` history is Host-owned audit data and never participates in route eligibility.

The service exposes generated direct Remotes for reading the current browser-safe projection, changing mode, and enabling or disabling one current callable exact binding. Projection v3 identifies authoritative Pack rows versus runtime local-automatic rows, carries the local overlay/compiler identities, and attaches readable provider/model/display-name/effort facts to exclusions; valid v2 projections remain accepted for compatibility. The projection keeps the complete current callable set separate from the Recommended winners. The first entry into Custom copies the current Recommended set atomically. Later Recommended/Custom mode switches preserve that stored selection, including an intentionally empty set, while any callable exact binding may still be added or removed. A Custom key that later becomes unavailable or disappears from the Evidence Pack remains stored, but cannot route. The external plugin remains the sole owner of evidence acquisition, binding compilation, Host route materialization, band policy, and candidate resolution; this package neither reads AA nor changes derived binding state.

Provider registration follows the caller fiber. When the external plugin is absent or unloads, `view` returns explicit `provider-unavailable`; no cached catalog is presented as current. Settings changes affect later model calls and never mutate a route already frozen for the current call.

## Model Experience

Indirectly, through the external Auto plugin's next model-step route choice; this package registers no prompt, tool, message, or provider request.

#### KV Cache effect

Changing admission can select a different route for a later model call and therefore a different provider-side cache domain. This package does not alter any already-frozen request or prompt prefix.

## Known Limitations and Deferred Work

- **Optional provider** — the shipped Web composition includes this bridge, but an external Auto plugin must register the projection provider before route rows are available.
- **Bounded local audit** — only the eight most recent distinct Recommended-set observations are retained. This is local explanatory history, not telemetry or an AA acquisition log.
