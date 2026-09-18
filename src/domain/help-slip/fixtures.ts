export const BAND_RUNTIME_HELP_SLIP_FIXTURE = {
  rawCarrier:
    '{"schema":"fulfillment-envelope/v0","envelopeId":"env-compat-1","purpose":"Dinner for three","createdAt":"2026-09-18T15:00:00.000Z","requirements":[{"id":"ingredient:tomatoes","kind":"ingredient","description":"Canned tomatoes","quantity":2,"unit":"can","neededBy":"2026-09-18T20:00:00-05:00"}],"source":{"system":"Nourish-Kids","recipeId":"staple-1-tomato-bean-rice-bowl"},"disclosure":{"includesOnlySelectedResiduals":true,"omittedPrivateContext":true},"status":"unmet"}',
  canonicalPayload:
    '{"schema":"fulfillment-envelope/v0","envelopeId":"env-compat-1","purpose":"Dinner for three","createdAt":"2026-09-18T15:00:00.000Z","requirements":[{"id":"ingredient:tomatoes","kind":"ingredient","description":"Canned tomatoes","quantity":2,"unit":"can","neededBy":"2026-09-18T20:00:00-05:00"}],"source":{"system":"Nourish-Kids","recipeId":"staple-1-tomato-bean-rice-bowl"},"disclosure":{"includesOnlySelectedResiduals":true,"omittedPrivateContext":true},"status":"unmet"}',
  carrierHash: 'e4d9c245f394b44053d13edc9c05eae2e1e9ef9f757f4483a21042aa2a60ca80',
  payloadHash: 'e4d9c245f394b44053d13edc9c05eae2e1e9ef9f757f4483a21042aa2a60ca80',
} as const;
