# PENNY BOX -> Garden Help Slip Bridge 001

**Status:** candidate handoff implemented in this branch; no live PENNY service or church authorization established.  
**Owner:** BananaSpork/Garden (receiver); PENNY BOX's own localhost app remains a separate producer prototype.  
**Scope:** one-way, offline, human-reviewed, no new network dependency.

## The actual crossing

```text
PENNY BOX steward's public-safe candidate
  -> export/copy penny-box-candidate/v0 JSON (not automatic)
  -> Garden Help Slip Inbox / Preview import
  -> human review checkbox for PENNY candidates
  -> normalized fulfillment-envelope/v0
  -> device-local HOLD (existing HelpSlipHoldStore)
  -> later human review of one requirement
  -> per-requirement Campfire POUR (existing Jubilee authority path)
  -> pledge -> accept -> report -> independent recipient confirmation
```

A PENNY candidate is **not** a requester's verified instruction, a signed act, a permission to publish, a receipt, a cash donation, or a Jubilee shared need. The candidate's source can be spoofed; this first bridge is an import convenience, not sender authentication. Every publication must be handled by authorized humans under an approved stewardship process.

### Packet example — synthetic only

Save the following as `penny-candidate-demo.json`, then paste it into **Garden -> Help Slip Inbox -> Import Help Slip**. Do not publish the specimen as a real Campfire need.

```json
{
  "schema": "penny-box-candidate/v0",
  "signalId": "sample-grocery-001",
  "createdAt": "2026-10-19T21:00:00.000Z",
  "purpose": "Practice need: neighbor groceries",
  "requirements": [
    {
      "id": "item-beans-001",
      "kind": "goods",
      "description": "Dry beans (synthetic practice)",
      "quantity": 2,
      "unit": "bag"
    },
    {
      "id": "ride-grocery-001",
      "kind": "transport",
      "description": "One grocery ride (synthetic practice)"
    }
  ],
  "status": "candidate"
}
```

Only `goods`, `equipment`, `transport`, and `service` kinds are supported.
Amounts must be positive finite quantities with units; qualitative requests carry
no amount. Heterogeneous requirements remain separate. This format accepts no
contact field, exact address, private context or financial instruction. However,
**structural validation cannot identify sensitive information inside free text**.
The human reviewer must redact or refuse it; this is not a private case-management system.

The receiver preserves source `signalId` under `envelopeId = penny-box:<signalId>`,
and labels the origin `PENNY BOX (unverified candidate)`. Its generated
`fulfillment-envelope/v0` uses the existing serializer and HOLD validation.

A repeat with identical semantic content creates another arrival, **not** a new
held demand. A different payload with the same envelope ID is refused as
`ENVELOPE_ID_CONFLICT`; a reviewer must reconcile changes rather than silently
fork one source identity into two live requests.

## Explicitly excluded

- The separate `penny-field-demo/1` event log **cannot be imported** as a real need. That simulation records fictional role claims and should never auto-promote to a Campfire.
- No cash/penny count -> need quantity conversion. The physical collection box needs its own permitted custody and reconciliation.
- No auto-scan, auto-import, auto-POUR, location collection, identity claim, signatures, hosted QR, contact storage, anonymous public case publishing, scoring, credits, money, or tax receipts.
- No claims about independent real-world fulfillment. `reported != confirmed`.
- No claim of live multi-account RLS proof, two-device rehydration, or consent provenance.
- No integration patch to the separate PENNY localhost app: the producer must implement/export this v0 envelope deliberately; until then the test uses a manually prepared candidate.

## Field acceptance

1. Import one *synthetic* packet and preview exact selected contents.
2. Cancel. Observe no local case and no shared command.
3. Reopen import; preview and check human-review box; HOLD.
4. Verify device status **Held on this device / Not shared**.
5. Restart the same browser, observe the same payload hash and case.
6. Import an identical candidate with different JSON field order/spacing. Observe two arrivals and one demand.
7. Import a mutated candidate with the same signal ID. Observe `ENVELOPE_ID_CONFLICT`.
8. Verify PENNY demo events are rejected as unsupported schema.
9. Only using a permitted, authenticated **test** Campfire, preview one requirement POUR; cancel.
10. Confirm only a deliberate second action would invoke Jubilee. Verify reported support does not reduce residual until human confirmation.
11. For the **live field proof**, follow `docs/field-specimen-001.md`: separately test two-account isolation, hostile non-member refusal, restart, an actual authorized help act, and safe human evidence.

## Production promotion gates

Require a designated steward, a source-side export implementation, a clear
requester-permission procedure, controlled retention/deletion, private-contact
channel separate from public packets, field RLS test, incident/reporting path,
and authorization to place or advertise any physical collection box or QR.

**BOX != BANK · CANDIDATE != CONSENT · IMPORT != PUBLICATION ·
HOLD != POUR · OFFER != COMPLETION · REPORT != CONFIRMATION.**
