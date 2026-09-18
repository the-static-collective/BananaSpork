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

export interface LinkedNeedConfirmation {
  needId: string;
  confirmedUnits: number;
}

export interface HelpSlipResidualProjection {
  requirementId: string;
  description: string;
  circleId?: string;
  authorityNeedId?: string;
  sourceQuantity?: number;
  sourceUnit?: string;
  confirmedUnits: number;
  confirmedResidual?: number;
  qualitativeResolved: boolean;
  shared: boolean;
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

export function projectHelpSlipResidual(
  heldCase: GardenHeldHelpCase,
  linkedNeeds: readonly LinkedNeedConfirmation[]
): HelpSlipResidualProjection[] {
  const needsById = new Map(linkedNeeds.map((need) => [need.needId, need] as const));

  return heldCase.payload.requirements.map((requirement) => {
    const link = heldCase.requirementLinks.find(
      (candidate) => candidate.requirementId === requirement.id
    );
    const need = link ? needsById.get(link.authorityNeedId) : undefined;
    const confirmedUnits = need?.confirmedUnits ?? 0;

    if (requirement.quantity === undefined) {
      return {
        requirementId: requirement.id,
        description: requirement.description,
        ...(link === undefined
          ? {}
          : {
              circleId: link.circleId,
              authorityNeedId: link.authorityNeedId,
            }),
        confirmedUnits,
        qualitativeResolved: Boolean(need && need.confirmedUnits >= 1),
        shared: link !== undefined,
      };
    }

    return {
      requirementId: requirement.id,
      description: requirement.description,
      ...(link === undefined
        ? {}
        : {
            circleId: link.circleId,
            authorityNeedId: link.authorityNeedId,
          }),
      sourceQuantity: requirement.quantity,
      sourceUnit: requirement.unit,
      confirmedUnits,
      confirmedResidual: Math.max(requirement.quantity - confirmedUnits, 0),
      qualitativeResolved: false,
      shared: link !== undefined,
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
    | 'Receipt confirmed'
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

  const needsById = new Map(linkedNeeds.map((need) => [need.needId, need] as const));
  let anyConfirmed = false;
  let allConfirmed = true;

  for (const link of heldCase.requirementLinks) {
    const requirement = heldCase.payload.requirements.find(
      (candidate) => candidate.id === link.requirementId
    );
    const confirmation = needsById.get(link.authorityNeedId);
    const confirmed = confirmation?.confirmedUnits ?? 0;

    if (confirmed > 0) anyConfirmed = true;

    if (requirement?.quantity !== undefined) {
      if (confirmed < requirement.quantity) allConfirmed = false;
    } else if (confirmed < 1) {
      allConfirmed = false;
    }
  }

  return {
    truthLabel: 'Shared to Campfire',
    sharingLabel: allConfirmed
      ? 'Receipt confirmed'
      : anyConfirmed
        ? 'Partially confirmed'
        : 'Awaiting receipt confirmation',
    occurrenceCount: heldCase.arrivals.length,
  };
}
