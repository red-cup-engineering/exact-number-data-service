import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const source = process.env.ASSAY_CASH_FLOW_PATH ?? new URL("../src/cash-flow.mjs", import.meta.url).pathname;
assert.ok(source, 'ASSAY_CASH_FLOW_PATH must name the exact cash-flow.mjs candidate');
const {
  CASH_FLOW_DEFAULT_LIMITS, admitCashFlowLimits, admitCashFlowRequest,
  computeCashFlow, verifyCashFlow,
} = await import(pathToFileURL(source).href);

// Independent rational oracle: native BigInt integer pairs, separate from the
// production opaque arithmetic carrier. Discounting uses repeated division,
// and expected monetary ties are supplied explicitly below.
const abs = n => n < 0n ? -n : n;
const gcd = (a, b) => { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; };
function q(n, d = 1n) {
  assert.notEqual(d, 0n);
  if (d < 0n) [n, d] = [-n, -d];
  const g = gcd(n, d); return { n: n / g, d: d / g };
}
const add = (a, b) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => q(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => q(a.n * b.n, a.d * b.d);
const div = (a, b) => q(a.n * b.d, a.d * b.n);
function dec(s) {
  const [whole, tail = ''] = s.split('.');
  const negative = whole.startsWith('-');
  return q(BigInt(whole.replace('-', '') + tail) * (negative ? -1n : 1n), 10n ** BigInt(tail.length));
}
const asWire = a => ({ kind: 'exactNumber.rational', num: String(a.n), den: String(a.d) });
function quantize(a, { places, mode }) {
  const scale = 10n ** BigInt(places);
  const absolute = abs(a.n) * scale;
  let units = absolute / a.d;
  const rem = absolute % a.d;
  if (mode !== 'toward-zero' && (rem * 2n > a.d ||
      (rem * 2n === a.d && (mode === 'half-away-from-zero' || units % 2n === 1n)))) units++;
  const digits = String(units).padStart(places + 1, '0');
  const text = places ? `${digits.slice(0, -places)}.${digits.slice(-places)}` : digits;
  return a.n < 0n && units !== 0n ? `-${text}` : text;
}
function oracle(body) {
  const rate = dec(body.rate), growth = add(q(1n), rate);
  let total = q(0n);
  const cashFlows = body.cashFlows.map(({ period, amount }, index) => {
    let discountFactor = q(1n);
    for (let t = 0; t < period; t++) discountFactor = div(discountFactor, growth);
    const value = dec(amount), presentValue = mul(value, discountFactor);
    total = add(total, presentValue);
    return { index, period, amount: asWire(value), discountFactor: asWire(discountFactor), presentValue: asWire(presentValue) };
  });
  const roundedTotal = quantize(total, body.rounding);
  return { rate: asWire(rate), cashFlows, total: asWire(total), roundedTotal,
    roundingResidual: asWire(sub(total, dec(roundedTotal))) };
}
const wire = x => JSON.parse(JSON.stringify(x));
const body = (changes = {}) => ({ currency: 'USD', periodUnit: 'year', rate: '0.1',
  cashFlows: [{ period: 0, amount: '-1000' }, { period: 1, amount: '600' }, { period: 2, amount: '600' }],
  rounding: { places: 2, mode: 'half-even' }, ...changes });
function assertComputed(input, limits) {
  const before = wire(input), received = computeCashFlow(input, limits), expected = oracle(input);
  assert.deepEqual(input, before, 'pure producer must preserve caller input');
  assert.equal(received.kind, 'exact-number.cash-flow/v1');
  assert.equal(received.currency, input.currency); assert.equal(received.periodUnit, input.periodUnit);
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(received[key], value, key);
  assert.deepEqual(received.rounding, input.rounding);
  assert.deepEqual(received.limits, admitCashFlowLimits(limits));
  assert.deepEqual(verifyCashFlow(input, wire(received), limits), { ok: true });
  assert.equal(Object.hasOwn(received, 'payment'), false);
  assert.equal(Object.hasOwn(received, 'customerAcceptance'), false);
  return received;
}
const refuses = fn => assert.throws(fn, error => typeof error?.code === 'string' && error.code.startsWith('CASH_FLOW_'));

test('inherited array behavior is refused before request or result callbacks execute', () => {
  let executed = false;
  class AuthoredArray extends Array {
    map() { executed = true; return []; }
  }
  const input = body();
  const authoredFlows = new AuthoredArray(...input.cashFlows);
  refuses(() => admitCashFlowRequest({ ...input, cashFlows: authoredFlows }));
  assert.equal(executed, false);
  refuses(() => computeCashFlow({ ...input, cashFlows: authoredFlows }));
  assert.equal(executed, false);
  const received = wire(computeCashFlow(input));
  received.cashFlows = new AuthoredArray(...received.cashFlows);
  assert.equal(verifyCashFlow(input, received).ok, false);
  assert.equal(executed, false);
});

test('tight arithmetic policy accounts for the retained exact rate even at period zero', () => {
  for (const rate of ['9'.repeat(128), `0.${'0'.repeat(126)}1`]) {
    const input = body({ rate, cashFlows: [{ period: 0, amount: '1' }] });
    assert.throws(() => admitCashFlowRequest(input, { maxArithmeticDigits: 32 }),
      { code: 'CASH_FLOW_ARITHMETIC_LIMIT' });
    assert.throws(() => computeCashFlow(input, { maxArithmeticDigits: 32 }),
      { code: 'CASH_FLOW_ARITHMETIC_LIMIT' });
    const limits = { maxArithmeticDigits: 1024 };
    const received = computeCashFlow(input, limits);
    assert.equal(received.roundedTotal, '1.00');
    assert.deepEqual(verifyCashFlow(input, wire(received), limits), { ok: true });
  }
});

test('NPV has exact per-flow discounts, total, rounded value and conserved residual', () => {
  const result = assertComputed(body());
  assert.deepEqual(result.total, asWire(q(5000n, 121n)));
  assert.equal(result.roundedTotal, '41.32');
  assert.deepEqual(result.roundingResidual, asWire(q(7n, 3025n)));
  assert.deepEqual(result.cashFlows[1].discountFactor, asWire(q(10n, 11n)));
  assert.deepEqual(result.cashFlows[2].discountFactor, asWire(q(100n, 121n)));
});

test('zero and negative rates are exact per-period conventions', () => {
  const zero = body({ rate: '-0', cashFlows: [
    { period: 0, amount: '0.10' }, { period: 100, amount: '0.20' }, { period: 100, amount: '-0.30' },
  ] });
  const r = assertComputed(zero);
  assert.deepEqual(r.total, asWire(q(0n))); assert.equal(r.roundedTotal, '0.00');
  assert.deepEqual(r.cashFlows.map(x => x.index), [0, 1, 2]);
  const negative = body({ rate: '-0.5', cashFlows: [
    { period: 0, amount: '-100' }, { period: 1, amount: '75' }, { period: 2, amount: '10' },
  ] });
  assert.deepEqual(assertComputed(negative).total, asWire(q(90n)));
  for (const periodUnit of ['day', 'month', 'year']) {
    const result = assertComputed({ ...negative, periodUnit });
    assert.deepEqual(result.total, asWire(q(90n)), 'rate is per declared period, no implicit annualization');
  }
});

test('all signs and three quantization modes resolve exact half ties', () => {
  const fixtures = [
    ['1.005', 2, ['1.00', '1.01', '1.00']],
    ['-1.005', 2, ['-1.00', '-1.01', '-1.00']],
    ['1.015', 2, ['1.02', '1.02', '1.01']],
    ['-1.015', 2, ['-1.02', '-1.02', '-1.01']],
    ['0.5', 0, ['0', '1', '0']],
    ['-0.5', 0, ['0', '-1', '0']],
    ['1.5', 0, ['2', '2', '1']],
    ['2.5', 0, ['2', '3', '2']],
    ['-2.5', 0, ['-2', '-3', '-2']],
  ];
  for (const [amount, places, expected] of fixtures) {
    for (const [index, mode] of ['half-even', 'half-away-from-zero', 'toward-zero'].entries()) {
      const result = assertComputed(body({ rate: '0', cashFlows: [{ period: 0, amount }], rounding: { places, mode } }));
      assert.equal(result.roundedTotal, expected[index], `${amount} ${places} ${mode}`);
    }
  }
});

test('quantization applies to the exact aggregate, not separately rounded cash flows', () => {
  const input = body({ rate: '0', cashFlows: [{ period: 1, amount: '0.005' }, { period: 1, amount: '0.005' }] });
  const result = assertComputed(input);
  assert.equal(result.roundedTotal, '0.01');
  assert.equal(result.cashFlows.length, 2);
  assert.deepEqual(result.cashFlows.map(x => x.presentValue), [asWire(q(1n, 200n)), asWire(q(1n, 200n))]);
});

test('large exact amounts, long decimal rates and repeated periods survive JSON transport', () => {
  for (const input of [
    body({ rate: '1', cashFlows: [{ period: 1, amount: '9007199254740993' }] }),
    body({ rate: '0.000000000000000001', cashFlows: [{ period: 3, amount: '123456789123456789123456789.123456789' }] }),
    body({ rate: '-0.999', cashFlows: [{ period: 3, amount: '-0.001' }, { period: 3, amount: '0.002' }] }),
    body({ rate: '0.125', cashFlows: [{ period: 7, amount: '-17.0005' }, { period: 17, amount: '42.125' }, { period: 7, amount: '19.0005' }] }),
  ]) assertComputed(input);
  assert.equal(assertComputed(body({ rate: '1', cashFlows: [{ period: 1, amount: '9007199254740993' }] })).roundedTotal, '4503599627370496.50');
});

test('admission freezes a separate source model and retains authored decimal lexemes and occurrences', () => {
  const input = body({ rate: '-0.000', cashFlows: [{ period: 2, amount: '1.00' }, { period: 2, amount: '1.00' }] });
  const admitted = admitCashFlowRequest(input);
  assert.deepEqual(admitted, input);
  assert.notEqual(admitted, input); assert.notEqual(admitted.cashFlows, input.cashFlows);
  assert.equal(Object.isFrozen(admitted), true);
  assert.equal(Object.isFrozen(admitted.cashFlows), true);
  assert.equal(Object.isFrozen(admitted.cashFlows[0]), true);
  assert.equal(Object.isFrozen(admitted.rounding), true);
  input.cashFlows[0].amount = '999';
  assert.equal(admitted.cashFlows[0].amount, '1.00');
});

test('strict schema refuses coercion, ambiguous conventions and unknown properties before computation', () => {
  const badBodies = [null, [], {}, { ...body(), extra: true }, { ...body(), limits: {} },
    { ...body(), currency: 'usd' }, { ...body(), currency: 'US' }, { ...body(), currency: 'USD USD' },
    { ...body(), currency: 'US$' }, { ...body(), periodUnit: 'quarter' },
    { ...body(), rounding: { places: 2, mode: 'bankers' } },
    { ...body(), rounding: { places: 2, mode: 'half-even', policy: 'extra' } },
    { ...body(), rounding: { places: 1.5, mode: 'half-even' } },
    { ...body(), rounding: { places: 19, mode: 'half-even' } },
    { ...body(), cashFlows: [] },
    { ...body(), cashFlows: [{ period: 1, amount: '1', currency: 'USD' }] },
    { ...body(), cashFlows: [{ period: '1', amount: '1' }] },
    { ...body(), cashFlows: [{ period: -1, amount: '1' }] },
    { ...body(), cashFlows: [{ period: 1.5, amount: '1' }] },
    { ...body(), cashFlows: [{ period: Number.MAX_SAFE_INTEGER + 1, amount: '1' }] },
  ];
  for (const invalid of badBodies) refuses(() => admitCashFlowRequest(invalid));
  for (const invalid of ['-1', '-1.0001', '1e-3', '+1', ' 1', '1 ', '.5', '01', '1.', 'NaN', 'Infinity', '1/2', '', 1, null]) {
    refuses(() => admitCashFlowRequest(body({ rate: invalid })));
  }
  for (const invalid of ['1e5', '+1', '00', '1.', '', NaN, Infinity, 1, null]) {
    refuses(() => admitCashFlowRequest(body({ cashFlows: [{ period: 1, amount: invalid }] })));
  }
});

test('host limits are explicit and finite and reject oversized work at admission', () => {
  assert.deepEqual(CASH_FLOW_DEFAULT_LIMITS, { maxCashFlows: 64, maxPeriod: 1200, maxDigits: 128, maxPlaces: 18, maxArithmeticDigits: 16384 });
  assert.deepEqual(admitCashFlowLimits(), CASH_FLOW_DEFAULT_LIMITS);
  assert.deepEqual(admitCashFlowLimits({ maxCashFlows: 2 }), { ...CASH_FLOW_DEFAULT_LIMITS, maxCashFlows: 2 });
  for (const invalid of [null, [], { other: 1 }, { maxCashFlows: 0 }, { maxDigits: 0 },
    { maxArithmeticDigits: Infinity }, { maxPeriod: -1 }, { maxPlaces: 129 }, { maxCashFlows: 1.5 }]) refuses(() => admitCashFlowLimits(invalid));
  refuses(() => admitCashFlowRequest(body({ cashFlows: Array.from({ length: 65 }, () => ({ period: 0, amount: '1' })) })));
  refuses(() => admitCashFlowRequest(body({ cashFlows: [{ period: 1201, amount: '1' }] })));
  refuses(() => admitCashFlowRequest(body({ cashFlows: [{ period: 0, amount: '9'.repeat(129) }] })));
  refuses(() => admitCashFlowRequest(body({ rate: '0.' + '9'.repeat(127), cashFlows: [{ period: 1200, amount: '1' }] })));
  refuses(() => admitCashFlowRequest(body(), { maxCashFlows: 2 }));
  refuses(() => admitCashFlowRequest(body(), { maxArithmeticDigits: 8 }));
  assertComputed(body({ rate: '0', cashFlows: [{ period: 1200, amount: '1' }] }));
});

test('independent verification rejects every changed equation, metadata, ordering and claimed authority', () => {
  const input = body(), original = assertComputed(input);
  const mutations = [
    r => { r.kind = 'another-kind'; }, r => { r.currency = 'EUR'; }, r => { r.periodUnit = 'month'; },
    r => { r.rate.num = '2'; }, r => { r.total.num = '5001'; },
    r => { r.roundedTotal = '41.33'; }, r => { r.roundingResidual.num = '8'; },
    r => { r.cashFlows[1].amount.num = '601'; }, r => { r.cashFlows[1].period = 2; },
    r => { r.cashFlows[1].index = 0; }, r => { r.cashFlows[1].discountFactor.num = '11'; },
    r => { r.cashFlows[1].presentValue.num = '5999'; },
    r => { r.cashFlows.reverse(); }, r => { r.cashFlows.pop(); },
    r => { r.rounding.mode = 'toward-zero'; }, r => { r.limits.maxCashFlows = 63; },
    r => { r.verified = true; }, r => { r.payment = { settled: true }; },
    r => { r.cashFlows[0].discountFactor = { kind: 'exactNumber.rational', num: '2', den: '2' }; },
    r => { r.total.den = '0'; }, r => { r.total.num = '+5000'; },
  ];
  for (const mutate of mutations) {
    const changed = wire(original); mutate(changed);
    const verdict = verifyCashFlow(input, changed);
    assert.equal(verdict.ok, false, mutate.toString());
    assert.match(verdict.code, /^CASH_FLOW_/);
    assert.equal(typeof verdict.reason, 'string');
  }
  for (const changed of [body({ currency: 'EUR' }), body({ periodUnit: 'month' }), body({ rate: '0.2' }),
    body({ rounding: { places: 2, mode: 'toward-zero' } })]) assert.equal(verifyCashFlow(changed, original).ok, false);
  assert.equal(verifyCashFlow(input, original, { maxCashFlows: 63 }).ok, false);
  assert.equal(verifyCashFlow(input, null).ok, false);
});
