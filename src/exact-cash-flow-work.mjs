/**
 * Source-bound cash-flow arithmetic through the original cellular stack.
 * Exact Number owns arithmetic and its independent checker. This module
 * retains submitted occurrences as SignCells, reads the computation from
 * those tellings, and licenses only a conditional mathematical conclusion.
 * It has no clock, filesystem, network, account or payment effects.
 */
import {
  admitCashFlowLimits, admitCashFlowRequest, computeCashFlow, verifyCashFlow,
} from "./cash-flow.mjs";
import {
  address, admitCell, cell, cellSetAddress, knowledgeReading, measured,
  retainedCarrier, semanticId, triple,
} from "@red-cup-engineering/signcell/cell";
import { tokenFrame } from "@red-cup-engineering/signcell/token-frame";
import { TellingLog } from "@red-cup-engineering/signchain/log";
import { rule } from "@red-cup-engineering/signchain/rules";
import { possibilize, valuationOf } from "@red-cup-engineering/signchain/token-fiber";
import {
  freeSite, presentSite, site, specializationMorphism, transportRules,
} from "@red-cup-engineering/signgraph/site";
import { inheritedClaim } from "@red-cup-engineering/signgraph/token-sheaf";
import { settlementAdmits, settleValuation } from "@red-cup-engineering/signcraft/settle";

const KIND = "signcraft.exact-cash-flow-work/v1";
const EVIDENCE_KIND = "signcraft.exact-cash-flow-evidence/v1";
const ROOT = "urn:561:mathematics:exact-cash-flow-work";
const NUMERICAL_PROVIDER = "@red-cup-engineering/exact-number-data-service/cash-flow";
const MAX_EVIDENCE_ROWS = 4096;
const LIMIT_FIELDS = ["maxCashFlows", "maxPeriod", "maxDigits", "maxPlaces", "maxArithmeticDigits"];
const SCOPE = "independently checked exact discounted cash-flow arithmetic and rounding for the submitted discrete-period model";
const predicate = name => `${ROOT}:${name}`;
const scoped = (root, kind, index) => [root, kind, index];
const same = (left, right) => semanticId(left) === semanticId(right);
const fail = (code, message, ErrorType = TypeError) => {
  throw Object.assign(new ErrorType(message), { code });
};

const RESULT_FIELDS = ["kind", "currency", "periodUnit", "rate", "cashFlows", "total",
  "roundedTotal", "roundingResidual", "rounding", "limits"];
const EVIDENCE_FIELDS = ["kind", "requestId", "resultId", "modelId", "numericalId", "limits",
  "projectedEvidenceRows", "modelRows", "numericalRows", "rows", "site", "rules",
  "settlementId", "settledAt", "claims", "scope"];
const wireRefuse = message => fail("CASH_FLOW_WIRE_SHAPE", message);

function ownValue(value, key, label) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, "value") ||
      (!descriptor.enumerable && !(Array.isArray(value) && key === "length")))
    wireRefuse(`${label} needs an own data field ${String(key)}`);
  return descriptor.value;
}

function wireRecord(value, names, label, partial = false) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    wireRefuse(`${label} must be a plain record`);
  const keys = Reflect.ownKeys(value);
  if ((!partial && keys.length !== names.length) ||
      keys.some(key => typeof key !== "string" || !names.includes(key)) ||
      (!partial && names.some(key => !Object.hasOwn(value, key))))
    wireRefuse(`${label} has missing or extra fields`);
  for (const key of keys) ownValue(value, key, label);
}

// Length is checked before enumerating or reading any elements. This also
// bounds rejected input before the original content owner copies or hashes it.
function wireArrayLength(value, maximum, label) {
  if (!Array.isArray(value)) wireRefuse(`${label} must be an array`);
  const length = ownValue(value, "length", label);
  if (!Number.isSafeInteger(length) || length < 0 || length > maximum)
    fail("CASH_FLOW_WIRE_LIMIT", `${label} exceeds its receiving capacity`, RangeError);
  if (Object.getPrototypeOf(value) !== Array.prototype)
    wireRefuse(`${label} must use the ordinary array prototype`);
  return length;
}

/** The cash-flow receipt is an inert JSON profile of the native carriers.
 * Admission owns capacity; SCA remains the original copying/identity owner.
 * Walk own descriptors only, so an authored map, iterator or getter cannot
 * replace evidence validation. Repeated references are permitted, cycles not. */
function boundedInertJson(value, { maxNodes, maxCharacters, maxArray = MAX_EVIDENCE_ROWS }, label) {
  let nodes = 0, characters = 0;
  const active = new WeakSet();
  const text = value => {
    characters += value.length;
    if (characters > maxCharacters)
      fail("CASH_FLOW_WIRE_LIMIT", `${label} exceeds its receiving text budget`, RangeError);
  };
  const visit = (at, depth) => {
    if (++nodes > maxNodes || depth > 32)
      fail("CASH_FLOW_WIRE_LIMIT", `${label} exceeds its receiving structure budget`, RangeError);
    if (typeof at === "string") { text(at); return; }
    if (at === null || typeof at === "boolean") return;
    if (typeof at === "number" && Number.isFinite(at)) return;
    if (!at || typeof at !== "object") wireRefuse(`${label} needs inert JSON values`);
    if (active.has(at)) wireRefuse(`${label} cannot contain a cycle`);
    active.add(at);
    if (Array.isArray(at)) {
      const length = wireArrayLength(at, maxArray, label);
      if (Reflect.ownKeys(at).length !== length + 1)
        wireRefuse(`${label} arrays cannot carry extra fields`);
      for (let index = 0; index < length; index += 1)
        visit(ownValue(at, String(index), label), depth + 1);
    } else {
      if (![Object.prototype, null].includes(Object.getPrototypeOf(at)))
        wireRefuse(`${label} needs ordinary JSON records`);
      const keys = Reflect.ownKeys(at);
      if (keys.length > 64)
        fail("CASH_FLOW_WIRE_LIMIT", `${label} has too many record fields`, RangeError);
      for (const key of keys) {
        if (typeof key !== "string") wireRefuse(`${label} cannot contain symbol fields`);
        text(key);
        visit(ownValue(at, key, label), depth + 1);
      }
    }
    active.delete(at);
  };
  visit(value, 0);
}

function preflightReceipt(received, expectedLimits) {
  wireRecord(received, ["kind", "result", "evidence"], "cash-flow envelope");
  const result = ownValue(received, "result", "cash-flow envelope");
  const evidence = ownValue(received, "evidence", "cash-flow envelope");
  wireRecord(result, RESULT_FIELDS, "cash-flow result");
  wireRecord(evidence, EVIDENCE_FIELDS, "cash-flow evidence");
  if (ownValue(received, "kind", "cash-flow envelope") !== KIND ||
      ownValue(result, "kind", "cash-flow result") !== "exact-number.cash-flow/v1" ||
      ownValue(evidence, "kind", "cash-flow evidence") !== EVIDENCE_KIND)
    wireRefuse("cash-flow receipt has a foreign version or kind");
  const limits = admitCashFlowLimits(ownValue(evidence, "limits", "cash-flow evidence"));
  if (expectedLimits !== undefined &&
      LIMIT_FIELDS.some(field => limits[field] !== expectedLimits[field]))
    wireRefuse("cash-flow receipt cannot enlarge or replace the buyer's selected host policy");
  const n = wireArrayLength(ownValue(result, "cashFlows", "cash-flow result"), limits.maxCashFlows, "result.cashFlows");
  const modelRows = wireArrayLength(ownValue(evidence, "modelRows", "cash-flow evidence"), MAX_EVIDENCE_ROWS, "evidence.modelRows");
  const numericalRows = wireArrayLength(ownValue(evidence, "numericalRows", "cash-flow evidence"), MAX_EVIDENCE_ROWS, "evidence.numericalRows");
  const rows = wireArrayLength(ownValue(evidence, "rows", "cash-flow evidence"), 5, "evidence.rows");
  const rules = wireArrayLength(ownValue(evidence, "rules", "cash-flow evidence"), 3, "evidence.rules");
  const generators = ownValue(evidence, "site", "cash-flow evidence");
  wireRecord(generators, ["kind", "cells", "specializations"], "evidence.site");
  if (ownValue(generators, "kind", "evidence.site") !== "signgraph.site")
    wireRefuse("cash-flow receipt needs original SignGraph site generators");
  const cells = wireArrayLength(ownValue(generators, "cells", "evidence.site"), 10, "evidence.site.cells");
  const specializations = wireArrayLength(ownValue(generators, "specializations", "evidence.site"), 1, "evidence.site.specializations");
  // Every collection's bound is checked before examining any array element.
  const totalRows = modelRows + numericalRows + rows;
  if (totalRows > MAX_EVIDENCE_ROWS)
    fail("CASH_FLOW_WIRE_LIMIT", "cash-flow receipt exceeds the total telling budget", RangeError);
  if (n === 0 || modelRows !== 10 + 4 * n || numericalRows !== 13 + 6 * n ||
      rows !== 5 || rules !== 3 || cells !== 10 || specializations !== 1 ||
      ownValue(evidence, "projectedEvidenceRows", "cash-flow evidence") !== totalRows)
    wireRefuse("cash-flow receipt differs from its original finite presentation");
  boundedInertJson(received, {
    maxNodes: 4096 + 64 * totalRows,
    maxCharacters: 131072 + 2048 * totalRows + 16 * limits.maxArithmeticDigits,
  }, "cash-flow receipt");
}

function retainSourceObservations(options) {
  wireRecord(options, ["sourceCells"], "cash-flow reading options", true);
  const sourceCells = Object.hasOwn(options, "sourceCells")
    ? ownValue(options, "sourceCells", "cash-flow reading options") : [];
  const length = wireArrayLength(sourceCells, MAX_EVIDENCE_ROWS, "sourceCells");
  boundedInertJson(sourceCells, {
    maxNodes: 1024 + 64 * length, maxCharacters: 65536 + 4096 * length,
  }, "sourceCells");
  return retainedCarrier(sourceCells);
}

/** Admission runs before arithmetic or a merchant challenge. Limits are
 * host arguments, never taken from the customer request. The separate
 * cellular bound counts the actual retained tellings, not decimal digits. */
export function admitExactCashFlowWork(input, limits = {}) {
  const effectiveLimits = admitCashFlowLimits(limits);
  const request = admitCashFlowRequest(input, effectiveLimits);
  // Source: 10 + 4n. Numerical: 13 + 6n. Conclusion: 5.
  const projectedEvidenceRows = 28 + 10 * request.cashFlows.length;
  if (projectedEvidenceRows > MAX_EVIDENCE_ROWS)
    fail("CASH_FLOW_EVIDENCE_ROWS_LIMIT",
      `cash-flow work needs ${projectedEvidenceRows} evidence rows; limit is ${MAX_EVIDENCE_ROWS}`, RangeError);
  return retainedCarrier({
    operation: "exact-cash-flow", request, limits: effectiveLimits, projectedEvidenceRows,
  });
}

function sourceModel(input, limits) {
  const admission = admitExactCashFlowWork(input, limits);
  const { request } = admission;
  const requestId = address(cell(ROOT, predicate("request"), {
    request, limits: admission.limits,
  }));
  const log = new TellingLog();
  const tell = (subject, role, value, path) => log.tell(cell(subject, predicate(role), value), {
    source: requestId, path, observation: "submitted-model-value",
  });
  for (const field of ["currency", "periodUnit", "rate"])
    tell(requestId, field, request[field], [field]);
  for (const field of ["places", "mode"])
    tell(requestId, `rounding.${field}`, request.rounding[field], ["rounding", field]);
  for (const field of LIMIT_FIELDS)
    tell(requestId, `limits.${field}`, admission.limits[field], ["limits", field]);
  request.cashFlows.forEach((flow, index) => {
    const at = scoped(requestId, "cashFlows", index);
    tell(requestId, "cashFlow", at, ["cashFlows", index]);
    // Indices identify source occurrences, including equal amounts at one
    // period. They are not timestamps or evidence of a cash transaction.
    tell(at, "index", index, ["cashFlows", index]);
    for (const field of ["period", "amount"])
      tell(at, field, flow[field], ["cashFlows", index, field]);
  });
  log.seal();
  const objects = (subject, role) =>
    log.where({ subject, predicate: predicate(role) }).map(row => row.object);
  const one = (subject, role) => {
    const values = objects(subject, role);
    if (values.length !== 1)
      fail("CASH_FLOW_SOURCE_RECONSTRUCTION", `cash-flow cells need one ${role}`);
    return values[0];
  };
  const reconstructed = {
    currency: one(requestId, "currency"),
    periodUnit: one(requestId, "periodUnit"),
    rate: one(requestId, "rate"),
    cashFlows: objects(requestId, "cashFlow").map((at, index) => {
      if (one(at, "index") !== index)
        fail("CASH_FLOW_SOURCE_RECONSTRUCTION", "cash-flow occurrence order changed");
      return { period: one(at, "period"), amount: one(at, "amount") };
    }),
    rounding: {
      places: one(requestId, "rounding.places"),
      mode: one(requestId, "rounding.mode"),
    },
  };
  const reconstructedLimits = Object.fromEntries(
    LIMIT_FIELDS.map(field => [field, one(requestId, `limits.${field}`)]));
  if (!same(reconstructed, request) || !same(reconstructedLimits, admission.limits))
    fail("CASH_FLOW_SOURCE_RECONSTRUCTION", "cash-flow cells did not retain the submitted model and host limits");
  return {
    admission, requestId, modelId: cellSetAddress(log.cells()), log,
    input: reconstructed, limits: reconstructedLimits,
  };
}

function resultTellings(requestId, resultId, result) {
  const log = new TellingLog();
  const tell = (subject, role, value, path) => log.tell(cell(subject, predicate(role), value), {
    source: resultId, request: requestId, path, observation: "computed-model-value",
  });
  for (const field of ["currency", "periodUnit", "rate", "total", "roundedTotal", "roundingResidual"])
    tell(resultId, field, result[field], ["result", field]);
  for (const field of ["places", "mode"])
    tell(resultId, `rounding.${field}`, result.rounding[field], ["result", "rounding", field]);
  for (const field of LIMIT_FIELDS)
    tell(resultId, `limits.${field}`, result.limits[field], ["result", "limits", field]);
  result.cashFlows.forEach((flow, index) => {
    const at = scoped(resultId, "cashFlows", index);
    tell(resultId, "cashFlow", at, ["result", "cashFlows", index]);
    for (const field of ["index", "period", "amount", "discountFactor", "presentValue"])
      tell(at, field, flow[field], ["result", "cashFlows", index, field]);
  });
  return log.seal();
}

function evidenceOfWork(source, result, verification) {
  const { requestId, modelId, admission } = source;
  const resultId = address(cell(requestId, predicate("result"), result));
  const numerical = resultTellings(requestId, resultId, result);
  const numericalId = cellSetAddress(numerical.cells());
  const log = new TellingLog();
  const admitted = cell(requestId, predicate("admittedModel"), modelId);
  const computed = cell(resultId, predicate("computedFrom"), modelId);
  const checked = cell(resultId, predicate("independentlyCheckedFor"), requestId);
  const conditional = cell(resultId, predicate("conditionallyValues"), requestId);
  const general = cell(resultId, predicate("conditionalMathematicalEvidenceFor"), requestId);
  const sourceAuthenticity = cell(requestId, predicate("sourceAuthenticatedFor"), modelId);
  const accepted = cell(resultId, predicate("customerAcceptedFor"), requestId);
  const paid = cell(resultId, predicate("paymentReceivedFor"), requestId);
  const operationType = `${ROOT}:exact-cash-flow`;
  log.tell(admitted, {
    source: requestId, model: modelId,
    admission: { operation: admission.operation, limits: admission.limits,
      projectedEvidenceRows: admission.projectedEvidenceRows },
  });
  log.tell(computed, {
    source: resultId, request: requestId, model: modelId, numerical: numericalId,
    provider: NUMERICAL_PROVIDER,
  });
  log.tell(checked, {
    source: resultId, request: requestId, verification, scope: SCOPE,
    provider: `${NUMERICAL_PROVIDER}#verifyCashFlow`,
  });
  log.tell(cell(resultId, "specializes", operationType), {
    source: resultId, operation: "exact-cash-flow",
  });
  log.tell(cell(operationType, predicate("certificateScope"), SCOPE), { contract: EVIDENCE_KIND });
  log.seal();
  if (source.log.rows.length + numerical.rows.length + log.rows.length !== admission.projectedEvidenceRows)
    fail("CASH_FLOW_EVIDENCE_ROWS_MISMATCH", "cash-flow evidence differs from its admitted row budget");
  const conditionalRule = rule("exact-cash-flow-independent-check/v1",
    [admitted, computed, checked].map(at => ({ cell: triple(at), atLeast: "potential" })),
    { cell: conditional, reading: "potential" });
  const seed = [...log.cells(), conditional, general, sourceAuthenticity, accepted, paid];
  const base = site(seed, [specializationMorphism(
    predicate("conditionallyValues"), predicate("conditionalMathematicalEvidenceFor"))]);
  const settlement = settleValuation(base, seed, [conditionalRule, ...transportRules(base)]);
  return retainedCarrier({
    kind: EVIDENCE_KIND, requestId, resultId, modelId, numericalId,
    limits: source.limits, projectedEvidenceRows: admission.projectedEvidenceRows,
    modelRows: source.log.rows, numericalRows: numerical.rows, rows: log.rows,
    site: presentSite(base), rules: settlement.rules,
    settlementId: semanticId(settlement), settledAt: settlement.settledAt,
    claims: { conditional: triple(conditional), sourceAuthenticity: triple(sourceAuthenticity),
      customerAcceptance: triple(accepted), payment: triple(paid) },
    scope: SCOPE,
  });
}

function materializeSettlement(received) {
  const evidence = received?.evidence;
  if (received?.kind !== KIND || evidence?.kind !== EVIDENCE_KIND)
    fail("CASH_FLOW_EVIDENCE_REQUIRED", "original cellular cash-flow evidence is required");
  // Readout labels cannot rename mathematical evidence into payment or
  // customer acceptance even when the caller only reads this presentation.
  const expectedClaims = {
    conditional: triple(cell(evidence.resultId, predicate("conditionallyValues"), evidence.requestId)),
    sourceAuthenticity: triple(cell(evidence.requestId, predicate("sourceAuthenticatedFor"), evidence.modelId)),
    customerAcceptance: triple(cell(evidence.resultId, predicate("customerAcceptedFor"), evidence.requestId)),
    payment: triple(cell(evidence.resultId, predicate("paymentReceivedFor"), evidence.requestId)),
  };
  if (!same(expectedClaims, evidence.claims))
    fail("CASH_FLOW_EVIDENCE_CLAIMS", "cash-flow claim labels differ from their source coordinates");
  if (!Array.isArray(evidence.rows) || evidence.rows.length !== 5 ||
      !Array.isArray(evidence.rules) || evidence.rules.length > MAX_EVIDENCE_ROWS)
    fail("CASH_FLOW_EVIDENCE_SHAPE", "cash-flow settlement has an invalid bounded presentation");
  const log = new TellingLog(evidence.rows).seal();
  const base = freeSite(evidence.site);
  const seed = [...base.cells.map(at => cell(at.subject, at.predicate, at.object)), ...log.cells()];
  const settlement = settleValuation(base, seed, evidence.rules);
  if (semanticId(settlement) !== evidence.settlementId || settlement.settledAt !== evidence.settledAt)
    fail("CASH_FLOW_SETTLEMENT_CHANGED", "cash-flow settlement differs from its original generators");
  const admission = settlementAdmits(settlement);
  if (!admission.admitted)
    fail("CASH_FLOW_SETTLEMENT_REFUSED", `cash-flow settlement refused: ${admission.reason}`);
  return settlement;
}

/** Read a retained presentation and separately supplied source observations.
 * Externally received work must pass replay against the buyer's input first.
 * This reader authenticates no source and never turns a presumed reading
 * without witnesses into observed customer acceptance or payment. */
export function readExactCashFlowEvidence(received, options = {}) {
  preflightReceipt(received);
  const sourceCells = retainSourceObservations(options);
  const retained = retainedCarrier(received);
  const settlement = materializeSettlement(retained);
  const observations = sourceCells.map(source => {
    const at = admitCell(source);
    if (!measured(at))
      fail("CASH_FLOW_UNWITNESSED_SOURCE_CELL", "a source observation must retain its witnessed value");
    return at;
  });
  const frame = tokenFrame([...settlement.settled, ...observations]);
  const claims = Object.fromEntries(Object.entries(retained.evidence.claims).map(([name, at]) => {
    const section = inheritedClaim(frame, at.subject, at.predicate, at.object);
    const inherited = possibilize(frame, valuationOf(frame, at.predicate, at.object));
    const reading = inherited.find(entry => same(entry.token, at.subject))?.reading;
    const atCell = section.cells[0] ?? cell(at.subject, at.predicate, at.object);
    if (reading !== knowledgeReading(atCell))
      fail("CASH_FLOW_EVIDENCE_READING", "native cash-flow fiber and sheaf disagree");
    return [name, { reading, cell: atCell, sources: section.sources[0] ?? [], contested: section.contested }];
  }));
  return retainedCarrier({ kind: "signcraft.exact-cash-flow-readings/v1", claims });
}

/** Compute from admitted source cells, independently check, then settle the
 * conditional claim. The computed amount is not a balance or observed price. */
export function computeExactCashFlowWork(input, limits = {}) {
  const source = sourceModel(input, limits);
  const result = retainedCarrier(computeCashFlow(source.input, source.limits));
  const verification = verifyCashFlow(source.input, result, source.limits);
  if (!verification.ok)
    fail("CASH_FLOW_PRODUCER_CHECK_FAILED", `cash-flow output refused: ${verification.reason}`, Error);
  const work = retainedCarrier({ kind: KIND, result, evidence: evidenceOfWork(source, result, verification) });
  // The merchant receives a complete response only after the same public
  // replay boundary its buyer can use has admitted numerical and cellular
  // evidence. A construction defect must fail before payment settlement.
  const replay = replayExactCashFlowWork(source.input, work, source.limits);
  if (!replay.admitted)
    fail("CASH_FLOW_PRODUCER_REPLAY_FAILED", `cash-flow evidence refused: ${replay.reason}`, Error);
  return work;
}

/** Replay a JSON-transported result against THIS request and host policy.
 * Numerical checking never calls the numerical producer. Source/numerical
 * rows and licensed rules must equal the independent reconstruction before
 * any supplied settlement rules are interpreted. */
export function replayExactCashFlowWork(input, received, limits = {}) {
  const refuse = (code, reason) => Object.freeze({ admitted: false, code, reason });
  try {
    const source = sourceModel(input, limits);
    preflightReceipt(received, source.limits);
    const retained = retainedCarrier(received);
    if (retained?.kind !== KIND || retained.evidence?.kind !== EVIDENCE_KIND ||
        Object.keys(retained).length !== 3 ||
        !["kind", "result", "evidence"].every(key => Object.hasOwn(retained, key)))
      return refuse("CASH_FLOW_EVIDENCE_REQUIRED", "missing original cellular cash-flow envelope");
    const verification = verifyCashFlow(source.input, retained.result, source.limits);
    if (!verification.ok)
      return refuse(verification.code ?? "CASH_FLOW_VERIFICATION_FAILED", `mathematical certificate: ${verification.reason}`);
    const expected = evidenceOfWork(source, retained.result, verification);
    if (!same(expected, retained.evidence))
      return refuse("CASH_FLOW_EVIDENCE_CHANGED", "source cells, numerical cells or licensed derivation differ from this request and certificate");
    return retainedCarrier({
      admitted: true, requestId: expected.requestId, resultId: expected.resultId,
      verification, scope: expected.scope, readings: readExactCashFlowEvidence(retained),
    });
  } catch (error) {
    return refuse(typeof error?.code === "string" ? error.code : "CASH_FLOW_REPLAY_REFUSED",
      error instanceof Error ? error.message : String(error));
  }
}
