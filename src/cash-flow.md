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
