import type { NeedProjection } from '../../lib/circle';
import type { GardenHeldHelpCase } from './types';

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
  linkedNeeds: readonly NeedProjection[]
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
        qualitativeResolved: Boolean(need && need.confirmedUnits >= need.targetUnits),
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
