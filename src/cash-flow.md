# Exact discrete cash-flow valuation

## Receiving requirement

An agent supplies signed decimal cash flows, their nonnegative discrete periods,
one constant decimal rate per period, a single currency, and an explicit final
rounding rule. The provider returns the exact discounted value of every input
occurrence, their exact sum, the rounded total and the rounding residual. A
receiver checks that result against its original request without trusting a
producer flag or invoking the producer.

This is a conditional arithmetic service. The rate is supplied, not estimated;
the currency and period unit are declared, not independently authenticated.
It does not infer a yield curve, perform currency conversion, select investments,
solve IRR, or supply calendar/day-count conventions. Period zero is undiscounted.

## Contract

`./cash-flow` exports `CASH_FLOW_DEFAULT_LIMITS`, `admitCashFlowLimits`,
`admitCashFlowRequest`, `computeCashFlow`, and `verifyCashFlow`.

The request has exactly `currency`, `periodUnit`, `rate`, `cashFlows`, and
`rounding`. Currency matches `^[A-Z][A-Z0-9]{2,11}$`; periodUnit is day, month or
year. Rate and amounts are plain decimal strings matching
`^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$`. Their original lexemes remain in the admitted
request. Negative and zero amounts, repeated periods and repeated amounts are
valid; occurrences remain in input order. Rate must be greater than -1.
Cash flows are a nonempty array of exactly `{period, amount}` records; period is
a nonnegative safe integer. Rounding is exactly `{places, mode}`, with modes
half-even, half-away-from-zero and toward-zero. Round the sum once; do not sum
rounded rows.

For each occurrence i at period t, compute the exact rational multiplier
`(1 + rate)^(-t)` and multiply by its exact amount. The total is their exact sum.
The residual is `total - rational(roundedTotal)`. `roundedTotal` retains exactly
the requested number of fractional places, including trailing zeros. Rational carriers are the
existing canonical `{kind: 'exactNumber.rational', num, den}`: signed integer
numerator strings, positive denominator strings, gcd 1, and zero as 0/1.

The JSON result is exactly `{kind:'exact-number.cash-flow/v1', currency,
periodUnit, rate, cashFlows:[{index,period,amount,discountFactor,presentValue}],
total, roundedTotal, roundingResidual, rounding, limits}`. Rational fields use
the existing carrier. `limits` records the complete effective host policy.

## Admission and capacity

Default host limits: 64 cash flows, period at most 1200, at most 128 numeric
digits in each decimal string, at most 18 rounded places, and an arithmetic
digit budget of 16384. Partial host overrides accept only those five keys:
`maxCashFlows`, `maxPeriod`, `maxDigits`, `maxPlaces`, `maxArithmeticDigits`.
Hard ceilings are respectively 4096, 100000, 4096, 128 and 1000000. The service
can choose smaller limits. Limits are validated before request arithmetic.

Before powers or cash-flow products, admission derives conservative upper bounds
on the digits of power factors, per-row values, sum intermediates and final
quantization. It refuses if their aggregate exceeds maxArithmeticDigits. The
bound is a work admission policy, not a measured execution-time guarantee.
Only bounded decimal parsing and reduction of the rate occur before this check.
Input size, flow count, period, decimal scale and computation budget all have
independent checks; JSON Schema structural validation alone cannot establish the
arithmetic bound.

Malformed input throws TypeError with `CASH_FLOW_SHAPE` or
`CASH_FLOW_DECIMAL`; semantic/range/capacity refusals throw RangeError with
`CASH_FLOW_RATE`, `CASH_FLOW_LIMITS`, `CASH_FLOW_COUNT_LIMIT`,
`CASH_FLOW_PERIOD_LIMIT`, `CASH_FLOW_DIGITS_LIMIT`, `CASH_FLOW_PLACES_LIMIT`, or
`CASH_FLOW_ARITHMETIC_LIMIT`. No network, payment, wallet, clock or filesystem
effects occur. Admission precedes merchant payment authorization.

## Independent receiving

`verifyCashFlow(request,result,limits)` returns `{ok:true}` or
`{ok:false,code,reason}`. It admits the original request, binds every context and
effective limit, checks canonical bounded rational carriers and all occurrence
indices, and verifies discount powers by separate repeated-squaring arithmetic.
It checks present values, total, rounding and residual without calling
`computeCashFlow`. Altered context is rejected even when the final amount happens
to coincide. The same basic exact-number arithmetic is a shared trusted supplier;
separate tests use an independently written rational oracle.

## Trace and standards

The Leader's October 26, 2026 direction requires native Cells to carry useful
financial/mathematical work into real agent services. This owner supplies pure
exact numerical guarantees; SignCraft supplies source Cells, evidence and
settlement; the existing Market owns authorization, payment and delivery.
Source authentication, customer acceptance and payment remain separate claims.

JSON Schema Draft 2020-12 defines the structural wire vocabulary; arbitrary
precision numeric semantics in that specification do not make JavaScript Number
an exact money carrier. Exact decimal strings and the existing rational carrier
preserve digits across JSON transport. Reference:
https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-01

The period-discount formula follows the conventional discrete NPV relation;
this interface specifies explicit period indices, including t=0, rather than
an implicit first period. Reference:
https://support.microsoft.com/en-us/excel/functions/npv-function

Implementation is authored from this contract, not claimed as generated code or
a new formal proof. Qualification must retain original independent tests and
exact supplier/source identities.


## Companion: certified discount-rate / IRR interval

The original package's `./discount-rate-bracket` operation receives a separate
source-owned request `{currency,periodUnit,cashFlows,lowerRate,upperRate,iterations}`
with no implicit calendar or annualization. The numeric provider reuses
`admitCashFlowRequest` for exact canonical decimals, bounds and source
occurrences. Its deliberately smaller workload policy admits at most 24
occurrences, 64 discrete periods, 32 decimal digits, 1–32 bisections.

**Uniqueness is a mathematical precondition, not guessed by inference.** The
initial *net period-zero* amount must be negative; all later amounts must be
nonnegative with at least one positive. Then the finite discounted cash-flow
function `NPV(r)=A0+sum_{t>0} A_t/(1+r)^t` is continuous and strictly
decreasing for `r>-1`, tending to positive infinity near -1 and negative
`A0` at infinity. It has one and only one root. The source-supplied low/high
rates must additionally bracket that root; otherwise admission/refusal
returns a typed `RATE_BRACKET_` error. Generic mixed-sign funding or financing
streams can have multiple IRRs and are **refused** rather than displaying a
misleading rate.

The producer bisects the interval with **exact rational** midpoints. It returns
both original cash-flow occurrence records in submitted order, the two
canonical rational endpoint rates, their exact NPV values, the iteration
count, and an exact-root flag. An irrational rate stays an exact rational
*interval*, never a floating approximation described as a proof. Each
nonexact interval has strictly positive and negative NPV endpoint signs and
width no greater than `(originalUpper-originalLower)/2^iterations`.

`verifyDiscountRateBracketWork(originalRequest, received)` is a separate
buyer-side checker. Instead of calling the generator or trusting
`guaranteedUnique:true`, it independently evaluates the polynomial form

`(1+r)^T * NPV(r) = sum_t A_t (1+r)^(T-t)`,

checks exact rational normalization, both signs, mathematical hypotheses,
source context, every ordered occurrence and the rigorous width bound.
Only original model constraints are certified. This pure operation does **not**
authenticate an external economic observation, guarantee actual investment
performance, authorize an order, post a ledger entry, determine a quote, or
establish customer payment. SignCraft—not this number package—owns the
conversion of qualified source/result observations into actual SignCells
and evidence/settlement claims.

Original developer checks: `node --test test/discount-rate-bracket.test.mjs`,
or `npm test`; the public transport schemas are `./discount-rate-bracket-request.schema.json`
and `./discount-rate-bracket-result.schema.json`. JSON Schema does not
establish uniqueness, canonical reduced fractions, original source identity,
or the independent polynomial proof; call the source admission/receiver.
