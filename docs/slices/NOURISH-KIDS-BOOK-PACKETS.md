# Nourish Kids — Food + Free Book Packets

Status: **preserving product slice**

Branch: `nourish-kids-book-packets`

## One sentence

Nourish Kids routes real resources toward children as food, while optionally pairing simple shelf-stable food packets with small free paper books that support positive identity development, belonging, courage, curiosity, kindness, and hope.

## Governing principle

> Nourishment can reach the body and the imagination in the same package.

The book is not a promotional insert and the food is not a prop for literacy programming. Both are direct gifts.

## Example packet

A minimum packet may contain:

- one legally and safely sourced shelf-stable food item, such as an oatmeal packet;
- one compact folded or stapled paper book;
- clear ingredient and allergen information preserved from the food manufacturer;
- a minimal note explaining that the book is free to keep, share, or pass onward;
- no advertising targeted at the child;
- no requirement to register, scan, report, or prove need.

Possible closing line in the book:

> This book belongs to whoever needs it next.

## Mission boundary

The system exists to help move real food and freely usable stories toward children through lawful, accountable, privacy-preserving participation.

It does not exist to:

- collect children's data;
- condition food on religious, political, commercial, or behavioral participation;
- manufacture proof that a particular child received or consumed an item;
- replace qualified food programs, schools, shelters, libraries, or healthcare providers;
- present generated stories to children without responsible human review;
- hide administrative, printing, packaging, or distribution costs.

## Positive identity development

Candidate books should leave a child with one or more durable impressions:

- I matter without having to earn basic care.
- My body deserves food and rest.
- I can learn, imagine, repair, and grow.
- Asking for help does not reduce my worth.
- Ordinary homes, tables, buses, gardens, and neighborhoods can hold goodness.
- Other people can become trustworthy through consistent care.
- There is room for me and room for another person.

Stories should embody these impressions through characters and events rather than reciting slogans.

## Initial book format

A practical first edition:

- 12–20 interior pages;
- inexpensive monochrome or two-color printing;
- small trim size that can travel beside food without covering required food labeling;
- readable typography;
- one complete story;
- limited text per spread;
- optional simple activity, drawing prompt, or read-together question;
- source files retained in a print-ready, accessible format;
- free digital edition and printable edition where rights permit.

The physical book must not be inserted inside sealed food packaging or obscure manufacturer labeling unless the food partner and applicable packaging rules explicitly permit it. The initial model should place the book beside the food in a larger distribution packet.

## Resource flow

```text
Donation or contributed capacity
            ↓
Restricted purpose and disclosure rules
            ↓
Food sourcing + book production
            ↓
Qualified distribution partner or local circle
            ↓
Child-facing packet
            ↓
Aggregate, privacy-safe fulfillment receipt
```

## Trust and stewardship shape

A trust, nonprofit, fiscal sponsor, mutual-aid organization, business, or other lawful steward may hold the mission and receive resources. The exact legal vehicle must be selected with qualified local counsel and tax advice before representing donations as tax-deductible.

The structural separation should remain clear:

### Stewarding entity owns

- mission lock and permitted uses;
- financial accounts and restricted funds;
- vendor and distribution agreements;
- food-safety and insurance requirements;
- child-safeguarding policy;
- publication approval;
- donor reporting;
- conflict-of-interest and compensation rules.

### Creative system proposes

- story concepts;
- manuscripts;
- illustrations;
- printable layouts;
- audio readings;
- translations;
- companion songs and radio segments.

### Human reviewers authorize

- developmental appropriateness;
- factual and cultural review;
- accessibility;
- food-packet compatibility;
- final publication;
- retirement or correction of a book.

No model may publish directly to children without the human authorization step.

## BananaSpork's role

BananaSpork should not become the legal trust or the food-distribution organization.

It can function as a field instrument for authorized adults and distribution partners to:

- record an offer of food, printing, transport, design, translation, or funding;
- record a need from a partner organization without exposing a child's identity;
- assemble a proposed packet run;
- attach a candidate book artifact;
- record review and approval dispositions;
- issue aggregate fulfillment receipts;
- preserve local-held drafts until explicitly shared;
- show where participation is blocked without turning children into tracked subjects.

## Minimal domain objects

```ts
export type NourishPacketRun = {
  id: string;
  title: string;
  status:
    | "proposed"
    | "reviewing"
    | "funded"
    | "assembling"
    | "transferred"
    | "received_by_partner"
    | "closed"
    | "cancelled";
  foodLotRefs: string[];
  bookEditionId: string;
  intendedPacketCount: number;
  distributionPartnerId: string;
  disclosureClass: "public_aggregate" | "partner_private";
};

export type ChildBookEdition = {
  id: string;
  title: string;
  manuscriptArtifactHash: string;
  printArtifactHash: string;
  language: string;
  ageBand: string;
  reviewReceiptIds: string[];
  license: string;
  status: "draft" | "approved" | "retired";
};

export type NourishFulfillmentReceipt = {
  id: string;
  packetRunId: string;
  event:
    | "resources_committed"
    | "food_received"
    | "books_printed"
    | "packets_transferred"
    | "partner_received";
  quantity?: number;
  artifactHashes: string[];
  witnessIds: string[];
  occurredAt: string;
  publicSummary?: string;
};
```

## Privacy invariant

The canonical fulfillment record should usually stop at the trusted distribution partner.

The system may prove that a partner received 100 food-and-book packets. It should not require names, photographs, addresses, school records, diagnoses, or individualized consumption evidence from children.

A child's dignity is not an audit artifact.

## Donation transparency

A donor-facing view may show aggregate, attributable uses such as:

```text
$120 — 300 monochrome booklets printed
$240 — 200 oatmeal packets purchased
$60  — packing and local transport
200 packets received by named partner
```

It must distinguish:

- pledged from received funds;
- restricted from unrestricted funds;
- estimated from actual costs;
- transferred packets from confirmed partner receipt;
- charitable contribution from ordinary purchase or sponsorship;
- tax-deductible status from non-deductible support.

## First vertical slice

Produce one real, small packet run:

1. Write and human-review one 12–16 page children's story.
2. Prepare one low-cost printable edition.
3. Choose one sealed shelf-stable food item with intact manufacturer labeling.
4. Identify one authorized local distribution partner.
5. Set a deliberately small quantity, such as 25–50 packets.
6. Record food, printing, assembly, transfer, and partner-receipt evidence.
7. Collect no child identity data.
8. Publish an aggregate cost and fulfillment receipt.
9. Offer the digital book freely after the physical run.

## Acceptance invariants

- No food is distributed past its date or without intact required labeling.
- Allergen information remains visible and unaltered.
- The book never obscures required food information.
- No child's receipt of food depends on reading, belief, registration, or publicity.
- No generated story reaches children without human approval.
- Donor claims match the actual legal and tax status of the stewarding entity.
- Financial and material flows remain distinguishable and receipted.
- Fulfillment can be demonstrated without identifying children.
- The book is free of third-party advertising and manipulative data collection.
- A distribution partner may decline or stop the packet program without penalty.

## Connection to the wider system

- **Nourish Kids:** mission and real-world resource chain toward children's food.
- **BananaSpork:** field capture, proposals, partner coordination, and receipts.
- **TranchNode:** durable lineage among needs, offers, book editions, packet runs, and outcomes.
- **Static Collective Radio:** optional story readings, songs, and transparent calls for a specific approved packet run.
- **The Autodiscography:** creative source material, motifs, and companion works.

The radio may say that a run needs printing or oatmeal. It must not fabricate urgency, expose recipients, or imply that generated listener sentiment is a human donation.

## Look-twice question

How can one small packet make a child feel not merely supplied, but welcomed?

That question should remain visible whenever implementation pressure reduces the work to inventory movement alone.
