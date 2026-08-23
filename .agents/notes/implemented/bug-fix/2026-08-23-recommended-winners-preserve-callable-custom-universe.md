# Agent Note: Recommended winners preserve the callable Custom universe

Status: implemented

English | [中文](2026-08-23-recommended-winners-preserve-callable-custom-universe.zh.md)

## Problem

Treating every callable exact binding as Recommended makes the default route set indistinguishable from the complete Custom choice universe. The page can mark one winner per handling level, but Auto still admits every lower-ranked route by default, and a Host projection that requires Custom admissions to be a Recommended subset prevents users from adding another callable exact binding.

## Decision

`route-admission-projection/v2` publishes three independent dynamic key sets: every current callable, policy-eligible, exact-bound route; the Recommended winner in each non-empty handling level under price, latency, and stable-identity ordering; and the set admitted by the current mode. No set has a fixed item count.

Recommended admits its per-level winners. The first Custom entry copies those winners, after which the user may add or remove any key from the current callable set. Later Recommended/Custom mode switches preserve the saved Custom subset, including an intentionally empty set, rather than copying the winners again. The Host validates both Recommended and admitted keys as callable subsets instead of requiring admitted keys to remain inside Recommended. Unavailable stored intent remains visible and unroutable.

The external plugin owns winner calculation and set identities. The Host bridge persists user intent and validates the bounded projection without learning AA ordering or handling-level policy.

## Alternatives considered

- **Keep every callable route in Recommended and show only winner badges** — rejected because the badge would not describe the set Auto actually admits by default.
- **Ship a fixed list or fixed count of Recommended routes** — rejected because Host availability, bindings, policy eligibility, and non-empty handling levels vary by environment and Evidence Pack.
- **Allow Custom to select only Recommended routes** — rejected because it removes the requested ability to opt into another exact callable binding without editing evidence or Host configuration.

## Consequences

The default set contains at most one route for each non-empty handling level, while the Custom choice universe continues to track every current callable exact binding. Model, effort, provider, binding, and Host changes can alter both counts without a schema change. The browser can distinguish enabled, callable, binding, and exclusion counts, and historical Session events that name `route-admission-policy/v1` remain readable.

## Verification

Host tests prove that the first Custom entry copies only Recommended, that a second callable non-Recommended key can then be enabled, and that both non-default and empty Custom subsets survive mode round trips. A real-browser Web e2e exercises the same round trips through Settings controls and verifies the persisted Settings document. Client tests render the non-Recommended callable row as an unchecked Custom control. The external plugin tests prove winner-only Recommended admission, unrestricted callable Custom admission, dynamic set identities, and legacy policy-version replay.
