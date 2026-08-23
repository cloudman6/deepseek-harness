/** Public and Host-plugin contracts for the optional Auto admission integration. */

export type RouteAdmissionMode = 'recommended' | 'custom'
/** Product handling level assigned by the external versioned route policy. */
export type RouteAdmissionHandlingLevel = 'light' | 'standard' | 'deep'

/** User-owned route-admission fields supplied to the external provider. */
export interface RouteAdmissionSettings {
  readonly mode: RouteAdmissionMode
  readonly customEvidenceRouteKeyIds: string[]
}

/** One local audit observation of a distinct Recommended exact-key set. */
export interface RecommendedObservation {
  readonly setId: string
  readonly evidenceRouteKeyIds: string[]
  readonly evidencePackId: string
  readonly aaSnapshotId: string
  readonly observedAt: number
}

/** Complete persisted Settings section, including Host-owned audit history. */
export interface RouteAdmissionStoredSettings extends RouteAdmissionSettings {
  readonly recommendedObservations: RecommendedObservation[]
}

/** Browser-safe canonical evidence identity for one provider/model configuration. */
export interface RouteAdmissionEvidenceKey {
  readonly schemaVersion: 1
  readonly providerNamespace: string
  readonly modelKey: string
  readonly evidenceControls: Readonly<Record<string, string | number | boolean>>
}

/** One half-open capability band boundary from the external policy. */
export interface RouteAdmissionBand {
  readonly minimumInclusive: number | null
  readonly maximumExclusive: number | null
}

/** Bounded summary counts for the current admission projection. */
export interface RouteAdmissionCounts {
  readonly hostRoutes: number
  readonly bindings: number
  readonly recommended: number
  readonly admitted: number
  readonly exclusions: number
}

/** One binding with independent evidence, Host, and user-admission state. */
export interface RouteAdmissionRow {
  readonly evidenceRouteKeyId: string
  readonly evidenceRouteKey: RouteAdmissionEvidenceKey
  readonly aaRecordId: string
  readonly aaRecordLabel: string
  readonly evidenceStatus: 'valid' | 'ineligible' | 'quarantined'
  readonly hostStatus: 'callable' | 'unavailable'
  readonly admissionStatus: 'enabled' | 'disabled' | 'unavailable' | 'excluded'
  readonly recommended: boolean
  readonly recommendedWinner: boolean
  readonly admittedWinner: boolean
  readonly routeId?: string
  readonly provider?: string
  readonly model?: string
  readonly effectiveConfigFingerprint?: string
  readonly handlingLevel?: RouteAdmissionHandlingLevel
  readonly aaCapabilityScore?: number
  readonly aaPrice?: number
  readonly aaLatencySeconds?: number | null
  readonly matchBasis: readonly string[]
  readonly limitations: readonly string[]
  readonly reasonCodes: readonly string[]
}

/** One stable exclusion emitted while compiling the current Host catalog. */
export interface RouteAdmissionExclusion {
  readonly source: 'host-route' | 'binding'
  readonly hostRouteId?: string
  readonly evidenceRouteKeyId?: string
  readonly aaRecordId?: string
  readonly reasonCode: string
  readonly quarantineReasonCode?: string
}

/** Bounded browser projection compiled by the external Auto plugin. */
export interface RouteAdmissionProjection {
  readonly schemaVersion: 1
  readonly projectionVersion: 'route-admission-projection/v1'
  readonly policyVersion: 'route-admission-policy/v1'
  readonly mode: RouteAdmissionMode
  readonly evidencePackId: string
  readonly evidencePackManifestVersion: string
  readonly aaSnapshotId: string
  readonly bindingRegistryVersion: string
  readonly routePolicyVersion: string
  readonly capabilityField: string
  readonly capabilityMethodologyVersion: string
  readonly priceField: string
  readonly priceNormalizationVersion: string
  readonly latencyField: string
  readonly bandPolicy: Readonly<Record<RouteAdmissionHandlingLevel, RouteAdmissionBand>>
  readonly recommendedEvidenceRouteKeyIds: readonly string[]
  readonly admittedEvidenceRouteKeyIds: readonly string[]
  readonly configuredCustomEvidenceRouteKeyIds: readonly string[]
  /** Preserved Custom intent whose key no longer exists in this Evidence Pack. */
  readonly unresolvedCustomEvidenceRouteKeyIds: readonly string[]
  readonly recommendedSetId: string
  readonly admittedSetId: string
  readonly emptyAdmittedLevels: readonly RouteAdmissionHandlingLevel[]
  readonly counts: RouteAdmissionCounts
  readonly rows: readonly RouteAdmissionRow[]
  readonly exclusions: readonly RouteAdmissionExclusion[]
}

/** Difference between the current and preceding observed Recommended sets. */
export interface RecommendedChanges {
  readonly addedEvidenceRouteKeyIds: readonly string[]
  readonly removedEvidenceRouteKeyIds: readonly string[]
  readonly fromSetId?: string
  readonly toSetId: string
}

/** Available admission view returned when an external provider is registered. */
export interface RouteAdmissionAvailableView {
  readonly available: true
  readonly writable: boolean
  readonly settings: RouteAdmissionSettings
  readonly projection: RouteAdmissionProjection
  readonly recommendedChanges: RecommendedChanges
}

/** Explicit unavailable view returned when the external provider is absent. */
export interface RouteAdmissionUnavailableView {
  readonly available: false
  readonly writable: boolean
  readonly settings: RouteAdmissionSettings
  readonly reason: 'provider-unavailable'
}

/** Current route-admission Settings view exposed through the direct Remote. */
export type RouteAdmissionView = RouteAdmissionAvailableView | RouteAdmissionUnavailableView

/** External plugin interface that compiles a fresh projection for given settings. */
export interface RouteAdmissionProjectionProvider {
  inspect(settings: RouteAdmissionSettings, signal?: AbortSignal): Promise<RouteAdmissionProjection>
}
