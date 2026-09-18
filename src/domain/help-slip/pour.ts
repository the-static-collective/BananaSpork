import type {
  GardenHeldHelpCase,
  RequirementCampfireLink,
} from './types';
import type {
  CommandResult,
  OpenSharedNeedInput,
  OpenedSharedNeed,
} from '../jubilee/contracts';

export interface CampfireNeedCommand {
  title: string;
  summary: string;
  requestedItems: string[];
  unitLabel: string;
  targetUnits: number;
  visibility: 'circle';
}

export interface CampfirePourPreview {
  localCaseId: string;
  requirementId: string;
  circleId: string;
  circleLabel: string;
  command: CampfireNeedCommand;
  qualitativeQuantityNotice: boolean;
  omittedSourceFields: [
    'recipeId',
    'envelopeId',
    'payloadHash',
    'sourceSystem',
    'fullPurpose'
  ];
}

export interface LinkedConfirmationOccurrence {
  occurrenceRef: string;
  confirmedUnits: number;
}

export interface LinkedNeedConfirmation {
  needId: string;
  confirmedUnits: number;
  confirmationOccurrences?: readonly LinkedConfirmationOccurrence[];
}

export interface HelpSlipResidualProjection {
  requirementId: string;
  description: string;
  circleId?: string;
  authorityNeedId?: string;
  circleIds: string[];
  authorityNeedIds: string[];
  sourceQuantity?: number;
  sourceUnit?: string;
  confirmedUnits: number;
  confirmedUnitsExact: boolean;
  confirmationBasis:
    | 'none'
    | 'single-link'
    | 'deduplicated-occurrences'
    | 'ambiguous-multi-link-lower-bound';
  confirmedResidual?: number;
  excessConfirmedUnits: number;
  qualitativeResolved: boolean;
  shared: boolean;
  warnings: string[];
}

export function buildCampfirePourPreview(
  heldCase: GardenHeldHelpCase,
  requirementId: string,
  circle: { circleId: string; circleLabel: string }
): CampfirePourPreview {
  const requirement = heldCase.payload.requirements.find(
    (candidate) => candidate.id === requirementId
  );
  if (!requirement) throw new Error('HELP_SLIP_REQUIREMENT_NOT_FOUND');

  const quantitative = requirement.quantity !== undefined;
  const command: CampfireNeedCommand = {
    title: requirement.description,
    summary: requirement.description,
    requestedItems: [requirement.description],
    unitLabel: quantitative ? requirement.unit! : 'item',
    targetUnits: quantitative ? requirement.quantity! : 1,
    visibility: 'circle',
  };

  return {
    localCaseId: heldCase.localCaseId,
    requirementId,
    circleId: circle.circleId,
    circleLabel: circle.circleLabel,
    command,
    qualitativeQuantityNotice: !quantitative,
    omittedSourceFields: [
      'recipeId',
      'envelopeId',
      'payloadHash',
      'sourceSystem',
      'fullPurpose',
    ],
  };
}

function nearlyEqual(left: number, right: number): boolean {
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= Number.EPSILON * scale * 8;
}

function aggregateLinkedConfirmations(
  links: readonly RequirementCampfireLink[],
  needsById: ReadonlyMap<string, LinkedNeedConfirmation>
): {
  confirmedUnits: number;
  confirmedUnitsExact: boolean;
  confirmationBasis: HelpSlipResidualProjection['confirmationBasis'];
  warnings: string[];
} {
  if (links.length === 0) {
    return {
      confirmedUnits: 0,
      confirmedUnitsExact: true,
      confirmationBasis: 'none',
      warnings: [],
    };
  }

  const linkedNeeds = links
    .map((link) => needsById.get(link.authorityNeedId))
    .filter((need): need is LinkedNeedConfirmation => need !== undefined);

  if (links.length === 1) {
    return {
      confirmedUnits: linkedNeeds[0]?.confirmedUnits ?? 0,
      confirmedUnitsExact: true,
      confirmationBasis: 'single-link',
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const occurrences = new Map<string, number>();
  let occurrenceAccountingComplete = true;

  for (const need of linkedNeeds) {
    const refs = need.confirmationOccurrences ?? [];

    if (need.confirmedUnits > 0 && refs.length === 0) {
      occurrenceAccountingComplete = false;
      continue;
    }

    const occurrenceTotal = refs.reduce(
      (sum, occurrence) => sum + occurrence.confirmedUnits,
      0
    );
    if (!nearlyEqual(occurrenceTotal, need.confirmedUnits)) {
      occurrenceAccountingComplete = false;
      warnings.push(`CONFIRMATION_OCCURRENCE_TOTAL_MISMATCH:${need.needId}`);
    }

    for (const occurrence of refs) {
      const existing = occurrences.get(occurrence.occurrenceRef);
      if (existing !== undefined && !nearlyEqual(existing, occurrence.confirmedUnits)) {
        occurrenceAccountingComplete = false;
        warnings.push(
          `CONFLICTING_CONFIRMATION_OCCURRENCE:${occurrence.occurrenceRef}`
        );
        continue;
      }
      occurrences.set(occurrence.occurrenceRef, occurrence.confirmedUnits);
    }
  }

  if (occurrenceAccountingComplete) {
    return {
      confirmedUnits: Array.from(occurrences.values()).reduce(
        (sum, value) => sum + value,
        0
      ),
      confirmedUnitsExact: true,
      confirmationBasis: 'deduplicated-occurrences',
      warnings,
    };
  }

  warnings.push('MULTI_LINK_CONFIRMATION_AMBIGUOUS');
  return {
    confirmedUnits: linkedNeeds.reduce(
      (lowerBound, need) => Math.max(lowerBound, need.confirmedUnits),
      0
    ),
    confirmedUnitsExact: false,
    confirmationBasis: 'ambiguous-multi-link-lower-bound',
    warnings,
  };
}

export function projectHelpSlipResidual(
  heldCase: GardenHeldHelpCase,
  linkedNeeds: readonly LinkedNeedConfirmation[]
): HelpSlipResidualProjection[] {
  const needsById = new Map(linkedNeeds.map((need) => [need.needId, need] as const));

  return heldCase.payload.requirements.map((requirement) => {
    const links = heldCase.requirementLinks.filter(
      (candidate) => candidate.requirementId === requirement.id
    );
    const aggregation = aggregateLinkedConfirmations(links, needsById);
    const confirmedUnits = aggregation.confirmedUnits;
    const singleLink = links.length === 1 ? links[0] : undefined;

    if (requirement.quantity === undefined) {
      return {
        requirementId: requirement.id,
        description: requirement.description,
        ...(singleLink === undefined
          ? {}
          : {
              circleId: singleLink.circleId,
              authorityNeedId: singleLink.authorityNeedId,
            }),
        circleIds: links.map((link) => link.circleId),
        authorityNeedIds: links.map((link) => link.authorityNeedId),
        confirmedUnits,
        confirmedUnitsExact: aggregation.confirmedUnitsExact,
        confirmationBasis: aggregation.confirmationBasis,
        excessConfirmedUnits: 0,
        qualitativeResolved: confirmedUnits >= 1,
        shared: links.length > 0,
        warnings: aggregation.warnings,
      };
    }

    return {
      requirementId: requirement.id,
      description: requirement.description,
      ...(singleLink === undefined
        ? {}
        : {
            circleId: singleLink.circleId,
            authorityNeedId: singleLink.authorityNeedId,
          }),
      circleIds: links.map((link) => link.circleId),
      authorityNeedIds: links.map((link) => link.authorityNeedId),
      sourceQuantity: requirement.quantity,
      sourceUnit: requirement.unit,
      confirmedUnits,
      confirmedUnitsExact: aggregation.confirmedUnitsExact,
      confirmationBasis: aggregation.confirmationBasis,
      confirmedResidual: Math.max(requirement.quantity - confirmedUnits, 0),
      excessConfirmedUnits: Math.max(confirmedUnits - requirement.quantity, 0),
      qualitativeResolved: false,
      shared: links.length > 0,
      warnings: aggregation.warnings,
    };
  });
}

export type PourHeldRequirementResult =
  | { status: 'shared'; link: RequirementCampfireLink }
  | { status: 'authority_failed'; error: string }
  | { status: 'shared_refresh_failed'; link: RequirementCampfireLink; error: string }
  | { status: 'already_shared'; link: RequirementCampfireLink };

export async function pourHeldRequirement(args: {
  heldCase: GardenHeldHelpCase;
  preview: CampfirePourPreview;
  openSharedNeed: (
    input: OpenSharedNeedInput
  ) => Promise<CommandResult<OpenedSharedNeed>>;
  addRequirementLink: (link: RequirementCampfireLink) => void;
  refreshSharedState: () => Promise<void>;
  now: () => string;
}): Promise<PourHeldRequirementResult> {
  const existing = args.heldCase.requirementLinks.find(
    (candidate) =>
      candidate.requirementId === args.preview.requirementId &&
      candidate.circleId === args.preview.circleId
  );

  if (existing) {
    return { status: 'already_shared', link: existing };
  }

  const authorityResult = await args.openSharedNeed(args.preview.command);
  if (!authorityResult.success || !authorityResult.data?.authorityNeedId) {
    return {
      status: 'authority_failed',
      error: authorityResult.error || 'Shared need authority command failed.',
    };
  }

  const link: RequirementCampfireLink = {
    localCaseId: args.heldCase.localCaseId,
    requirementId: args.preview.requirementId,
    payloadHash: args.heldCase.payloadHash,
    circleId: args.preview.circleId,
    authorityNeedId: authorityResult.data.authorityNeedId,
    pouredAt: args.now(),
    ...(authorityResult.witnessReceipt?.id
      ? { witnessReceiptId: authorityResult.witnessReceipt.id }
      : {}),
  };

  args.addRequirementLink(link);

  try {
    await args.refreshSharedState();
    return { status: 'shared', link };
  } catch (error: unknown) {
    return {
      status: 'shared_refresh_failed',
      link,
      error: error instanceof Error ? error.message : 'Shared status refresh failed.',
    };
  }
}

export function describeHeldHelpCase(
  heldCase: GardenHeldHelpCase,
  linkedNeeds: readonly LinkedNeedConfirmation[],
  sharedState: 'current' | 'stale' | 'unavailable'
): {
  truthLabel: 'Held on this device' | 'Shared to Campfire';
  sharingLabel:
    | 'Not shared'
    | 'Awaiting receipt confirmation'
    | 'Partially confirmed'
    | 'Shared portion confirmed'
    | 'Source request confirmed'
    | 'Shared status unavailable / stale';
  occurrenceCount: number;
} {
  if (heldCase.requirementLinks.length === 0) {
    return {
      truthLabel: 'Held on this device',
      sharingLabel: 'Not shared',
      occurrenceCount: heldCase.arrivals.length,
    };
  }

  if (sharedState !== 'current') {
    return {
      truthLabel: 'Shared to Campfire',
      sharingLabel: 'Shared status unavailable / stale',
      occurrenceCount: heldCase.arrivals.length,
    };
  }

  const residuals = projectHelpSlipResidual(heldCase, linkedNeeds);
  const sharedResiduals = residuals.filter((residual) => residual.shared);
  const anyConfirmed = sharedResiduals.some(
    (residual) => residual.confirmedUnits > 0 || residual.qualitativeResolved
  );
  const allSharedResolved = sharedResiduals.every((residual) =>
    residual.sourceQuantity === undefined
      ? residual.qualitativeResolved
      : residual.confirmedResidual === 0
  );
  const allRequirementsShared = residuals.every((residual) => residual.shared);

  return {
    truthLabel: 'Shared to Campfire',
    sharingLabel:
      allSharedResolved && allRequirementsShared
        ? 'Source request confirmed'
        : allSharedResolved
          ? 'Shared portion confirmed'
          : anyConfirmed
            ? 'Partially confirmed'
            : 'Awaiting receipt confirmation',
    occurrenceCount: heldCase.arrivals.length,
  };
}
