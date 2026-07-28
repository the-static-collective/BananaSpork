import { BasketOffer, ParticipationSeed, WitnessReceipt } from '../../types';
import {
  DeterministicChangeItem,
  GentleMatchCandidate,
  NearbyGrowthLanes,
  NearbyGrowthPreviewItem,
  SafeSourceRef,
  StructuralEvidence,
  WhatChangedReport,
  WhatChangedSummaryItem,
} from './types';

/**
 * 1. WHAT CHANGED? - Scope-first, deterministic event change list & optional summary
 */
export function buildDeterministicChangeList(
  receipts: WitnessReceipt[],
  userScopeCircleId?: string,
  authorizedCircleId?: string
): DeterministicChangeItem[] {
  // Authorization boundary check
  if (userScopeCircleId && authorizedCircleId && userScopeCircleId !== authorizedCircleId) {
    return [];
  }

  return receipts
    .slice()
    .sort((a, b) => (b.sequence || 0) - (a.sequence || 0))
    .map((r) => {
      const sourceRef: SafeSourceRef = {
        sourceId: r.id,
        sourceType: 'receipt',
        title: r.title,
        sequence: r.sequence,
        accessible: true,
      };

      return {
        id: r.id,
        sequence: r.sequence,
        eventType: r.eventType,
        title: r.title,
        actorName: r.actorName,
        timestamp: r.timestamp,
        details: r.details,
        sha256Hash: r.sha256Hash,
        sourceRef,
      };
    });
}

/**
 * Generate What Changed Report (Deterministic + Optional AI summary with strict source validation)
 */
export function buildWhatChangedReport(
  receipts: WitnessReceipt[],
  userScopeCircleId?: string,
  authorizedCircleId?: string,
  rawSummaryClaims?: { claim: string; sourceId: string }[]
): WhatChangedReport {
  const deterministicChanges = buildDeterministicChangeList(
    receipts,
    userScopeCircleId,
    authorizedCircleId
  );

  if (!rawSummaryClaims || rawSummaryClaims.length === 0) {
    return {
      deterministicChanges,
      aiSummary: null,
      hasUnbackedClaimsDropped: false,
    };
  }

  // Filter raw claims: "no source means no factual claim"
  const validClaims: WhatChangedSummaryItem[] = [];
  let droppedAny = false;

  const accessibleReceiptMap = new Map<string, DeterministicChangeItem>();
  deterministicChanges.forEach((c) => accessibleReceiptMap.set(c.id, c));

  rawSummaryClaims.forEach((raw, idx) => {
    const matchedReceipt = accessibleReceiptMap.get(raw.sourceId);
    if (matchedReceipt && matchedReceipt.sourceRef.accessible) {
      validClaims.push({
        id: `summary-claim-${idx}-${matchedReceipt.id}`,
        claim: raw.claim.trim(),
        sourceRef: matchedReceipt.sourceRef,
      });
    } else {
      droppedAny = true;
    }
  });

  return {
    deterministicChanges,
    aiSummary: validClaims,
    hasUnbackedClaimsDropped: droppedAny,
  };
}

/**
 * 2. GENTLE MATCHING - Surface Basket offers that may answer an open need
 */
export function computeGentleMatches(
  seeds: ParticipationSeed[],
  offers: BasketOffer[]
): GentleMatchCandidate[] {
  const candidates: GentleMatchCandidate[] = [];

  for (const seed of seeds) {
    for (const need of seed.needs) {
      if (need.status !== 'open') continue;

      for (const offer of offers) {
        // Evaluate structural evidence
        const categoryMatch =
          need.category?.toLowerCase() === offer.category?.toLowerCase() ||
          offer.category === 'Care' ||
          need.category === 'Care';

        const boundaryMatch = offer.boundary === 'Circle' || offer.boundary === 'Local';
        const availabilityMatch =
          offer.availability?.toLowerCase().includes('immediate') ||
          offer.availability?.toLowerCase().includes('today') ||
          offer.availability?.toLowerCase().includes('open') ||
          offer.availability?.toLowerCase().includes('this week');

        const needWords = need.title.toLowerCase().split(/\s+/);
        const offerWords = offer.title.toLowerCase().split(/\s+/);
        const matchedFields = needWords.filter(
          (w) => w.length > 3 && offerWords.some((ow) => ow.includes(w))
        );

        const structuralEvidence: StructuralEvidence = {
          categoryMatch,
          boundaryMatch,
          availabilityMatch,
          matchedFields,
        };

        // Semantic interpretation (labeled separately!)
        let semanticInterpretation: string | undefined;
        let confidence: 'High' | 'Moderate' | 'Exploratory' = 'Exploratory';

        if (categoryMatch && (matchedFields.length > 0 || availabilityMatch)) {
          confidence = 'High';
          semanticInterpretation = `Offer "${offer.title}" directly matches open need "${need.title}" under ${offer.category} category and ${offer.boundary} boundary.`;
        } else if (categoryMatch || matchedFields.length > 0) {
          confidence = 'Moderate';
          semanticInterpretation = `Shared offer "${offer.title}" presents possible support for need "${need.title}".`;
        } else {
          semanticInterpretation = `Potential neighbor care match based on complementary community capacity.`;
        }

        const sourceRef: SafeSourceRef = {
          sourceId: offer.id,
          sourceType: 'offer',
          title: offer.title,
          accessible: true,
        };

        candidates.push({
          id: `match-${seed.id}-${need.id}-${offer.id}`,
          needId: need.id,
          needTitle: need.title,
          seedId: seed.id,
          offerId: offer.id,
          offerTitle: offer.title,
          contributorName: offer.contributorName,
          structuralEvidence,
          semanticInterpretation,
          confidence,
          sourceRef,
        });
      }
    }
  }

  return candidates;
}

/**
 * 3. NEARBY GROWTH PREVIEW - Scope authorization first, compute 4 lanes before semantic search
 */
export function computeNearbyGrowthPreview(
  seed: ParticipationSeed,
  receipts: WitnessReceipt[],
  offers: BasketOffer[],
  userScopeCircleId?: string,
  authorizedCircleId?: string
): NearbyGrowthPreviewItem {
  // Authorization check FIRST
  const isAuthorized = !userScopeCircleId || !authorizedCircleId || userScopeCircleId === authorizedCircleId;

  if (!isAuthorized) {
    return {
      id: `growth-${seed.id}`,
      seedId: seed.id,
      title: seed.title,
      stage: seed.stage,
      summary: seed.description,
      lanes: {
        lineageLane: [],
        activeTensionLane: [],
        humanLinkLane: [],
        rejectedParallelLane: [],
      },
      safeSources: [],
      authorized: false,
    };
  }

  const safeSources: SafeSourceRef[] = [];

  // LANE 1: Lineage Lane (Parent seeds, historical receipts)
  const lineageLane = receipts
    .filter((r) => r.details.includes(seed.title) || r.title.includes(seed.title))
    .map((r) => {
      const ref: SafeSourceRef = {
        sourceId: r.id,
        sourceType: 'receipt',
        title: r.title,
        sequence: r.sequence,
        accessible: true,
      };
      safeSources.push(ref);
      return {
        id: `lin-${r.id}`,
        title: r.title,
        type: r.eventType,
        sourceRef: ref,
      };
    });

  // LANE 2: Active Tension Lane (Open needs, pledged items)
  const activeTensionLane = seed.needs.map((nd) => {
    const ref: SafeSourceRef = {
      sourceId: nd.id,
      sourceType: 'need',
      title: nd.title,
      accessible: true,
    };
    safeSources.push(ref);
    return {
      id: `tension-${nd.id}`,
      title: nd.title,
      type: nd.status,
      sourceRef: ref,
    };
  });

  // LANE 3: Human Link Lane (Author, contributors)
  const humanLinkLane = [
    {
      id: `human-author-${seed.id}`,
      name: seed.authorName,
      role: 'Seed Author / Household',
      sourceRef: {
        sourceId: seed.id,
        sourceType: 'seed' as const,
        title: seed.title,
        accessible: true,
      },
    },
  ];

  // LANE 4: Rejected Parallel Lane (Declined or closed parallel items)
  const rejectedParallelLane: {
    id: string;
    title: string;
    reason: string;
    sourceRef: SafeSourceRef;
  }[] = [];

  // Semantic Suggestions (Evaluated ONLY after the 4 lanes above are constructed)
  const semanticSuggestions: string[] = [
    `Consider grafting a care offer for "${seed.title}" to expand community capacity.`,
    `Review open needs in "${seed.title}" during upcoming household check-in.`,
  ];

  return {
    id: `growth-${seed.id}`,
    seedId: seed.id,
    title: seed.title,
    stage: seed.stage,
    summary: seed.description,
    lanes: {
      lineageLane,
      activeTensionLane,
      humanLinkLane,
      rejectedParallelLane,
    },
    semanticSuggestions,
    safeSources,
    authorized: true,
  };
}
