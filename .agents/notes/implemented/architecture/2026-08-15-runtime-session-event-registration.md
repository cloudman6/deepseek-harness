# Agent Note: Runtime Session event registration

Status: implemented

English | [中文](2026-08-15-runtime-session-event-registration.zh.md)

## Problem

`SessionEventMap` is declaration-merge extensible, so an out-of-tree plugin can compile calls that append its own event types. Durable readers recognize only the generated repository-local event set. A required plugin event is therefore accepted by the live TypeScript program but refused after restart as unknown, while marking it ignorable would let a missing plugin reconstruct incomplete normative state. The runtime has no registration identity, payload validator, schema-version check, namespace conflict detection, or precise missing-plugin diagnostic.

## Decision

Add an effect-scoped Session event namespace registry to `SessionStore`. A plugin registers one globally unique namespace, owner id, positive schema version, and complete mapping from event type to a structural payload schema exposing `parse(unknown): unknown`. Registration rejects malformed names, duplicate namespaces, event types outside the namespace, and collisions with generated built-in event types.

An attached Session validates every required out-of-tree append against the live registration before mutating its log and adds immutable namespace/version metadata to the event envelope. The original lossless JSON snapshot is persisted; parser output is ignored so validation cannot transform durable state. A cold reader accepts such an event only when the namespace is registered at the exact persisted version, the event type exists in that registration, and its payload validates. Missing registration, incompatible version, malformed registration metadata, unknown registered type, and schema rejection are unsupported-format failures before Session reconstruction. Explicitly ignorable unknown events retain the existing skip contract.

Registration must complete before cold `load` or `prepare`. A failed cold read does not cache the failure permanently: loading may be retried after the owning plugin registers. Disposing the registering fiber removes the namespace, so later cold reads fail closed rather than retaining a stale validator from an unloaded plugin.

## Alternatives considered

**Generate plugin events into the repository catalog.** Rejected because an out-of-tree plugin cannot modify the installed Harness build, and requiring a Core rebuild defeats runtime plugin installation.

**Treat every namespaced event as supported.** Rejected because a prefix proves neither that the owning plugin is installed nor that its current code can interpret the persisted payload.

**Mark plugin events ignorable.** Rejected for normative state: a missing decision, constraint, or recovery event can change reconstruction, so skipping it is silent corruption of meaning.

**Persist no schema version and rely on validation alone.** Rejected because a validation error cannot distinguish damaged data from a plugin version mismatch, and compatible code cannot state which durable schema it implements.

## Testing

- Live append rejects unregistered, colliding, or schema-invalid required plugin events before the log changes and records namespace/version metadata for valid events.
- Both first-party persistence backends reload valid registered events and fail before reconstruction for missing registration, version mismatch, unknown registered type, malformed metadata, or invalid payload.
- A load attempted before plugin registration fails with a diagnostic naming the namespace and version, then succeeds when retried after registration.
- Registration disposal removes support, and duplicate namespace registration fails deterministically.
- Generated built-in events and explicitly ignorable unknown events preserve their existing behavior.

## Consequences

Required plugin logs become intentionally unavailable while their owning plugin is absent; this is the safe direction for normative state but makes plugin removal an explicit data-compatibility operation. Exact schema versions reject readers that might have been semantically compatible, so plugins must keep a version stable for backward-compatible validators and increment it only for incompatible durable schemas. The envelope gains optional metadata; unreleased builds may reject these logs, which is consistent with the repository's pre-release no-compatibility stance.
