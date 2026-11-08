# Cellular exact cash-flow work

`@red-cup-engineering/exact-number-data-service/exact-cash-flow-work` turns an
admitted discrete-period cash-flow request into source-bearing mathematical
work. This Exact Number service owns the arithmetic and the separate
checker. The work composes the existing SignCell, SignChain, SignGraph and
settlement interfaces. It performs no network, account, clock or payment
operation.

Compute and admit take the request plus optional host limits; replay takes
`{input, received, limits}` and the evidence reader takes
`{received, sourceCells}`. Receipt kinds keep their `signcraft.` names so
receipts made before this work moved here keep their identity.

## Request and numerical meaning

```js
const request = {
  currency: "USD",
  periodUnit: "year",
  rate: "0.10",
  cashFlows: [
    { period: 0, amount: "-100" },
    { period: 1, amount: "110" },
  ],
  rounding: { places: 2, mode: "half-even" },
};
```

The selected numerical model is

\[
  V = \sum_i a_i(1+r)^{-p_i}, \qquad r > -1.
\]

`periodUnit` is the caller's declared discrete period: `day`, `month`, or
`year`. The rate applies to that period. No actual calendar date, day-count
convention, annual-rate conversion, irregular schedule, interest curve,
internal rate of return or predicted cash payment is inferred. Negative
cash flows and negative admitted rates retain their signs. Every input
occurrence retains its index; equal amounts at equal periods are two
occurrences.

The request is strict: it contains only `currency`, `periodUnit`, `rate`,
`cashFlows`, and `rounding`, with the numerical supplier's exact field
admission. Currency labels match `^[A-Z][A-Z0-9]{2,11}$`; this accepts an
opaque currency grade, not a verified ISO currency registration. Amounts
and the rate are exact decimal strings. Periods are nonnegative safe
integers. The default service profile admits rounding at 0–18 places and
`half-even`, `half-away-from-zero`, or `toward-zero`.

The result retains the currency, period unit, exact rate, per-occurrence
amount, discount multiplier, present value, exact total, rounded total,
and exact rounding residual `total - rational(roundedTotal)`. Rational values use the existing Exact Number
carrier `{kind: "exactNumber.rational", num, den}` with reduced decimal
integer strings. The numerical checker verifies the equations, occurrence
order, rounding and residual against the original request; a supplied
`verified` flag is not accepted as evidence.

## Admission and bounded computation

```js
import {
  admitExactCashFlowWork,
  computeExactCashFlowWork,
  replayExactCashFlowWork,
  readExactCashFlowEvidence,
} from "@red-cup-engineering/exact-number-data-service/exact-cash-flow-work";

const admission = admitExactCashFlowWork(request);
const produced = computeExactCashFlowWork(request);
const received = JSON.parse(JSON.stringify(produced));
const replay = replayExactCashFlowWork(request, received);
if (!replay.admitted) throw new Error(replay.reason);

console.log(received.result.roundedTotal); // "0.00"
console.log(readExactCashFlowEvidence(received).claims.payment.reading);
// "absurd": neither side has witnessed a payment.
```

The optional second argument is a host-selected numerical limit object.
The original `admitCashFlowLimits` provides the effective policy: at most
64 flows, period 1200, 128 input digits, 18 rounding places and an arithmetic
digit-work bound of 16384 by default. The supplier estimates the work
before exponentiating, so a small input cannot silently create an
unbounded power. Customer request fields cannot change this policy.

The programmatic numerical API permits explicit host overrides within its
own hard ceilings, including at most 128 rounding places. The cellular work keeps
that effective policy. The published JSON Schemas describe the default
public service profile; they do not admit every possible programmatic
override. A merchant owns its selected profile and publishes that profile
with its offer.

The work independently bounds its cellular representation to **4096
retained tellings**, before computation. For `n` occurrences, the complete
representation contains `28 + 10n` tellings: `10 + 4n` model rows,
`13 + 6n` numerical rows and five conclusion rows. The row count is checked
again when producing evidence. Custom numerical limits do not remove
this bound. Capacity refusal has the stable code
`CASH_FLOW_EVIDENCE_ROWS_LIMIT`; it establishes no mathematical
refutation, purchase intent or payment.

Both public receiving functions check all receipt collection lengths before
copying, hashing or traversing their elements. They require the original
finite site (ten source coordinates and one specialization), three rules,
and the exact source/numerical telling counts. A bounded own-descriptor
walk then admits the inert JSON representation, with explicit structure,
depth and text budgets. Accessors, authored array methods/iterators,
subclasses, sparse arrays and hidden fields are outside this wire profile.
The original SignCell content owner still performs retention and identity;
the receiving preflight supplies the operation's capacity boundary.

The effective numerical policy participates in the request's source
identity, is retained as source Cells, and must be selected again on
replay. `admitExactCashFlowWork` returns
`{operation, request, limits, projectedEvidenceRows}`. The numerical
request retains its exact admitted decimal lexemes and source order.

## Source to calculation to settlement

1. The request, effective policy, and each indexed cash-flow occurrence
   become native SignCells in an immutable SignChain `TellingLog`.
2. The work reads those tellings back into the actual numerical input.
   It checks equality with the admitted request and policy before calling
   Exact Number. The Cells determine the computation's input.
3. Exact Number computes and independently checks the numerical receipt.
   Numerical quantities become original tellings with exact result paths;
   equal source occurrences remain separately addressable.
4. A SignChain rule requires the admitted-model, computed-result and
   independently-checked premises. Original SignGraph site generators
   and predicate specialization carry this rule to original SignCraft
   settlement.
5. The receipt retains source rows, numerical rows, conclusion rows,
   site generators, original rules, and the actual settlement identity.
6. The producer admits the complete response through the public replay
   boundary before returning it to a merchant. Failed numerical or cellular
   receiving therefore interrupts response preparation before settlement.

`replayExactCashFlowWork` rechecks numerical quantities against the buyer's
request, reconstructs both sets of tellings and the licensed consequence,
and compares the complete evidence. It rejects changes to source rows,
indices, amounts, limits, numerical values, rules, claim coordinates or
settlement identity. Supplied rules are not evaluated before their
presentation matches the independent reconstruction. Replay uses the
separate numerical checker, never the numerical producer.

These are finite conditional arithmetic and source-replay claims. The
checker is a separately implemented equation checker within the same
package; that does not make it an independent customer, trusted issuer,
formal Lean proof or isolated external oracle.

## Distinct evidence claims

The receipt exposes four claim coordinates:

| Claim | Initial reading | What can establish more evidence |
| --- | --- | --- |
| `conditional` | `potential`: positively witnessed | The admitted model, numerical result and independent equation check |
| `sourceAuthenticity` | `absurd`: neither side told | Separate qualified source-authentication observations |
| `customerAcceptance` | `absurd`: neither side told | Separate observations of the actual customer's acceptance |
| `payment` | `absurd`: neither side told | Separate payment-provider or account observations |

`readExactCashFlowEvidence(received, {sourceCells})` reads these through
the original token frame, FOUR fibers and source-preserving sheaf. It
requires genuine evidence-bearing Cell values: a positive presumed
reading with no supporting witnesses is refused. Contradictory positive
and negative source observations remain together, reading `stable` in
the Group vocabulary. That label describes held contradiction; it does
not mean agreement or financial finality.

The pure reader authenticates no source. A host must qualify which
observations it is allowed to supply. For externally received work,
replay against the buyer's request precedes reading its claims.
The optional source observations use the same bounded inert JSON profile:
up to 4096 Cells, without caller-supplied traversal methods or getters.
Their own descriptors are admitted before the original content owner
retains them and before measured-evidence validation runs.

## Receiving and commercial use

The public merchant owns payment verification, response preparation,
settlement, response transport, and actual economic receipts. It must run
admission before the payment challenge and prepare a verified result
before settlement. A computed present value is not an observed balance,
expected investment performance or authorization to trade.

The [JSON Schema](../data/schema/exact-cash-flow-work.schema.json) declares
the default service profile's transport envelope and native source fields. Schema admission checks
representation, while numerical and cellular replay establish the
specified conditional claims. Source tests, immutable publication,
installed merchant use, independent customer acceptance and external
payment remain distinct receiving stages.
