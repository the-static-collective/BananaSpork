import { sha256Hex } from '../hashes';
import type {
  FulfillmentRequirementV0,
  HelpSlipAdmission,
  ImportedFulfillmentEnvelopeV0,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = []
): boolean {
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
}

export function serializeFulfillmentEnvelopeV0(
  payload: ImportedFulfillmentEnvelopeV0
): string {
  return JSON.stringify({
    schema: payload.schema,
    envelopeId: payload.envelopeId,
    purpose: payload.purpose,
    createdAt: payload.createdAt,
    requirements: payload.requirements.map((requirement) => ({
      id: requirement.id,
      kind: requirement.kind,
      description: requirement.description,
      ...(requirement.quantity === undefined ? {} : { quantity: requirement.quantity }),
      ...(requirement.unit === undefined ? {} : { unit: requirement.unit }),
      ...(requirement.neededBy === undefined ? {} : { neededBy: requirement.neededBy }),
    })),
    source: {
      system: payload.source.system,
      ...(payload.source.recipeId === undefined ? {} : { recipeId: payload.source.recipeId }),
    },
    disclosure: {
      includesOnlySelectedResiduals: payload.disclosure.includesOnlySelectedResiduals,
      omittedPrivateContext: payload.disclosure.omittedPrivateContext,
    },
    status: payload.status,
  });
}

export function admitHelpSlipCarrier(rawText: string): HelpSlipAdmission {
  const carrierHash = sha256Hex(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { disposition: 'refused', carrierHash, reason: 'INVALID_JSON' };
  }

  if (!isRecord(parsed)) {
    return { disposition: 'refused', carrierHash, reason: 'INVALID_SHAPE' };
  }

  if (parsed.schema !== 'fulfillment-envelope/v0') {
    return { disposition: 'refused', carrierHash, reason: 'UNSUPPORTED_SCHEMA' };
  }

  if (!hasOnlyKeys(
    parsed,
    ['schema', 'envelopeId', 'purpose', 'createdAt', 'requirements', 'source', 'disclosure', 'status']
  )) {
    return { disposition: 'refused', carrierHash, reason: 'INVALID_SHAPE' };
  }

  if (!isNonEmptyString(parsed.envelopeId)) {
    return { disposition: 'refused', carrierHash, reason: 'MISSING_ENVELOPE_ID' };
  }

  if (
    !isNonEmptyString(parsed.purpose) ||
    !isNonEmptyString(parsed.createdAt) ||
    !Array.isArray(parsed.requirements) ||
    !isRecord(parsed.source) ||
    !isRecord(parsed.disclosure)
  ) {
    return { disposition: 'refused', carrierHash, reason: 'INVALID_SHAPE' };
  }

  if (parsed.status !== 'unmet') {
    return { disposition: 'refused', carrierHash, reason: 'UNSUPPORTED_SOURCE_STATUS' };
  }

  if (
    !hasOnlyKeys(parsed.disclosure, ['includesOnlySelectedResiduals', 'omittedPrivateContext']) ||
    parsed.disclosure.includesOnlySelectedResiduals !== true ||
    parsed.disclosure.omittedPrivateContext !== true
  ) {
    return { disposition: 'refused', carrierHash, reason: 'INVALID_DISCLOSURE' };
  }

  const sourceSystem = parsed.source.system;
  const sourceRecipeId = parsed.source.recipeId;
  if (
    !hasOnlyKeys(parsed.source, ['system'], ['recipeId']) ||
    !isNonEmptyString(sourceSystem) ||
    (sourceRecipeId !== undefined && !isNonEmptyString(sourceRecipeId))
  ) {
    return { disposition: 'refused', carrierHash, reason: 'INVALID_SHAPE' };
  }

  if (parsed.requirements.length === 0) {
    return { disposition: 'refused', carrierHash, reason: 'EMPTY_REQUIREMENTS' };
  }

  const requirements: FulfillmentRequirementV0[] = [];
  for (const value of parsed.requirements) {
    if (
      !isRecord(value) ||
      !hasOnlyKeys(value, ['id', 'kind', 'description'], ['quantity', 'unit', 'neededBy']) ||
      !isNonEmptyString(value.id) ||
      !isNonEmptyString(value.kind) ||
      !isNonEmptyString(value.description)
    ) {
      return { disposition: 'refused', carrierHash, reason: 'INVALID_REQUIREMENT' };
    }

    const quantity = value.quantity;
    const unit = value.unit;
    const neededBy = value.neededBy;

    if (quantity !== undefined && !isPositiveFiniteNumber(quantity)) {
      return { disposition: 'refused', carrierHash, reason: 'INVALID_QUANTITY' };
    }

    if (quantity !== undefined && !isNonEmptyString(unit)) {
      return { disposition: 'refused', carrierHash, reason: 'QUANTITY_WITHOUT_UNIT' };
    }

    if (quantity === undefined && unit !== undefined) {
      return { disposition: 'refused', carrierHash, reason: 'INVALID_REQUIREMENT' };
    }

    if (unit !== undefined && !isNonEmptyString(unit)) {
      return { disposition: 'refused', carrierHash, reason: 'INVALID_REQUIREMENT' };
    }

    if (neededBy !== undefined && !isNonEmptyString(neededBy)) {
      return { disposition: 'refused', carrierHash, reason: 'INVALID_REQUIREMENT' };
    }

    const requirement: FulfillmentRequirementV0 = {
      id: value.id,
      kind: value.kind,
      description: value.description,
    };
    if (quantity !== undefined) requirement.quantity = quantity as number;
    if (unit !== undefined) requirement.unit = unit as string;
    if (neededBy !== undefined) requirement.neededBy = neededBy as string;
    requirements.push(requirement);
  }

  const payload: ImportedFulfillmentEnvelopeV0 = {
    schema: 'fulfillment-envelope/v0',
    envelopeId: parsed.envelopeId,
    purpose: parsed.purpose,
    createdAt: parsed.createdAt,
    requirements,
    source: {
      system: sourceSystem as string,
      ...(sourceRecipeId === undefined ? {} : { recipeId: sourceRecipeId as string }),
    },
    disclosure: {
      includesOnlySelectedResiduals: true,
      omittedPrivateContext: true,
    },
    status: 'unmet',
  };

  const canonicalPayload = serializeFulfillmentEnvelopeV0(payload);
  return {
    disposition: 'admitted',
    carrierHash,
    payloadHash: sha256Hex(canonicalPayload),
    canonicalPayload,
    payload,
  };
}
