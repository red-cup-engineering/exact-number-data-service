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

