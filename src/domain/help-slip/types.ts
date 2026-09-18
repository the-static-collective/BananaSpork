export interface FulfillmentRequirementV0 {
  id: string;
  kind: string;
  description: string;
  quantity?: number;
  unit?: string;
  neededBy?: string;
}

export interface ImportedFulfillmentEnvelopeV0 {
  schema: 'fulfillment-envelope/v0';
  envelopeId: string;
  purpose: string;
  createdAt: string;
  requirements: FulfillmentRequirementV0[];
  source: {
    system: string;
    recipeId?: string;
  };
  disclosure: {
    includesOnlySelectedResiduals: true;
    omittedPrivateContext: true;
  };
  status: 'unmet';
}

export type HelpSlipRefusalReason =
  | 'INVALID_JSON'
  | 'INVALID_SHAPE'
  | 'UNSUPPORTED_SCHEMA'
  | 'MISSING_ENVELOPE_ID'
  | 'EMPTY_REQUIREMENTS'
  | 'INVALID_REQUIREMENT'
  | 'QUANTITY_WITHOUT_UNIT'
  | 'INVALID_QUANTITY'
  | 'INVALID_DISCLOSURE'
  | 'UNSUPPORTED_SOURCE_STATUS';

export type HelpSlipAdmission =
  | {
      disposition: 'admitted';
      carrierHash: string;
      payloadHash: string;
      canonicalPayload: string;
      payload: ImportedFulfillmentEnvelopeV0;
    }
  | {
      disposition: 'refused';
      carrierHash: string;
      reason: HelpSlipRefusalReason;
    };
