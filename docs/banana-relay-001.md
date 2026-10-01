# Banana Relay 001 — Fruit, Seed, Compost

**Status:** experimental / non-canonical  
**Authority:** local specimen only  
**Purpose:** compose bounded 12:01 acts into resumable work without creating a persistent worker or silently transferring execution authority.

## The relay

A completed ELF may leave three things:

```text
FRUIT   = what actually changed
SEED    = a possible next door
COMPOST = failed attempts, rejected assumptions, dead paths, uncertainty
```

Then the ELF is gone.

The relay packet does not contain a successor ELF and does not contain authority to create one.

```text
ELF_n
  |
  v
ONE ACT
  |
  v
RECEIPT
  |
  v
BANANA RELAY
  |---- fruit
  |---- seed(s)
  |---- compost
  |
  v
NO SUCCESSOR AUTHORITY
```

## Core law

> AN ELF MAY LEAVE A DOOR. IT MAY NOT OPEN IT FOR ITS SUCCESSOR.

A relay seed is therefore only a `proposes` relation.

```text
SEED != SELECTION
SEED != CROSSING
RELAY != SUCCESSOR
CONTINUITY != PERSISTENT AGENT
```

## Executable composition with 12:01

`createBananaRelayPacket(receipt)` requires a completed 12:01 receipt. The fruit is derived from that receipt rather than authored as a new claim.

`plantRelaySeeds(state, packet)` can place the packet's seeds into a fresh witnessed 12:01 state as proposed doors.

It cannot select them.

It cannot cross them.

It cannot hatch the next ELF.

The next execution still requires the existing 12:01 path:

```text
previous ELF
  -> ACT
  -> RECEIPT
  -> RELAY SEED
  -> PROPOSED DOOR
  -> explicit human SELECT
  -> explicit CROSS
  -> new ELF
```

## Why compost matters

Without compost, failed work disappears and later workers are tempted to repeat it or infer that an unexplored path is clean.

Compost preserves negative knowledge without promoting it into authority:

```text
failed_attempt
rejected_assumption
dead_path
uncertainty
```

A failed attempt may therefore improve the next decision while remaining visibly different from successful consequence.

## Falsifiable invariants

The tests require:

1. fruit comes from a real receipted consequence;
2. seeds carry `selectionAuthority: false`;
3. seeds carry `crossingAuthority: false`;
4. planting a seed produces only a proposed door;
5. a planted seed cannot cross until it is explicitly selected;
6. explicit selection can hatch a new ELF generation through the existing 12:01 gate;
7. compost is preserved without becoming execution authority;
8. a relay may end with no seeds at all;
9. duplicate seed identities are refused.

## Working seal

> SUCCESS MAY PRODUCE CONSEQUENCE.  
> FAILURE MAY PRODUCE EVIDENCE.  
> NEITHER MAY PRODUCE AUTHORITY.
