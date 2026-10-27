/** Exact, bounded discrete cash-flow valuation. See cash-flow.md for the contract. */
import {
  rationalOfBigInts, rationalParts, ratAdd, ratSubtract, ratMultiply,
  ratCompare, ratEqual, ratOne, ratZero,
} from './exact-number.mjs';
import { rationalOfDecimal, decimalOfRational } from './decimal-string.mjs';

export const CASH_FLOW_DEFAULT_LIMITS = Object.freeze({
  maxCashFlows: 64, maxPeriod: 1200, maxDigits: 128,
  maxPlaces: 18, maxArithmeticDigits: 16384,
});
const CEILINGS = Object.freeze({
  maxCashFlows: 4096, maxPeriod: 100000, maxDigits: 4096,
  maxPlaces: 128, maxArithmeticDigits: 1000000,
});
const DECIMAL = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u;
const MODES = new Set(['half-even', 'half-away-from-zero', 'toward-zero']);
const UNITS = new Set(['day', 'month', 'year']);
const KIND = 'exact-number.cash-flow/v1';

function refuse(code, reason, ErrorType = RangeError) {
  throw Object.assign(new ErrorType(reason), { code });
}

// Admission consumes inert JSON records, never accessors or inherited fields.
function fields(value, names, label, { partial = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    refuse('CASH_FLOW_SHAPE', `${label} must be a plain object`, TypeError);
  const keys = Reflect.ownKeys(value);
  if ((!partial && keys.length !== names.length) || keys.some(key =>
    !names.includes(key) || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')) ||
    (!partial && names.some(key => !Object.hasOwn(value, key))))
    refuse('CASH_FLOW_SHAPE', `${label} has missing, extra or non-data fields`, TypeError);
}

export function admitCashFlowLimits(limits = {}) {
  fields(limits, Object.keys(CASH_FLOW_DEFAULT_LIMITS), 'cash-flow limits', { partial: true });
  const policy = { ...CASH_FLOW_DEFAULT_LIMITS, ...limits };
  for (const [name, value] of Object.entries(policy)) {
    const floor = name === 'maxPeriod' || name === 'maxPlaces' ? 0 : 1;
    if (!Number.isSafeInteger(value) || value < floor || value > CEILINGS[name])
      refuse('CASH_FLOW_LIMITS', `${name} is outside the supported host policy range`);
  }
  return Object.freeze(policy);
}

function decimal(text, policy, label) {
  if (typeof text !== 'string')
    refuse('CASH_FLOW_DECIMAL', `${label} must be an exact decimal string`, TypeError);
  // Bound length before scanning or parsing untrusted numeric content.
  if (text.length > policy.maxDigits + 2)
    refuse('CASH_FLOW_DIGITS_LIMIT', `${label} exceeds the decimal digit limit`);
  if (!DECIMAL.test(text))
    refuse('CASH_FLOW_DECIMAL', `${label} is not a canonical plain decimal string`, TypeError);
  const digits = text.length - Number(text.startsWith('-')) - Number(text.includes('.'));
  if (digits > policy.maxDigits)
    refuse('CASH_FLOW_DIGITS_LIMIT', `${label} exceeds the decimal digit limit`);
  return { digits, scale: text.includes('.') ? text.length - text.indexOf('.') - 1 : 0 };
}

function denseArray(values, limit, label) {
  if (!Array.isArray(values)) refuse('CASH_FLOW_SHAPE', `${label} must be an array`, TypeError);
  if (Object.getPrototypeOf(values) !== Array.prototype)
    refuse('CASH_FLOW_SHAPE', `${label} must be a plain JSON array`, TypeError);
  if (values.length === 0 || values.length > limit)
    refuse('CASH_FLOW_COUNT_LIMIT', `${label} count is outside the host limit`);
  if (Reflect.ownKeys(values).length !== values.length + 1 ||
      Array.from({ length: values.length }, (_, i) => String(i)).some(key =>
        !Object.hasOwn(values, key) || !Object.hasOwn(Object.getOwnPropertyDescriptor(values, key), 'value')))
    refuse('CASH_FLOW_SHAPE', `${label} must be dense data with no extra fields`, TypeError);
}

/** Admit the complete request and conservatively bound powers before computing any. */
export function admitCashFlowRequest(body, limits = {}) {
  const policy = admitCashFlowLimits(limits);
  fields(body, ['currency', 'periodUnit', 'rate', 'cashFlows', 'rounding'], 'cash-flow request');
  if (typeof body.currency !== 'string' || !/^[A-Z][A-Z0-9]{2,11}$/u.test(body.currency))
    refuse('CASH_FLOW_SHAPE', 'currency must be a declared uppercase currency or asset code', TypeError);
  if (!UNITS.has(body.periodUnit)) refuse('CASH_FLOW_SHAPE', 'periodUnit must be day, month or year', TypeError);
  decimal(body.rate, policy, 'rate');
  fields(body.rounding, ['places', 'mode'], 'rounding');
  if (!Number.isSafeInteger(body.rounding.places) || body.rounding.places < 0 || body.rounding.places > policy.maxPlaces)
    refuse('CASH_FLOW_PLACES_LIMIT', 'rounding places exceed the host limit');
  if (!MODES.has(body.rounding.mode)) refuse('CASH_FLOW_SHAPE', 'rounding mode is unsupported', TypeError);
  denseArray(body.cashFlows, policy.maxCashFlows, 'cashFlows');
  const sizes = [];
  const cashFlows = body.cashFlows.map((row, index) => {
    fields(row, ['period', 'amount'], `cashFlows[${index}]`);
    if (!Number.isSafeInteger(row.period) || row.period < 0 || row.period > policy.maxPeriod)
      refuse('CASH_FLOW_PERIOD_LIMIT', `cashFlows[${index}] period exceeds the host limit`);
    sizes.push(decimal(row.amount, policy, `cashFlows[${index}].amount`));
    return Object.freeze({ period: row.period, amount: row.amount });
  });
  const rate = rationalOfDecimal(body.rate);
  if (ratCompare(rate, rationalOfBigInts(-1n, 1n)) <= 0)
    refuse('CASH_FLOW_RATE', 'rate must be greater than -1');
  const [growthNum, growthDen] = rationalParts(ratAdd(ratOne, rate));
  // All PV denominators divide 10^maxScale * growthNum^maxPeriod. This
  // shared form bounds sum intermediates even when row denominators differ.
  const nd = growthNum === 1n ? 0 : growthNum.toString().length;
  const dd = growthDen === 1n ? 0 : growthDen.toString().length;
  // The rate remains in the receipt even when every period is zero. Count
  // its retained carrier and growth operands before considering flow powers,
  // so every admitted producer result also fits receiving's digit bounds.
  const [rateNum, rateDen] = rationalParts(rate);
  let effort = rateNum.toString().length + rateDen.toString().length +
    growthNum.toString().length + growthDen.toString().length;
  let maxPeriod = 0, maxScale = 0, maxAmountDigits = 0;
  for (let i = 0; i < cashFlows.length; i += 1) {
    const t = cashFlows[i].period, { digits, scale } = sizes[i];
    const factorNum = 1 + t * dd, factorDen = 1 + t * nd;
    effort += factorNum + factorDen + (digits + factorNum) + (scale + 1 + factorDen) + 2 * digits;
    maxPeriod = Math.max(maxPeriod, t); maxScale = Math.max(maxScale, scale);
    maxAmountDigits = Math.max(maxAmountDigits, digits);
  }
  const commonDenDigits = maxScale + maxPeriod * nd + 1;
  const sumNumDigits = maxAmountDigits + maxScale + maxPeriod * (nd + dd) + String(cashFlows.length).length + 1;
  effort += 4 * (commonDenDigits + sumNumDigits) + 2 * body.rounding.places;
  if (!Number.isSafeInteger(effort) || effort > policy.maxArithmeticDigits)
    refuse('CASH_FLOW_ARITHMETIC_LIMIT', `cash-flow arithmetic digit bound ${effort} exceeds ${policy.maxArithmeticDigits}`);
  return Object.freeze({
    currency: body.currency, periodUnit: body.periodUnit, rate: body.rate,
    cashFlows: Object.freeze(cashFlows), rounding: Object.freeze({ ...body.rounding }),
  });
}

export function computeCashFlow(body, limits = {}) {
  const policy = admitCashFlowLimits(limits);
  const input = admitCashFlowRequest(body, policy);
  const rate = rationalOfDecimal(input.rate);
  const [growthNum, growthDen] = rationalParts(ratAdd(ratOne, rate));
  let total = ratZero;
  const cashFlows = input.cashFlows.map((row, index) => {
    const amount = rationalOfDecimal(row.amount);
    const discountFactor = rationalOfBigInts(growthDen ** BigInt(row.period), growthNum ** BigInt(row.period));
    const presentValue = ratMultiply(amount, discountFactor);
    total = ratAdd(total, presentValue);
    return Object.freeze({ index, period: row.period, amount, discountFactor, presentValue });
  });
  const roundedTotal = decimalOfRational(total, input.rounding.places, { rounding: input.rounding.mode });
  return Object.freeze({
    kind: KIND, currency: input.currency, periodUnit: input.periodUnit, rate,
    cashFlows: Object.freeze(cashFlows), total, roundedTotal,
    roundingResidual: ratSubtract(total, rationalOfDecimal(roundedTotal)),
    rounding: input.rounding, limits: policy,
  });
}

// Receiving follows a separate algorithm from the producer's native powers.
function checkPower(base, exponent) {
  let value = 1n, factor = base, left = exponent;
  while (left > 0) {
    if (left % 2 === 1) value *= factor;
    left = Math.floor(left / 2);
    if (left > 0) factor *= factor;
  }
  return value;
}

/** Independently check a bounded wire result against the original request. */
export function verifyCashFlow(body, result, limits = {}) {
  try {
    const policy = admitCashFlowLimits(limits);
    const input = admitCashFlowRequest(body, policy);
    fields(result, ['kind', 'currency', 'periodUnit', 'rate', 'cashFlows', 'total', 'roundedTotal',
      'roundingResidual', 'rounding', 'limits'], 'cash-flow result');
    fields(result.rounding, ['places', 'mode'], 'result.rounding');
    fields(result.limits, Object.keys(policy), 'result.limits');
    const reject = reason => refuse('CASH_FLOW_RECEIPT', reason);
    if (result.kind !== KIND || result.currency !== input.currency || result.periodUnit !== input.periodUnit ||
        result.rounding.places !== input.rounding.places || result.rounding.mode !== input.rounding.mode ||
        Object.keys(policy).some(key => result.limits[key] !== policy[key]))
      reject('receipt context or host policy differs from the original request');
    let receivedDigits = 0;
    const rational = (q, label) => {
      fields(q, ['kind', 'num', 'den'], label);
      if (q.kind !== 'exactNumber.rational' || typeof q.num !== 'string' || typeof q.den !== 'string')
        reject(`${label} is not an exact rational carrier`);
      receivedDigits += q.num.length + q.den.length;
      if (receivedDigits > policy.maxArithmeticDigits * 2 || q.num.length > policy.maxArithmeticDigits || q.den.length > policy.maxArithmeticDigits)
        refuse('CASH_FLOW_RECEIPT_LIMIT', 'receipt rational digits exceed the host bound');
      if (!/^(?:0|-?[1-9][0-9]*)$/u.test(q.num) || !/^[1-9][0-9]*$/u.test(q.den))
        reject(`${label} is not canonical`);
      const normalized = rationalOfBigInts(BigInt(q.num), BigInt(q.den));
      if (normalized.num !== q.num || normalized.den !== q.den) reject(`${label} is not reduced`);
      return normalized;
    };
    const rate = rationalOfDecimal(input.rate);
    if (!ratEqual(rational(result.rate, 'result.rate'), rate)) reject('receipt rate differs');
    denseArray(result.cashFlows, policy.maxCashFlows, 'result.cashFlows');
    if (result.cashFlows.length !== input.cashFlows.length) reject('cash-flow occurrence count differs');
    const [growthNum, growthDen] = rationalParts(ratAdd(ratOne, rate));
    let checkedTotal = ratZero;
    for (let i = 0; i < input.cashFlows.length; i += 1) {
      const row = result.cashFlows[i], original = input.cashFlows[i];
      fields(row, ['index', 'period', 'amount', 'discountFactor', 'presentValue'], `result.cashFlows[${i}]`);
      if (row.index !== i || row.period !== original.period) reject('cash-flow occurrence index or period differs');
      const amount = rational(row.amount, 'amount');
      const discount = rational(row.discountFactor, 'discountFactor');
      const value = rational(row.presentValue, 'presentValue');
      if (!ratEqual(amount, rationalOfDecimal(original.amount))) reject('cash-flow amount differs');
      const expectedDiscount = rationalOfBigInts(checkPower(growthDen, original.period), checkPower(growthNum, original.period));
      if (!ratEqual(discount, expectedDiscount)) reject('discount factor is not licensed by the supplied rate and period');
      if (!ratEqual(value, ratMultiply(amount, discount))) reject('present value does not equal amount times discount factor');
      checkedTotal = ratAdd(checkedTotal, value);
    }
    const total = rational(result.total, 'total');
    if (!ratEqual(total, checkedTotal)) reject('total does not sum all original cash-flow occurrences');
    const expectedRounded = decimalOfRational(total, input.rounding.places, { rounding: input.rounding.mode });
    if (result.roundedTotal !== expectedRounded) reject('rounded total does not follow the declared rule');
    if (!ratEqual(rational(result.roundingResidual, 'roundingResidual'), ratSubtract(total, rationalOfDecimal(expectedRounded))))
      reject('rounding residual does not reconcile to the exact total');
    return Object.freeze({ ok: true });
  } catch (error) {
    return Object.freeze({ ok: false, code: error.code ?? 'CASH_FLOW_RECEIPT', reason: error.message });
  }
}
