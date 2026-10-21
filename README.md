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
different actors/feeds, unknown units and reused source observation identities
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
