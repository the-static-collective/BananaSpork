export type SourceDisplayState = 'available' | 'redacted' | 'unavailable';

export interface SafeSourceRef {
  eventId: string;
  openable: boolean;
  display: SourceDisplayState;
}

export type LaneType =
  | 'semantic'
  | 'lineage'
  | 'active_tension'
  | 'human_link'
  | 'rejected_parallel';

export type ClassificationType = 'deterministic' | 'model_interpretation';

export interface DeterministicChangeItem {
  id: string;
  sequence: number;
  eventType: string;
  title: string;
  actorName: string; // Actor attribution (not cryptographic signature)
  timestamp: string;
  details: string;
  sha256Hash: string;
  sourceRef: SafeSourceRef;
}

export interface WhatChangedSummaryItem {
  id: string;
  claim: string;
  sourceRef: SafeSourceRef;
}

export interface WhatChangedReport {
  deterministicChanges: DeterministicChangeItem[];
  aiSummary: WhatChangedSummaryItem[] | null;
  hasUnbackedClaimsDropped: boolean;
}

export interface StructuralEvidence {
  categoryMatch: boolean;
  boundaryMatch: boolean;
  availabilityMatch: boolean;
  matchedFields: string[];
}

export interface GentleMatchCandidate {
  id: string;
  needId: string;
  needTitle: string;
  seedId: string;
  offerId: string;
  offerTitle: string;
  contributorName: string;
  isStandaloneProposedOffer: boolean; // Standalone offers remain local/proposed
  structuralEvidence: StructuralEvidence;
  semanticInterpretation?: string;
  confidence: 'High' | 'Moderate' | 'Exploratory';
  primaryLane: LaneType;
  classification: ClassificationType;
  explicitEvidence: string[];
  sourceRef: SafeSourceRef;
}

export interface NearbyGrowthLaneItem {
  id: string;
  title: string;
  details: string;
  primaryLane: LaneType;
  classification: ClassificationType;
  explicitEvidence: string[];
  safeSources: SafeSourceRef[];
}

export interface NearbyGrowthLanes {
  semanticLane: NearbyGrowthLaneItem[];
  lineageLane: NearbyGrowthLaneItem[];
  activeTensionLane: NearbyGrowthLaneItem[];
  humanLinkLane: NearbyGrowthLaneItem[];
  rejectedParallelLane: NearbyGrowthLaneItem[];
}

export interface NearbyGrowthPreviewItem {
  id: string;
  seedId: string;
  title: string;
  stage: string;
  summary: string;
  lanes: NearbyGrowthLanes;
  diversifiedResults: NearbyGrowthLaneItem[];
  safeSources: SafeSourceRef[];
  authorized: boolean;
}

export type GrowthPreviewUserAction = 'open' | 'add_to_packet' | 'ignore';
