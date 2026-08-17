# @deepseek-ai/dsh-client-ui-model-selection

English | [中文](README.zh.md)

Model selection plugin, browser half: TWO entries over ONE per-session directory owned by `ModelDirectoryResolver` (`ctx.modelDirectories`). For ordinary sessions, the `/model` popupSelect contribution (registered through `ctx.commandUi`) and the composer's named `conversation.input.model` seat both load the session's advisory directory through `session.models` and submit through `session.selectModel` via the same `ModelDirectory` instance. The compact composer trigger opens a two-level Model/Effort menu: models stay provider-grouped, while the selected exact model supplies its adapter-owned effort names, descriptions, and default. `/model` applies the selected model's default effort, and the composer can then choose any advertised effort.

The maintainer fork also recognizes the optional `dshAutoMode` Session projection used by the external Phase 0P experiment. When present, Auto is the first root-menu row and the trigger, checked state, effective model/effort, tier, reason code, explanation, and `experimental-unadmitted` label come directly from that Host projection. The expanded Auto details name the effective model and effort under an explicit `Effective selection` label so they are not confused with the separate manual Model/Effort controls below. A projection that supplies a preceding decision rolls each changed model or effort value from that decision to the effective selection over 1.2 seconds; if both change, both tracks roll together. During that transition, Auto and each changed target use the DSH business blue, then breathe twice before returning to their ordinary colors. The unchanged value remains static, and reduced-motion users retain the final value and switch text without movement. Each persisted `dsh-auto-mode/selection` transition also adds one chat-timeline notice immediately after the user message that triggered it and before the resulting assistant response. The notice gives the before/after model and effort plus the tier, reason code, and explanation; it is a route fact, not an assistant message. The client invokes `/auto [off]` through the command Remote; a manual model or effort selection disables Auto before calling `session.selectModel`. Capability absence preserves the ordinary menu. This fork-pinned bridge is not part of a default composition or an official Auto compatibility contract; its rationale and verification live in the [experimental Auto model menu Agent Note](../../../.agents/notes/implemented/feature/2026-08-17-experimental-auto-model-menu.md).

The Host-reported provider/model/reasoning `ModelSelection` is the single selection fact, but it is echoed only when the exact provider/model pair remains in the advertised groups; an absent catalog row leaves the routable selection intact while the trigger prompts `Select model`, no stale row is synthesized, and no Effort row is shown until the user picks an advertised model. Directory loads and selections share a generation counter so an older response never overwrites a newer one; a connection reset drops every resident projection and repulls the Host-restored selection before display. Provider-local metadata failures list inline while usable groups stay selectable, and selection failures retain the prior selection and directory.

When the Host reports that no adapter serves the session's route (`session.models.routable`), this plugin raises a composer block through `ctx.conversation.blocks` and the input goes inert with this plugin's own copy; recovering clears it without a reload. It follows `routable` and nothing else: a `null` — before the first load, or after one failed — never blocks, or a slow Host would lock a working composer, and catalog membership never blocks either, because a route serving a model it stopped advertising is missing from the groups yet perfectly usable. The trigger's own `Select model` fallback still covers that case, which is display, not a gate.

Directories are per-session, resolved lazily through `ctx.modelDirectories.directoryFor(sessionId)`, and disposed with the session scope. Addressed subagent sessions expose neither entry, and their directory rejects loads, selections, and reconnect refreshes, because ordinary Agent-bound model RPCs would activate persisted child history outside the direct-parent continuation path.

Every resident directory refetches directly on forwarded `llm/adapters-updated` and `settings/document-updated` owner events. Provider topology, provider catalogs, and the default selection therefore converge without the Host or client runtime deriving a separate model-change alias.

The `/client` exports are the plugin body (`apply`/`inject`), `ModelDirectoryResolver`, `ModelDirectory` with its state fields, and the seat's injected face type.

## Model Experience

Indirectly, through the `session.selectModel` RPC available to ordinary sessions, both entries submit the complete `ModelSelection` that the Host snapshots at the next prompt-assembly boundary, so the following request uses the selected provider, model, and effort while a running step keeps its assembled selection; the selection becomes durable only when the existing request header records a request that consumes it, and menu interaction adds no prompt content.

#### KV Cache effect

Switching the route can reduce or invalidate provider-side cache reuse for subsequent requests; the prompt prefix itself is untouched.

## Known Limitations and Deferred Work

- **No create-time or addressed-subagent selection** — both entries require an existing ordinary session's Agent; there is no draft-phase model choice to fold into session creation, and subagent continuation deliberately exposes no independent model-selection contract.
- **Directory names are presentation-only** — selection and persistence use provider/model/effort ids; a provider whose catalog or exact-model metadata lookup fails lists as an unselectable failure row until reload.
- **No arbitrary effort input** — the composer offers only the exact model's adapter-advertised levels; an adapter without reasoning metadata leaves the Effort row absent.
