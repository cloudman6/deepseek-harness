# @deepseek-ai/dsh-client-ui-settings-auto-mode

English | [中文](README.zh.md)

The **Auto Mode** Web Settings section for route admission. It lazily reads the maintained Host bridge after the section mounts and shows Recommended and Custom as two explicit modes. Recommended enables the first route in each non-empty handling level under the external price, latency, and stable-identity ordering. The page also displays every other callable, unavailable, or excluded binding, exclusion reasons, AA capability/normalized-price/latency metrics, handling bands, and the Evidence Pack, snapshot, binding-registry, route-policy, and admission-policy identities used for the result.

The first use of Custom starts from the current Recommended set. Later Recommended/Custom mode switches preserve the saved Custom selection, including an intentionally empty set. Every row that is both exact-bound and currently Host-callable exposes a checkbox, including callable routes outside Recommended; changing one constrains Auto candidates without mutating evidence status. Stored keys that no longer exist in the current Evidence Pack remain visible as preserved but unroutable intent. Empty levels, read-only Settings, provider absence, Recommended-set changes, loading, retry, saving, success, and generic failure states are explicit. Copy states that AA data is heuristic evidence rather than a project Benchmark or task-quality guarantee, and that changes apply from the next model call.

The component receives three narrowed Remote callbacks through its slot injection face. It imports no Host implementation, owns no subscription machinery, and exposes no AA credentials, raw snapshot, acquisition response, or complete effective request configuration to the browser.

## Model Experience

Indirectly, through the user's admission choice changing the external Auto plugin's candidate set for later model calls; this package registers no model-facing content.

#### KV Cache effect

A later call may use a different admitted route and provider cache domain. Rendering or inspecting this Settings page has no model-input or KV-cache effect.

## Known Limitations and Deferred Work

- **Point-in-time projection** — the page refreshes on mount, retry, and its own writes. It does not subscribe to background Evidence Pack or Host-route changes while left open.
- **No evidence editing** — users can restrict current exact-bound callable routes only; they cannot change AA fields, bands, binding identities, derived evidence states, or price/latency ordering.
