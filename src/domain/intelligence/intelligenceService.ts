import { BasketOffer, ParticipationSeed, WitnessReceipt } from '../../types';
import { DonkeyHeldNote } from '../donkey/types';
import {
  DeterministicChangeItem,
  GentleMatchCandidate,
  NearbyGrowthLaneItem,
  NearbyGrowthLanes,
  NearbyGrowthPreviewItem,
  SafeSourceRef,
  StructuralEvidence,
  WhatChangedReport,
  WhatChangedSummaryItem,
} from './types';

/**
 * Utility: Filter out any private held Donkey drafts from any context array.
 * Private held notes are strictly device-local communication drafts and must never
 * enter shared retrieval, model prompts, lineage packets, or growth lanes.
 */
export function sanitizeContextWithoutHeldNotes<T>(
  items: T[],
  heldNotes: DonkeyHeldNote[] = []
): T[] {
  if (!heldNotes || heldNotes.length === 0) return items;
  const heldTextSet = new Set(
    heldNotes.flatMap((n) => [n.draft.toLowerCase(), n.holdNote.toLowerCase()])
  );

  return items.filter((item: any) => {
    const text = typeof item === 'string' ? item : JSON.stringify(item);
    for (const heldText of heldTextSet) {
      if (heldText.length > 3 && text.toLowerCase().includes(heldText)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * 1. WHAT CHANGED? - Scope-first, deterministic event change list & optional summary
 */
export function buildDeterministicChangeList(
  receipts: WitnessReceipt[],
  userScopeCircleId?: string,
  authorizedCircleId?: string
): DeterministicChangeItem[] {
  // Scope authorization boundary check
  const isAuthorized =
    !userScopeCircleId || !authorizedCircleId || userScopeCircleId === authorizedCircleId;

  if (!isAuthorized) {
    return [];
  }

  return receipts
    .slice()
    .sort((a, b) => (b.sequence || 0) - (a.sequence || 0))
    .map((r) => {
      const sourceRef: SafeSourceRef = {
        eventId: r.id,
        openable: true,
        display: 'available',
      };

      return {
        id: r.id,
        sequence: r.sequence,
        eventType: r.eventType,
        title: r.title,
        actorName: r.actorName, // Actor attribution
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
  rawSummaryClaims?: { claim: string; sourceId: string }[],
  heldNotes: DonkeyHeldNote[] = []
): WhatChangedReport {
  // Ensure held Donkey notes are NEVER passed into change reports
  const sanitizedReceipts = sanitizeContextWithoutHeldNotes(receipts, heldNotes);

  const deterministicChanges = buildDeterministicChangeList(
    sanitizedReceipts,
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
    // Sanity check: ensure claim text doesn't match private held notes
    const isHeldLeak = heldNotes.some(
      (n) => n.draft && raw.claim.toLowerCase().includes(n.draft.toLowerCase())
    );
    if (isHeldLeak) {
      droppedAny = true;
      return;
    }

    const matchedReceipt = accessibleReceiptMap.get(raw.sourceId);
    if (matchedReceipt && matchedReceipt.sourceRef.display === 'available') {
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
  offers: BasketOffer[],
  heldNotes: DonkeyHeldNote[] = []
): GentleMatchCandidate[] {
  const sanitizedOffers = sanitizeContextWithoutHeldNotes(offers, heldNotes);
  const candidates: GentleMatchCandidate[] = [];

  for (const seed of seeds) {
    for (const need of seed.needs) {
      if (need.status !== 'open') continue;

      for (const offer of sanitizedOffers) {
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

        const explicitEvidence: string[] = [];
        if (categoryMatch) explicitEvidence.push(`Category match: ${offer.category}`);
        if (boundaryMatch) explicitEvidence.push(`Boundary scope: ${offer.boundary}`);
        if (availabilityMatch) explicitEvidence.push(`Availability: ${offer.availability}`);
        if (matchedFields.length > 0) explicitEvidence.push(`Matched keywords: ${matchedFields.join(', ')}`);

        // Standalone Basket offer labeling
        const isStandaloneProposedOffer = !offer.id.startsWith('rpc-pledged-');

        // Semantic interpretation (labeled separately!)
        let semanticInterpretation: string | undefined;
        let confidence: 'High' | 'Moderate' | 'Exploratory' = 'Exploratory';

        if (categoryMatch && (matchedFields.length > 0 || availabilityMatch)) {
          confidence = 'High';
          semanticInterpretation = `Offer "${offer.title}" directly matches open need "${need.title}" under ${offer.category} category.`;
        } else if (categoryMatch || matchedFields.length > 0) {
          confidence = 'Moderate';
          semanticInterpretation = `Shared offer "${offer.title}" presents possible support for need "${need.title}".`;
        } else {
          semanticInterpretation = `Potential neighbor care match based on complementary community capacity.`;
        }

        const sourceRef: SafeSourceRef = {
          eventId: offer.id,
          openable: true,
          display: 'available',
        };

        candidates.push({
          id: `match-${seed.id}-${need.id}-${offer.id}`,
          needId: need.id,
          needTitle: need.title,
          seedId: seed.id,
          offerId: offer.id,
          offerTitle: offer.title,
          contributorName: offer.contributorName,
          isStandaloneProposedOffer,
          structuralEvidence,
          semanticInterpretation,
          confidence,
          primaryLane: matchedFields.length > 0 ? 'active_tension' : 'semantic',
          classification: matchedFields.length > 0 ? 'deterministic' : 'model_interpretation',
          explicitEvidence,
          sourceRef,
        });
      }
    }
  }

  return candidates;
}

/**
 * 3. NEARBY GROWTH PREVIEW - Scope authorization first, compute 5 explicit lanes
 */
export function computeNearbyGrowthPreview(
  seed: ParticipationSeed,
  receipts: WitnessReceipt[],
  offers: BasketOffer[],
  userScopeCircleId?: string,
  authorizedCircleId?: string,
  heldNotes: DonkeyHeldNote[] = []
): NearbyGrowthPreviewItem {
  // Authorization check FIRST
  const isAuthorized =
    !userScopeCircleId || !authorizedCircleId || userScopeCircleId === authorizedCircleId;

  // Sanitize input to exclude private held notes completely
  const sanitizedReceipts = sanitizeContextWithoutHeldNotes(receipts, heldNotes);
  const sanitizedOffers = sanitizeContextWithoutHeldNotes(offers, heldNotes);

  if (!isAuthorized) {
    // Return redacted/unavailable sources preserving existence without content
    const redactedSources: SafeSourceRef[] = [
      {
        eventId: `redacted-${seed.id}`,
        openable: false,
        display: 'redacted',
      },
    ];

    return {
      id: `growth-${seed.id}`,
      seedId: seed.id,
      title: 'Restricted Circle Seed',
      stage: seed.stage,
      summary: 'Content redacted due to cross-circle scope boundary.',
      lanes: {
        semanticLane: [],
        lineageLane: [],
        activeTensionLane: [],
        humanLinkLane: [],
        rejectedParallelLane: [],
      },
      diversifiedResults: [],
      safeSources: redactedSources,
      authorized: false,
    };
  }

  const safeSources: SafeSourceRef[] = [];

  // LANE 1: Semantic Lane (Model-interpreted suggestions & semantic connections)
  const semanticLane: NearbyGrowthLaneItem[] = [
    {
      id: `sem-${seed.id}-1`,
      title: `Care grafting for ${seed.title}`,
      details: `Evaluate grafting neighbor care offers under ${seed.makesPossible.join(', ')}`,
      primaryLane: 'semantic',
      classification: 'model_interpretation',
      explicitEvidence: [
        `Grafting analysis based on ${seed.needs.length} open need(s)`,
        `Target categories: ${seed.makesPossible.join(', ')}`,
      ],
      safeSources: [
        {
          eventId: seed.id,
          openable: true,
          display: 'available',
        },
      ],
    },
  ];

  // LANE 2: Lineage Lane (Parent seeds, historical receipts)
  const lineageLane: NearbyGrowthLaneItem[] = sanitizedReceipts
    .filter((r) => r.details.includes(seed.title) || r.title.includes(seed.title))
    .map((r) => {
      const ref: SafeSourceRef = {
        eventId: r.id,
        openable: true,
        display: 'available',
      };
      safeSources.push(ref);

      return {
        id: `lin-${r.id}`,
        title: r.title,
        details: `${r.actorName}: ${r.details}`,
        primaryLane: 'lineage',
        classification: 'deterministic',
        explicitEvidence: [
          `Event seq #${r.sequence}`,
          `Hash: ${r.sha256Hash.substring(0, 10)}...`,
          `EventType: ${r.eventType}`,
        ],
        safeSources: [ref],
      };
    });

  // LANE 3: Active Tension Lane (Open needs, pledged items)
  const activeTensionLane: NearbyGrowthLaneItem[] = seed.needs.map((nd) => {
    const ref: SafeSourceRef = {
      eventId: nd.id,
      openable: true,
      display: 'available',
    };
    safeSources.push(ref);

    return {
      id: `tension-${nd.id}`,
      title: nd.title,
      details: `Need status: ${nd.status} in category ${nd.category}`,
      primaryLane: 'active_tension',
      classification: 'deterministic',
      explicitEvidence: [
        `Need ID: ${nd.id}`,
        `Status: ${nd.status}`,
        `Category: ${nd.category}`,
      ],
      safeSources: [ref],
    };
  });

  // LANE 4: Human Link Lane (Author, contributors, actor attributions)
  const humanAuthorRef: SafeSourceRef = {
    eventId: seed.id,
    openable: true,
    display: 'available',
  };
  safeSources.push(humanAuthorRef);

  const humanLinkLane: NearbyGrowthLaneItem[] = [
    {
      id: `human-${seed.id}`,
      title: seed.authorName,
      details: `Seed Author / Household Attribution`,
      primaryLane: 'human_link',
      classification: 'deterministic',
      explicitEvidence: [
        `Author attribution: ${seed.authorName}`,
        `Role: Household Member`,
      ],
      safeSources: [humanAuthorRef],
    },
  ];

  // LANE 5: Rejected Parallel Lane
  // RULE: MUST contain ONLY explicit rejected, declined, composted, abandoned, or closed branches
  // supported by accessible domain evidence (e.g. offer.declined or need.closed events).
  // NEVER infer rejection from inactivity or private held notes!
  const rejectedParallelLane: NearbyGrowthLaneItem[] = sanitizedReceipts
    .filter(
      (r) =>
        r.eventType === 'offer.declined' ||
        r.eventType === 'need.closed' ||
        r.details.toLowerCase().includes('declined') ||
        r.details.toLowerCase().includes('closed')
    )
    .map((r) => {
      const ref: SafeSourceRef = {
        eventId: r.id,
        openable: true,
        display: 'available',
      };
      safeSources.push(ref);

      return {
        id: `rej-${r.id}`,
        title: r.title,
        details: `Explicitly set aside: ${r.details}`,
        primaryLane: 'rejected_parallel',
        classification: 'deterministic',
        explicitEvidence: [
          `Explicit domain event: ${r.eventType}`,
          `Reason / Note: ${r.details}`,
        ],
        safeSources: [ref],
      };
    });

  // PRIMARY LANE DIVERSIFICATION: Pick top item from each non-empty lane
  const diversifiedResults: NearbyGrowthLaneItem[] = [];
  if (semanticLane.length > 0) diversifiedResults.push(semanticLane[0]);
  if (lineageLane.length > 0) diversifiedResults.push(lineageLane[0]);
  if (activeTensionLane.length > 0) diversifiedResults.push(activeTensionLane[0]);
  if (humanLinkLane.length > 0) diversifiedResults.push(humanLinkLane[0]);
  if (rejectedParallelLane.length > 0) diversifiedResults.push(rejectedParallelLane[0]);

  const allLanes: NearbyGrowthLanes = {
    semanticLane,
    lineageLane,
    activeTensionLane,
    humanLinkLane,
    rejectedParallelLane,
  };

  return {
    id: `growth-${seed.id}`,
    seedId: seed.id,
    title: seed.title,
    stage: seed.stage,
    summary: seed.description,
    lanes: allLanes,
    diversifiedResults,
    safeSources,
    authorized: true,
  };
}
