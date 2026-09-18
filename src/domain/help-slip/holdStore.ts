import { admitHelpSlipCarrier } from './envelope';
import type {
  GardenHeldHelpCase,
  HelpSlipArrival,
  HelpSlipRefusalReason,
  RequirementCampfireLink,
} from './types';

export interface HelpSlipStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const HELP_SLIP_HOLD_STORAGE_KEY = 'bananagram_help_slip_holds_v1';

export type HelpSlipHoldResult =
  | {
      disposition: 'held';
      caseCreated: boolean;
      heldCase: GardenHeldHelpCase;
    }
  | {
      disposition: 'refused';
      reason: HelpSlipRefusalReason;
      carrierHash: string;
    };

class MemoryHelpSlipStorage implements HelpSlipStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const fallbackStorage = new MemoryHelpSlipStorage();

function defaultStorage(): HelpSlipStorage {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Fall through to session-memory storage.
  }
  return fallbackStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function cloneCase(value: GardenHeldHelpCase): GardenHeldHelpCase {
  return JSON.parse(JSON.stringify(value)) as GardenHeldHelpCase;
}

export class HelpSlipHoldStore {
  constructor(private readonly storage: HelpSlipStorage = defaultStorage()) {}

  holdImportedHelpSlip(
    rawText: string,
    metadata: { occurrenceId: string; receivedAt: string }
  ): HelpSlipHoldResult {
    if (!isNonEmptyString(metadata.occurrenceId) || !isNonEmptyString(metadata.receivedAt)) {
      throw new Error('INVALID_HELP_SLIP_ARRIVAL');
    }

    const admission = admitHelpSlipCarrier(rawText);
    if (admission.disposition === 'refused') {
      return {
        disposition: 'refused',
        reason: admission.reason,
        carrierHash: admission.carrierHash,
      };
    }

    const cases = this.listHeldHelpCases();
    const existingIndex = cases.findIndex(
      (candidate) => candidate.payloadHash === admission.payloadHash
    );
    const arrival: HelpSlipArrival = {
      occurrenceId: metadata.occurrenceId,
      receivedAt: metadata.receivedAt,
      carrierHash: admission.carrierHash,
    };

    if (
      cases.some((candidate) =>
        candidate.arrivals.some((candidateArrival) =>
          candidateArrival.occurrenceId === metadata.occurrenceId
        )
      )
    ) {
      throw new Error('HELP_SLIP_ARRIVAL_ID_CONFLICT');
    }

    if (existingIndex >= 0) {
      const existing = cases[existingIndex];
      const updated: GardenHeldHelpCase = {
        ...existing,
        arrivals: [...existing.arrivals, arrival],
      };
      cases[existingIndex] = updated;
      this.persist(cases);
      return {
        disposition: 'held',
        caseCreated: false,
        heldCase: cloneCase(updated),
      };
    }

    const heldCase: GardenHeldHelpCase = {
      localCaseId: `help-case:${admission.payloadHash}`,
      envelopeId: admission.payload.envelopeId,
      payloadHash: admission.payloadHash,
      payload: admission.payload,
      heldAt: metadata.receivedAt,
      status: 'held',
      arrivals: [arrival],
      requirementLinks: [],
    };
    cases.unshift(heldCase);
    this.persist(cases);
    return {
      disposition: 'held',
      caseCreated: true,
      heldCase: cloneCase(heldCase),
    };
  }

  listHeldHelpCases(): GardenHeldHelpCase[] {
    const raw = this.storage.getItem(HELP_SLIP_HOLD_STORAGE_KEY);
    if (raw === null) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('MALFORMED_HELP_SLIP_HOLD_STORE');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('MALFORMED_HELP_SLIP_HOLD_STORE');
    }

    const seenCases = new Set<string>();
    const seenOccurrences = new Set<string>();

    const validated = parsed.map((candidate): GardenHeldHelpCase => {
      if (
        !isRecord(candidate) ||
        !isNonEmptyString(candidate.localCaseId) ||
        !isNonEmptyString(candidate.envelopeId) ||
        !isNonEmptyString(candidate.payloadHash) ||
        !isRecord(candidate.payload) ||
        !isNonEmptyString(candidate.heldAt) ||
        candidate.status !== 'held' ||
        !Array.isArray(candidate.arrivals) ||
        !Array.isArray(candidate.requirementLinks)
      ) {
        throw new Error('MALFORMED_HELP_SLIP_HOLD_STORE');
      }

      const readmission = admitHelpSlipCarrier(JSON.stringify(candidate.payload));
      if (
        readmission.disposition !== 'admitted' ||
        readmission.payloadHash !== candidate.payloadHash ||
        candidate.localCaseId !== `help-case:${candidate.payloadHash}` ||
        readmission.payload.envelopeId !== candidate.envelopeId
      ) {
        throw new Error('MALFORMED_HELP_SLIP_HOLD_STORE');
      }

      if (seenCases.has(candidate.localCaseId)) {
        throw new Error('MALFORMED_HELP_SLIP_HOLD_STORE');
      }
      seenCases.add(candidate.localCaseId);

      const arrivals = candidate.arrivals.map((arrival): HelpSlipArrival => {
        if (
          !isRecord(arrival) ||
          !isNonEmptyString(arrival.occurrenceId) ||
          !isNonEmptyString(arrival.receivedAt) ||
          !isNonEmptyString(arrival.carrierHash) ||
          seenOccurrences.has(arrival.occurrenceId)
        ) {
          throw new Error('MALFORMED_HELP_SLIP_HOLD_STORE');
        }
        seenOccurrences.add(arrival.occurrenceId);
        return {
          occurrenceId: arrival.occurrenceId,
          receivedAt: arrival.receivedAt,
          carrierHash: arrival.carrierHash,
        };
      });

      const requirementIds = new Set(readmission.payload.requirements.map((r) => r.id));
      const requirementLinks = candidate.requirementLinks.map((link): RequirementCampfireLink => {
        if (
          !isRecord(link) ||
          !isNonEmptyString(link.localCaseId) ||
          !isNonEmptyString(link.payloadHash) ||
          link.localCaseId !== candidate.localCaseId ||
          link.payloadHash !== candidate.payloadHash ||
          !isNonEmptyString(link.requirementId) ||
          !requirementIds.has(link.requirementId) ||
          !isNonEmptyString(link.circleId) ||
          !isNonEmptyString(link.authorityNeedId) ||
          !isNonEmptyString(link.pouredAt) ||
          (link.witnessReceiptId !== undefined && !isNonEmptyString(link.witnessReceiptId))
        ) {
          throw new Error('MALFORMED_HELP_SLIP_HOLD_STORE');
        }
        return {
          localCaseId: link.localCaseId as string,
          requirementId: link.requirementId as string,
          payloadHash: link.payloadHash as string,
          circleId: link.circleId as string,
          authorityNeedId: link.authorityNeedId as string,
          pouredAt: link.pouredAt as string,
          ...(link.witnessReceiptId === undefined
            ? {}
            : { witnessReceiptId: link.witnessReceiptId as string }),
        };
      });

      return {
        localCaseId: candidate.localCaseId,
        envelopeId: candidate.envelopeId,
        payloadHash: candidate.payloadHash,
        payload: readmission.payload,
        heldAt: candidate.heldAt,
        status: 'held',
        arrivals,
        requirementLinks,
      };
    });

    return validated.map(cloneCase);
  }

  getHeldHelpCase(localCaseId: string): GardenHeldHelpCase | undefined {
    const found = this.listHeldHelpCases().find((candidate) => candidate.localCaseId === localCaseId);
    return found ? cloneCase(found) : undefined;
  }

  addRequirementLink(
    localCaseId: string,
    link: RequirementCampfireLink
  ): GardenHeldHelpCase {
    const cases = this.listHeldHelpCases();
    const index = cases.findIndex((candidate) => candidate.localCaseId === localCaseId);
    if (index < 0) throw new Error('HELP_SLIP_CASE_NOT_FOUND');

    const heldCase = cases[index];
    if (
      link.localCaseId !== heldCase.localCaseId ||
      link.payloadHash !== heldCase.payloadHash ||
      !heldCase.payload.requirements.some((requirement) => requirement.id === link.requirementId)
    ) {
      throw new Error('INVALID_HELP_SLIP_REQUIREMENT_LINK');
    }

    const duplicate = heldCase.requirementLinks.find(
      (candidate) =>
        candidate.requirementId === link.requirementId &&
        candidate.circleId === link.circleId
    );
    if (duplicate) return cloneCase(heldCase);

    const updated = {
      ...heldCase,
      requirementLinks: [...heldCase.requirementLinks, { ...link }],
    };
    cases[index] = updated;
    this.persist(cases);
    return cloneCase(updated);
  }

  private persist(cases: readonly GardenHeldHelpCase[]): void {
    this.storage.setItem(HELP_SLIP_HOLD_STORAGE_KEY, JSON.stringify(cases));
  }
}
