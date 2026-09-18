# RETURN-OF-THE-HELP-SLIP-001 — Garden side

Garden may project one source requirement into more than one Campfire. Those
projection edges do not multiply the underlying demand.

## Law

```text
many projection edges != many source requirements
many shared confirmations != safely summable confirmations
```

When one requirement has one Campfire link, the current aggregate
`confirmedUnits` remains usable directly.

When one requirement has multiple Campfire links:

- attributable confirmation occurrences are deduplicated by `occurrenceRef`;
- the same occurrence seen through multiple Campfires counts once;
- distinct attributable occurrences compose;
- when occurrence identity is absent or inconsistent, Garden does not sum the
  links. It exposes the maximum per-link confirmed quantity as a conservative
  lower bound and marks the projection ambiguous.

The lower-bound fallback can prove that *at least* some help was confirmed, but
it cannot invent an exact combined total.

## Completion labels

A confirmed shared subset is now labeled **Shared portion confirmed**.

Garden reserves **Source request confirmed** for the stronger case where every
source requirement has been shared and the current confirmation projection
resolves every requirement.

```text
shared subset confirmed != whole source request confirmed
```

This slice does not add cross-device HOLD synchronization, new Supabase schema,
or a universal confirmation-occurrence protocol. The optional occurrence list
is the seam for a future authority projection that can provide that identity.
