export interface SafeSourceRef {
  sourceId: string;
  sourceType: 'receipt' | 'need' | 'offer' | 'proposal' | 'held_note' | 'seed';
  title: string;
  sequence?: number;
  accessible: boolean;
}

export interface DeterministicChangeItem {
  id: string;
  sequence: number;
  eventType: string;
  title: string;
  actorName: string;
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
  structuralEvidence: StructuralEvidence;
  semanticInterpretation?: string;
  confidence: 'High' | 'Moderate' | 'Exploratory';
  sourceRef: SafeSourceRef;
}

export interface NearbyGrowthLanes {
  lineageLane: {
    id: string;
    title: string;
    type: string;
    sourceRef: SafeSourceRef;
  }[];
  activeTensionLane: {
    id: string;
    title: string;
    type: string;
    sourceRef: SafeSourceRef;
  }[];
  humanLinkLane: {
    id: string;
    name: string;
    role: string;
    sourceRef: SafeSourceRef;
  }[];
  rejectedParallelLane: {
    id: string;
    title: string;
    reason: string;
    sourceRef: SafeSourceRef;
  }[];
}

export interface NearbyGrowthPreviewItem {
  id: string;
  seedId: string;
  title: string;
  stage: string;
  summary: string;
  lanes: NearbyGrowthLanes;
  semanticSuggestions?: string[];
  safeSources: SafeSourceRef[];
  authorized: boolean;
}

export type GrowthPreviewUserAction = 'open' | 'add_to_packet' | 'ignore';
