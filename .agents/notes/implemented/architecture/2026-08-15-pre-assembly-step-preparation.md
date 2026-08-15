# Agent Note: Pre-assembly step preparation

Status: implemented

English | [中文](2026-08-15-pre-assembly-step-preparation.zh.md)

## Problem

The Agent loop claims queued messages before a step, but `system-prompt/assemble` currently runs before the first Agent waterfall that receives those messages. A plugin can replace the provider and model at `agent/request`, yet provider-dependent prompt sections and tools have already been assembled by then. `installModelSelection()` keeps assembly and request consistent only when another owner selected the model before assembly; it cannot derive that selection from the newly claimed input. A policy plugin therefore cannot both inspect the current message and guarantee that prompt assembly and the model call use one selection.

## Decision

Add an agent-scoped `agent/prepare-step` waterfall immediately after inbox claim and before `system-prompt/assemble`. The payload carries the exact frozen claimed messages, stable turn and step numbers, and the live cancellation signal. Its decision is `enter` or `reject`; rejection closes the claimed turn without prompt assembly, a step boundary, or a model call. The waterfall does not rewrite messages. Existing `agent/pre-step` remains after assembly and keeps its context projection and message-rewrite semantics.

A model-selection owner may update the existing selection state during preparation. `installModelSelection()` then captures that state during prompt assembly and reuses it at `agent/request`; the preparation hook does not introduce another model-selection API or policy vocabulary.

## Alternatives considered

**Move `agent/pre-step` before assembly.** Rejected because existing listeners receive runtime context projected from the assembled prompt and may rewrite the complete entered message list. Moving the event changes its established input and timing contract.

**Let `agent/request` own semantic selection.** Rejected because the request waterfall runs after provider-dependent prompt and tool assembly, so a changed model can receive a prompt assembled for another model.

**Pass pending messages into `system-prompt/assemble`.** Rejected because prompt contributors should assemble prompt material, not own step admission or lifecycle decisions. It would also give every prompt listener direct access to user input when only the policy owner needs it.

## Testing

- Contract tests prove preparation observes the current frozen claimed messages before any assembly listener, with stable turn/step coordinates and agent scoping.
- A preparation rejection produces no prompt assembly, `step/start`, or model call.
- Cancellation during preparation prevents subsequent assembly and request work.
- A model selected during preparation is identical in provider-dependent assembly and `agent/request`.
- Existing `agent/pre-step` tests continue to pass without changed payload or ordering relative to assembly.

## Consequences

The new awaited waterfall adds policy latency to every proposed step when listeners are installed. A listener that performs unbounded remote work can delay a turn before assembly, so the cancellation signal and plugin-owned latency policy remain part of the public contract. Claim still occurs before preparation; rejection intentionally consumes the claimed batch and records a blocked turn rather than restoring the inbox.
