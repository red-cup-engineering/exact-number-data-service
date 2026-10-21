# Exact number data service

Shared exact integer, rational, matrix and decimal arithmetic recovered from the installed Bare Cedar Fog source into Red Cup data engineering. Values use decimal strings and BigInt arithmetic rather than binary floating point. Decimal conversion, arithmetic and rational conversion remain separate exported operations; division precision is selected by its caller.

This is source recovery, not independent publication or completed consumer migration. The old snapshot routes remain until consumers can receive this supplier. The computational carriers are preserved; comments about scientific theory are provenance, not proof of scientific approval or full Sign primitive composition.

## Receive this package

Pack this supplier from its own directory with `npm pack --ignore-scripts`, then install the resulting archive in the consumer with `npm install --ignore-scripts /path/to/archive.tgz`. Import `@red-cup-engineering/exact-number-data-service/decimal-string` or `/exact-number` through the declared exports. Installing the parent repository does not install this nested package.

The package archive was installed into an isolated consumer with no snapshot or custom resolver. Exact arithmetic retained `1e-25` and integer coefficients above binary precision. This establishes local package reception; it does not establish registry publication, an enduring shared distribution endpoint or production migration.

`./graded` preserves exact commodity and dimension grades, with canonical JSON admission, same-grade arithmetic, explicit grade products/quotients and conservation operations. This source was recovered from Bare Cedar Fog c677e9999ea05bf577f9355660687e56dffd3da9 without replacing unknown values with zeros. It does not establish Actor ownership, budget admission or a general resource model. An independent packed-package consumer demonstrated exact large-quantity addition, JSON round-trip admission and refusal to add HIVE to HBD; the recovered Hive reward consumer demonstrated exact HIVE/VESTS conversion in both directions. Other snapshot consumers remain to migrate.

## Exact-coordinate framework rigidity (2D and 3D)

The existing exact rational matrix engine now has a specific, finite
bar-and-joint framework realization producer:
[`src/framework-rigidity.mjs`](src/framework-rigidity.mjs). It constructs
edge displacement rows and calls the original `ratRank`—no copied linear
algebra, no floating-point geometry. The corresponding local command accepts
one JSON object on stdin:

```sh
printf '%s\n' '{"vertices":[[0,0],[2,0],[0,3],[3,4],[5,2]],"contacts":[[0,1],[0,2],[1,2],[0,3],[1,3],[1,4],[2,4]]}' \
  | node services/number-services-section/services/exact-number-data-service/bin/readout-framework-rigidity.mjs
```

The rank is **7** for this five-site source-derived contact graph; exchange
the last seven-contact pattern for
`[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3],[3,4]]` and it becomes **6**.
Both have identical vertex/contact counts. In three dimensions a genuine
tetrahedron's K4 rigidity matrix has rank **6** while a coplanar K4
realization has rank **5**. The module reuses the same source-owned exact
rational-number parser, including fractional and very large integer
coordinates; invalid and duplicate contacts fail before computation.

This is the missing distinction between **generic combinatorial planar
rigidity** (Laman/pebble graph test) and **the exact infinitesimal rigidity of a
particular 2D/3D embedding**. A 3D matrix rank is not a combinatorial test
for all geometric positions, and a structural model is not a calibrated
measurement, proof of vitrimer chemistry, or prediction of elastic modulus.
Lenticule Science's source is the October 1
*Associative Exchange and the Ring–Chain Ledger*, §1. Specific specimen
measurement, coordinate provenance and physical receiving remain separate.
The source export and command are new; registry publication and dependent
installation are not established by a source commit.

## Resource flow over observed seconds

The original "./resource-measurement" export admits graded noncurrency quantities with exact rational units. It recognizes disk reads/writes, network ingress/egress, CPU user/system/runtime, RAM residency and peak, inference token classes, energy and GPU runtime. Bit and byte amounts normalize to exact bytes; milliseconds normalize to exact seconds. No token-to-money or physical-to-money exchange rate is inferred.

The new "./resource-flow" export provides deriveResourceFlowReadings(sourceObservations), a pure projection of the **original source observations**, not a competing journal or book. A caller supplies observations with these fields:

- sourceObservationAddress: existing ni:///sha-256 reference to the original observation; repeated identical source records are idempotent and conflicting reuse fails.
- startAt and endAt: consecutive canonical UTC seconds, representing an actual one-second meter interval, never an interpolated job duration.
- feedRef, serviceActorRef, supplierActorRef and consumerActorRef: source feed, running service and typed micro-enterprise actor references, so independent resource streams cannot silently mix.
- measurements: admitted {resource,unit,amount:{numerator,denominator}} physical or inference-token quantities. Each measurement is checked by the shared exact-number resource admission.

The function returns a deterministic array of second, minute, hour and day UTC readings. Each retains the feed and actor coordinates; amount stays an exact rational with its own canonical unit; aggregation is sum except memory-peak, which uses peak; observedSeconds exposes the actual represented interval coverage, windowSeconds the whole window duration, and sourceCount counts distinct original observation inputs. Missing seconds produce no imaginary zero events, and unrelated commodities never combine. Consumers can pivot these readings by service or actor without retaining four materialized copies of each source sample.

This package deliberately does not sample a host, post financial entries, price CPU, authorize spending, or change the Group's canonical Beancount ledger. Those duties belong to the original host's meter/SEAVT carrier, accounting producer, and independent Group bookkeeper. For a native local qualification run, execute:

    node --test test/resource-measurement.test.mjs test/resource-flow.test.mjs

from this package directory.



## Exact event-time resource flows (0.1.4)

\`./resource-measurement\` now exports \`admitResourceQuantity\` and
\`admitResourceQuantities\`: a source-reported noncurrency quantity can be
normalized and summed without inventing a supplier or economic beneficiary.
The existing \`admitResourceMeasurement\` and
\`admitResourceMeasurements\` independently require real actor references and
retain their actor-specific quantity grades. Neither form posts a financial
transaction.

\`./resource-flow\` exports two different operations that must not be
conflated:

- \`deriveResourceFlowReadings\` receives actual aligned, measured one-second
  **intervals** and reports measured coverage plus second/minute/hour/day
  totals. It refuses unknown or fabricated second-level intervals.
- \`deriveResourceEventReadings\` receives **discrete source events** with
  \`sourceObservationAddress\`, \`observedAt\`, \`feedRef\`,
  \`resourceSubjectRef\`, optional **actually known** \`consumerActorRef\`,
  and measured quantities. It groups consumption by the *observed event
  timestamp* at second/minute/hour/day granularity. Such sums are not
  evidence of a smooth resource rate during the preceding second.

Both normalize exact units and reject duplicate dimensions or conflicting
reuses of source addresses. Provider token categories (\`inference-input\`,
\`inference-output\`, \`inference-cached-input\`,
\`inference-cache-creation-input\`, \`inference-cache-read-input\`,
\`inference-cache-write-input\`, \`inference-reasoning-output\`,
\`inference-total\`) remain distinct. Cache and reasoning components may be
subsets, depending on the native provider; **summing these categories is
not a valid total-token calculation**. Recording a token cost estimate is
not evidence that an invoice was paid or a Group bookkeeper posted money.

Event streams without a known customer actor retain
\`attribution:consumer-unattributed\` in the projections, rather than
fabricating one. These are reusable numerical projections: consumers supply
genuine identified events from their own typed SEAVT storage.


## Compare energy and resource flow without inventing evidence

The same original resource-flow export now includes
compareResourceFlowWindows({baselineObservations,successorObservations,
baselineStartAt,successorStartAt,resolution,comparisonRef,matchedWorkEvidenceRef?}).

Supply the original one-second source observations, rather than fabricated
aggregate numbers. Both pass through the original deriveResourceFlowReadings
validation. The comparison selects two disjoint, ordered and UTC-aligned
windows of the same resolution and matches each separate feed, service,
supplier, consumer, resource, unit and aggregation. An available complete
pair yields an exact signed successor minus baseline rational difference and,
where baseline is nonzero, an exact successor/baseline ratio through the
original graded-rational provider. Peak memory is a maximum difference,
not additive flow or saved joules. Omitted dimensions, missing whole seconds,
different actors/feeds, unknown units, overlapping independently named same-second meters without a partition law, and reused source observation identities
cannot give fabricated savings.

A supplied matchedWorkEvidenceRef is a pointer for external validation, NOT
proof that runs delivered equivalent work, had matched load, shared a calibrated
electricity meter, or were representative. Only an authorized independent Work
assayer can qualify equivalence, applicable standards and legitimate receiving
conditions. The result deliberately carries
requirementOrEngineeringAcceptanceClaimAllowed=false. A numerical measurement
cannot unilaterally create a Requirement, authorize Specifying, Architecting,
Designing or Fabricating, post money, or prove deployment.

The source-owner sequence is:
source-observed resource changes and coverage -> original attributed Work
and admitted Requirement -> tested performance/energy specification ->
architecture constraints and design alternatives -> original fabrication,
tests and immutable source readback -> actual deployed remeasurement under
matched conditions -> independent recipient judgment.
The Group's original Engineering Work #137 owns the four-stage closure;
Coesite tune-up Work #293 selects an admissible original improvement.

Measured or modeled electricity in joules, provider token quantities, FOCUS
ConsumedQuantity/PricingQuantity, and SCI carbon intensity are separate
claims. SCI also requires carbon intensity and hardware embodied-emission
information, neither of which this resource reader invents.

Run: node --test test/resource-flow.test.mjs test/resource-measurement.test.mjs.
Native CI exercises this plus the full exact-number package tests. Source
passing does not establish installed agent use or a real consumer improvement.


## Reported accepted-output intensity for Wednesday efficiency (source contract)

**Source of requirement:** the 561 Group Leader's October 21, 2026 Wednesday
directive: measure changes in energy and resource flow, derive efficiency
requirements, change specifications and designs, and refabricate the original
systems. This is an incremental native exact-number measurement supplier to
the [original Coesite tune-up/Work #293](https://github.com/coesite-operations/operations-services-section/issues/293)
and [Red Cup Engineering four-stage Work #137](https://github.com/red-cup-engineering/engineering-services-section/issues/137).
It is neither a separate ledger, actor, requirement-admission writer nor
engineering runtime.

### Behavioural specification and protected receiving

- **EFF-01 — Source fidelity.** An intensity comparison SHALL invoke
  \`compareResourceFlowWindows\` on the original source-addressed, exactly
  dimensioned one-second meter observations. It SHALL retain original absolute
  changes alongside normalized intensity, preserving meter, actor, supplier,
  consumer, UTC window, source count, units and observation coverage.
- **EFF-02 — Same functional unit.** Two independently *reported* outcome
  populations SHALL identify the **same** source-referenced functional unit
  and distinct source-evidence identities, with an exact nonnegative rational
  reported number of accepted outcomes. The reader SHALL never claim that an
  NI-shaped source locator authenticates a beneficiary or establishes actual
  quality, utility, workload equivalence or delivered acceptance.
- **EFF-03 — Exact calculation.** On fully observed, nonambiguous **additive
  consumption** dimensions and strictly positive reported outcome quantities,
  the reader SHALL return exact per-outcome baseline and successor intensities,
  their signed difference, and successor/baseline ratio only when baseline
  intensity is nonzero, reusing the shared graded-rational carrier.
  It SHALL NOT collapse incompatible units into a scalar cost/efficiency rank.
- **EFF-04 — Defined refusal.** Missing seconds or resource dimensions,
  multiple unpartitioned source meters, a nonadditive maximum, mismatched
  functional units, zero reported accepted outcomes, malformed quantities,
  and reused outcome-source identities SHALL either explicitly refuse
  comparison or withhold normalized results. They SHALL NOT become zero use,
  estimated acceptance or invented resource savings.
- **EFF-05 — Total versus intensity.** Reporting lower energy **per accepted
  reported outcome** SHALL NOT imply lower absolute joules, carbon, money or
  environmental cost. The result SHALL preserve the absolute resource delta
  so increased throughput and demand rebound remain inspectable.
- **EFF-06 — Authority and receiving.** The outcome quantities and source
  references are **caller-reported evidence awaiting actual source and
  beneficiary qualification**. The producer SHALL always withhold claims
  of admitted Requirements, approved Specification/Architecture/Design,
  qualified Fabrication, installed host or independent beneficiary effect.
  Original Group/Engineering/Coesite owners SHALL admit these stages separately.

### Interface/design: the original producer, not another meter

\`compareResourceFlowIntensityWindows\` is exported from the existing
\`@red-cup-engineering/exact-number-data-service/resource-flow\`.
It accepts the *same* before/after fields as
\`compareResourceFlowWindows\`, plus:

\`\`\`js
baselineOutcome: {
  sourceEvidenceRef: "ni:///sha-256;<43-character-source-address>",
  functionalUnitRef: "ni:///sha-256;<43-character-source-defined-functional-unit>",
  acceptedUnits: { numerator: "10", denominator: "1" }
},
successorOutcome: {
  sourceEvidenceRef: "ni:///sha-256;<different-source-address>",
  functionalUnitRef: "ni:///sha-256;<same-functional-unit>",
  acceptedUnits: { numerator: "12", denominator: "1" }
}
\`\`\`

The source response retains the **entire existing resource comparison** under
\`resourceComparison\`, and adds per-resource dimension
\`baselinePerReportedAcceptedUnit\`, \`successorPerReportedAcceptedUnit\`,
\`differencePerReportedAcceptedUnit\`, \`successorOverBaselineIntensity\`,
and \`intensityStatus\` only when admissible. An exact denominator
is an observed or claimed count, not a fictitious scalar convenience.

The native comparison is \`E_b/N_b\` versus \`E_s/N_s\` for the same
functional unit, where \`E\` is one specific measured resource grade.
To interpret it as an **actual efficiency improvement**, independently
verify \`N\` as accepted comparable-quality useful outcomes, meter
calibration, environment/load and receiver rights; also check fixed-volume
total input and displaced upstream/downstream inputs.

### Predeclared native receiving cases

The source tests require (A) total energy *increases* while exact joules per
reported accepted result *decrease*; (B) total energy decreases but intensity
worsens; (C) zero accepted outcomes, nonadditive peak and absent dimensions
withhold ratios; (D) partial minute, reused or mismatched provenance,
invalid rational and differing functional units refuse; and (E) zero
baseline consumption gives no invented relative percentage. All are
source-level cases—not real accepted Work receipts.

Run \`npm test\` on this exact package and read the changed source back.
Package publication, installation into FeltOS/Cold Red Gate, actual operation
and independent beneficial outcomes remain further explicit gates.
