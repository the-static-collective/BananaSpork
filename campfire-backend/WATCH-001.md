# WATCH THE WATCHMEN 001 — a mirror facing the stewardship desk

**Status:** locally executable, narrow process-signal and credential-attestation protocol. **Not** an independent external ombuds system, legal service, verified adult identity system, safe survivor intake, deployed reporting channel or misconduct tribunal.

## Why this exists

No volunteer, moderator, organizer or administrator should become the final authority on whether their own conduct is beyond question. A person who receives help should retain their dignity and freedom to decline, disagree, report an issue or walk away. An operator reporting "everything is fine" is not an independent witness.

This protocol does **not** rate people or adjudicate allegations. It prevents the software from quietly turning the *absence of checked complaints* or the *number of agreeing reviewer credentials* into legitimacy.

## The small human doorway

The first-party Firebox frontend includes a link to **`/watch`**. It reads an existing member's session-only capability from the same browser tab. The page only offers constrained category/scope selects, a private receipt, a list of that reporter credential's own signals, consented one-time reviewer-invitation creation, and a **read-only preview** of the process category before voluntary acknowledgement. It has no free-text case-entry box and no automatic outward message. Opening the page alone does not register or report anything.

**Do not use the page to file a real survivor, custody or child-safety report.** A host-run prototype and a private member credential are not a secure complaint organization. The reporter should keep a copy of their private receipt and should not treat the hash as an externally notarized proof.

## Actual v0 API (owned Firebox branch; separate from public site)

- Member `POST /v1/circles/:circleId/watch` with **only** `category`, `subjectScope` and a UUID `requestId`. No names, narratives, case IDs, recipient IDs, phone numbers, addresses, attachments or secrets may enter the signal payload. Exact allowlists; three signals per reporter credential per day; idempotent replay.
- Member `GET /v1/circles/:circleId/watch` returns **only signals opened by that member's own credential**. Other members in the circle cannot browse them; a foreign-circle credential cannot access the route.
- The reporter alone may prepare at most two one-hour **one-use review invitations** through `POST /v1/watch/:id/review-invites` with an empty JSON object. These invitations are separate from member invites. The reporter must share each privately, with consent.
- A member credential of the *same circle*, other than the reporter credential, may submit `POST /v1/watch/review` with `inviteCode` and `stance` (either `ACKNOWLEDGED_FOR_ESCALATION` or `INDEPENDENT_REVIEW_NEEDED`). Owner credentials are excluded from attesting. One distinct member credential may attest only once per signal; tokens cannot be redeemed twice.
- **No endpoint permits dismissal, removal, finding of guilt, punishment, automatic access revocation, self-certification, publication or cross-circle export.** Every received signal and invitation/review event appends a local event to the existing hash-linked audit.
- The administrator can query **aggregate posture only** via `GET /v1/admin/watch-posture` or `node campfire-backend/manage.mjs watch`. Never a member directory, complainant name or freeform complaint feed.
- On disk, signals include the reporter's internal local actor ID and only categorical fields. They are *not end-to-end encrypted*, and the SQLite host can access them. The database operator remains more powerful than the API.

Even after two reviewer-key acknowledgments, the posture remains `UNRESOLVED_NEEDS_INDEPENDENT_HUMAN_OVERSIGHT`. **Two distinct bearer credentials are not evidence of two distinct independent adults.** Accusation is not guilt; review attendance is not an adjudicated finding.

## Local three-or-more-credential security trial

```bash
node --test campfire-backend/watch.test.mjs
npm test
node campfire-backend/start.mjs
# second terminal (private administrator environment only)
node campfire-backend/manage.mjs watch
```

A proper adversarial trial includes a member reporter, two independently controlled member review credentials, an owner prohibited from adjudicating, and an outsider circle prohibited from all access. Test duplicate `requestId`, exhausted one-use invitations, private list isolation, a restart, and an audit integrity failure. **Tests using separate keys are software tests; actual independent adults and source-reviewed safety are an additional field gate.**

Do not collect actual abuse narratives, children's information, police/custody evidence or personally identifying concerns here. This is a categorical **process-integrity training specimen** only. A real confidential route needs separate vetted personnel, privacy and retention policies, complaint withdrawal/follow-up expectations, emergency escalation ownership, independent hosting/custody and meaningful protection against retaliation.

## Limits: who can still corrupt this?

1. **Single host operator controls disk** and may alter/delete database files or revoke a reporter's access; a local chained hash is not externally anchored or tamper-proof. The reporter receives a receipt hash, but that alone cannot prove a third-party timestamp or independent custody.
2. **No human identity attestation.** An individual could control multiple member access keys. Independent review by two people has NOT been established.
3. **No outside alerting and no emergency response.** It is deliberately not a confidential tip line or crisis channel.
4. **No remedy workflow.** Watch reports never automatically resolve; the real world's repair, recusal, appeal, whistleblower safety and evidence handling remain to be designed and authorized separately.
5. **A process report is not a finding.** There are no automatic sanctions, AI sentiment judgments, reputation metrics or member scores.

## Next high-leverage crossing — actual independent custody

With two named and willing adult community stewards, separated from hosting and from the subject of any complaint, agree on a local protocol for hearing or refusing a private non-identifying process question. Hold a time-bounded external hash checkpoint with signed human custody and independent provenance *outside the Firebox*. Compare later snapshots under a real witness protocol. Keep consent and withdrawal possible. Never publicly broadcast an allegation or a source identity.

Only after a human-approved, non-identifying redaction may GRAFT or JAR;VIS know that an **unresolved process question** exists. They receive **no source case, identity or raw message**. GRAFT must not present a steward role as authorized solely because one program generated a six-edge hypothetical map.

**Human law:** The people entrusted with coordination must remain answerable to the people affected; their own software cannot certify them innocent or guilty.
