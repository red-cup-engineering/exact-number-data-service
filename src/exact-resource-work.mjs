/**
 * Source-bound mathematical Work through the original cellular stack.
 *
 * The input is told as SignCells before the model is read for Metrologic.
 * Metrologic owns exact arithmetic, optimization and the separate certificate
 * checker. SignChain retains tellings and licenses the conditional conclusion;
 * SignGraph supplies the site and specialization; SignCraft settles it.
 * None of these tellings authenticates an issuer, a physical measurement, a
 * customer's acceptance or a payment. Those require their own observations.
 */
import {
  admitExactResourceMathWork as admitWork,
  computeExactResourceMathWork as computeWork,
  verifyExactResourceMathWork as verifyWork,
} from "./resource-work/flow-work.mjs";
import { address, cell, cellSetAddress, knowledgeReading, triple, retainedCarrier, semanticId } from "@red-cup-engineering/signcell/cell";
import { tokenFrame } from "@red-cup-engineering/signcell/token-frame";
import { TellingLog } from "@red-cup-engineering/signchain/log";
import { rule } from "@red-cup-engineering/signchain/rules";
import { valuationOf, possibilize } from "@red-cup-engineering/signchain/token-fiber";
import { site, presentSite, freeSite, specializationMorphism, transportRules } from "@red-cup-engineering/signgraph/site";
import { inheritedClaim } from "@red-cup-engineering/signgraph/token-sheaf";
import { denominator, magnitude, rationalOfBigInts, natOne, natMultiply, natDivmod,
  gcd, toBigInt } from "@red-cup-engineering/metrologic/number/exact-number";
import { settleValuation, settlementAdmits } from "@red-cup-engineering/signcraft/settle";

const KIND = "signcraft.exact-resource-evidence/v1";
const ROOT = "urn:561:mathematics:exact-resource-work";
const predicate = name => `${ROOT}:${name}`;
const scoped = (root, kind, index) => [root, kind, index];
const same = (left, right) => semanticId(left) === semanticId(right);

const POLICY_FIELDS = ["maxEvidenceRows", "maxModelDenominatorDigits"];

/** Cheap prepayment admission; an optional caller-owned capacity policy
 * limits this cellular delivery without narrowing the mathematical library. */
export function admitExactResourceMathWork(input, hostPolicy) {
  const admission = admitWork(input);
  if (hostPolicy === undefined) return admission;
  const policy = retainedCarrier(hostPolicy);
  if (!policy || typeof policy !== "object" || Array.isArray(policy) ||
      Object.keys(policy).length !== POLICY_FIELDS.length ||
      !POLICY_FIELDS.every(key => Object.hasOwn(policy, key) &&
        Number.isSafeInteger(policy[key]) && policy[key] > 0) ||
      policy.maxModelDenominatorDigits > 4096)
    throw new TypeError("resource host policy needs positive maxEvidenceRows and maxModelDenominatorDigits (at most 4096)");
  const multi = admission.operation === "exact-resource-frontier";
  const network = multi ? input.network : input;
  const { nodes, links, sources, demands } = network;
  const queries = multi ? input.budgets.length : 0;
  // These are the actual constructors below, including two policy tellings
  // and the five conclusion tellings. No solver or supplied receipt is read.
  const modelRows = 1 + nodes.length + 6 * links.length + 3 * sources.length +
    3 * demands.length + (multi ? 2 * queries : Number(Object.hasOwn(network, "budget"))) + 2;
  const witnessRows = 7 + nodes.length + 5 * links.length + 3 * sources.length + 4 * demands.length;
  const numericalRows = multi ? witnessRows * (queries + 1) + 13 * queries : 2 * witnessRows;
  const projectedEvidenceRows = modelRows + numericalRows + 5;
  if (projectedEvidenceRows > policy.maxEvidenceRows)
    throw Object.assign(new RangeError(`resource service needs ${projectedEvidenceRows} evidence rows; host limit is ${policy.maxEvidenceRows}`),
      { code: "EXACT_RESOURCE_EVIDENCE_ROWS_LIMIT" });
  const admitDenominators = (values, grade) => {
    let common = natOne;
    for (const value of values) {
      const [num, den = "1"] = String(value).split("/");
      const divisor = magnitude(denominator(rationalOfBigInts(BigInt(num), BigInt(den))));
      common = natDivmod(natMultiply(common, divisor), gcd(common, divisor)).quotient;
      if (toBigInt(common).toString().length > policy.maxModelDenominatorDigits)
        throw Object.assign(new RangeError(`resource service ${grade} common denominator exceeds ${policy.maxModelDenominatorDigits} digits`),
          { code: "EXACT_RESOURCE_MODEL_DENOMINATOR_LIMIT" });
    }
  };
  admitDenominators([...links.map(row => row.capacity), ...sources.map(row => row.capacity),
    ...demands.map(row => row.amount)], "quantity");
  admitDenominators(links.map(row => row.unitResourceCost), "cost");
  return { ...admission, hostPolicy: policy, projectedEvidenceRows };
}

// Existing Math Engineering contracts enter the same cellular producer.
// These adapters preserve its operation names without keeping a second solver.
export function admitExactResourceFlowWork(input) {
  const admission = admitWork(input);
  if (admission.operation !== "exact-resource-flow") throw new TypeError("single-budget resource work requires a network request");
  return admission;
}
export function admitExactResourceFrontierWork(input) {
  const admission = admitWork(input);
  if (admission.operation !== "exact-resource-frontier") throw new TypeError("frontier resource work requires network and budgets");
  return admission;
}
export function computeExactResourceFlowWork(input) {
  admitExactResourceFlowWork(input);
  return computeExactResourceMathWork(input);
}
export function computeExactResourceFrontierWork(input) {
  admitExactResourceFrontierWork(input);
  return computeExactResourceMathWork(input);
}
export const solveExactResourceFlow = input => computeExactResourceFlowWork(input).result;

// Low-level numerical compatibility surfaces retain their upstream conditional
// scope. They do not fabricate cellular evidence, issuer trust or authority.
export { verifyResourceFlowCertificate } from "./resource-work/flow-codec.mjs";
export { admitExactResourceEnvelope, computeExactResourceEnvelopeWork } from "./resource-work/flow-envelope.mjs";

function sourceModel(input, hostPolicy) {
  const request = retainedCarrier(input);
  const admission = admitExactResourceMathWork(request, hostPolicy);
  const policy = admission.hostPolicy;
  const requestId = address(cell(ROOT, predicate("request"),
    policy === undefined ? request : { request, hostPolicy: policy }));
  const multi = admission.operation === "exact-resource-frontier";
  const network = multi ? request.network : request;
  const prefix = multi ? ["network"] : [];
  const log = new TellingLog();
  const tell = (subject, role, value, path) => log.tell(cell(subject, predicate(role), value), {
    source: requestId, path, observation: "submitted-model-value",
  });
  tell(requestId, "mode", admission.operation, []);
  network.nodes.forEach((name, index) => tell(requestId, "node", name, [...prefix, "nodes", index]));
  for (const [collection, fields] of [
    ["links", ["id", "from", "to", "capacity", "unitResourceCost"]],
    ["sources", ["node", "capacity"]], ["demands", ["node", "amount"]],
  ]) network[collection].forEach((entry, index) => {
    const item = scoped(requestId, collection, index);
    tell(requestId, collection, item, [...prefix, collection, index]);
    for (const field of fields) tell(item, field, entry[field], [...prefix, collection, index, field]);
  });
  if (multi) request.budgets.forEach((budget, index) => {
    const item = scoped(requestId, "budgets", index);
    tell(requestId, "budgets", item, ["budgets", index]);
    tell(item, "budget", budget, ["budgets", index]);
  });
  else if (Object.hasOwn(network, "budget")) tell(requestId, "budget", network.budget, ["budget"]);
  if (policy !== undefined) for (const field of POLICY_FIELDS)
    tell(requestId, `hostPolicy.${field}`, policy[field], ["hostPolicy", field]);
  log.seal();

  // The execution model is read from the original telling cells. This is a
  // representation boundary, not a second solver or a JSON witness label.
  const objects = (subject, role) => log.where({ subject, predicate: predicate(role) }).map(row => row.object);
  const one = (subject, role) => {
    const values = objects(subject, role);
    if (values.length !== 1) throw new TypeError(`exact resource cells: expected one ${role}`);
    return values[0];
  };
  const model = { nodes: objects(requestId, "node") };
  for (const [collection, fields] of [
    ["links", ["id", "from", "to", "capacity", "unitResourceCost"]],
    ["sources", ["node", "capacity"]], ["demands", ["node", "amount"]],
  ]) model[collection] = objects(requestId, collection).map(item =>
    Object.fromEntries(fields.map(field => [field, one(item, field)])));
  const reconstructed = multi
    ? { network: model, budgets: objects(requestId, "budgets").map(item => one(item, "budget")) }
    : { ...model, ...(objects(requestId, "budget").length ? { budget: one(requestId, "budget") } : {}) };
  if (!same(reconstructed, request)) throw new TypeError("exact resource cells did not retain the submitted model");
  const reconstructedPolicy = policy === undefined ? undefined : Object.fromEntries(
    POLICY_FIELDS.map(field => [field, one(requestId, `hostPolicy.${field}`)]));
  if (policy !== undefined && !same(reconstructedPolicy, policy))
    throw new TypeError("exact resource cells did not retain the supplied host policy");
  return { requestId, admission, log, input: reconstructed, hostPolicy: reconstructedPolicy,
    modelId: cellSetAddress(log.cells()) };
}

function resultTellings(requestId, resultId, work) {
  const log = new TellingLog();
  const tell = (subject, role, value, path) => log.tell(cell(subject, predicate(role), value), {
    source: resultId, request: requestId, path, observation: "computed-model-value",
  });
  const witness = (body, lane, path) => {
    const at = scoped(resultId, "certificate", lane);
    tell(resultId, "certificate", at, path);
    for (const field of ["delivered", "resourceCost", "remainingDemand", "nextMarginalResourceCost"])
      tell(at, field, body[field], [...path, field]);
    for (const [collection, fields] of [
      ["flows", ["id", "from", "to", "volume"]],
      ["supplied", ["node", "volume"]], ["served", ["node", "requested", "delivered"]],
    ]) body[collection].forEach((entry, index) => {
      const item = scoped(at, collection, index);
      tell(at, collection, item, [...path, collection, index]);
      for (const field of fields) tell(item, field, entry[field], [...path, collection, index, field]);
    });
    body.reducedCostPotentials.forEach((value, index) =>
      tell(scoped(at, "residualVertex", index), "potential", value, [...path, "reducedCostPotentials", index]));
  };
  if (work.operation === "exact-resource-flow") {
    witness(work.result.withBudget, "funded", ["result", "withBudget"]);
    witness(work.result.withoutBudget.witness, "unbudgeted", ["result", "withoutBudget", "witness"]);
  } else {
    witness(work.originalOptimum.witness, "unbudgeted", ["originalOptimum", "witness"]);
    work.budgetQuotes.forEach((quote, index) => {
      const at = scoped(resultId, "budgetQuote", index);
      tell(resultId, "budgetQuote", at, ["budgetQuotes", index]);
      for (const field of ["budget", "maximumDelivery", "minimumResourceForMaximumDelivery", "unspentResource",
        "nextMarginalResourcePerDeliveredUnit", "demandComplete", "networkLimited", "certificateScope"])
        tell(at, field, quote[field], ["budgetQuotes", index, field]);
    });
    // The selected allocations are source-bearing propositions as well as
    // numerical carrier data. Preserve the budget occurrence and its exact
    // witness path, including repeated budgets, in the original TellingLog.
    for (const certificate of work.budgetCertificates ?? []) {
      const { index, budget } = certificate;
      const lane = ["budget", index];
      const at = scoped(resultId, "certificate", lane);
      const path = ["budgetCertificates", index];
      tell(at, "index", index, [...path, "index"]);
      tell(at, "budgetQuote", scoped(resultId, "budgetQuote", index), path);
      tell(at, "budget", budget, [...path, "budget"]);
      witness(certificate.witness, lane, [...path, "witness"]);
      tell(at, "independentlyCheckedFor", requestId, [...path, "verification"]);
    }
  }
  return log.seal();
}

function evidenceOfWork(source, work, verification) {
  const { requestId, modelId, admission } = source;
  const resultId = address(cell(requestId, predicate("result"), work));
  const numerical = resultTellings(requestId, resultId, work);
  const numericalId = cellSetAddress(numerical.cells());
  const log = new TellingLog();
  const admitted = cell(requestId, predicate("admittedModel"), modelId);
  const computed = cell(resultId, predicate("computedFrom"), modelId);
  const checked = cell(resultId, predicate("independentlyCheckedFor"), requestId);
  const conditional = cell(resultId, predicate("conditionallySolves"), requestId);
  const general = cell(resultId, predicate("conditionalMathematicalEvidenceFor"), requestId);
  const accepted = cell(resultId, predicate("customerAcceptedFor"), requestId);
  const paid = cell(resultId, predicate("paymentReceivedFor"), requestId);
  const operationType = `${ROOT}:${work.operation}`;
  const scope = work.operation === "exact-resource-flow"
    ? "independently checked funded and unbudgeted primal/dual optimality for the submitted linear model"
    : work.budgetCertificates === undefined
      ? "independently checked unbudgeted primal/dual optimum; arithmetic frontier and quote reproduction without intermediate primal certificates"
      : "independently checked unbudgeted and every requested budget primal/dual optimum; unqueried frontier and optimizer execution trace are not independently verified";
  log.tell(admitted, { source: requestId, model: modelId, admission });
  log.tell(computed, { source: resultId, request: requestId, model: modelId, numerical: numericalId,
    provider: "@red-cup-engineering/exact-number-data-service/exact-resource-work" });
  log.tell(checked, { source: resultId, request: requestId, verification, scope });
  log.tell(cell(resultId, "specializes", operationType), { source: resultId, operation: work.operation });
  log.tell(cell(operationType, predicate("certificateScope"), scope), { contract: KIND });
  log.seal();
  const conditionalRule = rule("exact-resource-independent-check/v1",
    [admitted, computed, checked].map(at => ({ cell: triple(at), atLeast: "potential" })),
    { cell: conditional, reading: "potential" });
  const base = site([...log.cells(), conditional, general, accepted, paid], [
    specializationMorphism(predicate("conditionallySolves"), predicate("conditionalMathematicalEvidenceFor")),
  ]);
  const settlement = settleValuation(base, [...log.cells(), conditional, general, accepted, paid],
    [conditionalRule, ...transportRules(base)]);
  // Transport native generators and source tellings once. Full base objects,
  // projection edges and every repeated closure stage are deterministic
  // native reconstructions, not additional observations to copy onto the wire.
  return retainedCarrier({ kind: KIND, requestId, resultId, modelId, numericalId,
    ...(source.hostPolicy === undefined ? {} : { hostPolicy: source.hostPolicy }),
    modelRows: source.log.rows, numericalRows: numerical.rows, rows: log.rows,
    site: presentSite(base), rules: settlement.rules,
    settlementId: semanticId(settlement), settledAt: settlement.settledAt,
    claims: { conditional: triple(conditional), customerAcceptance: triple(accepted), payment: triple(paid) },
    scope, issuerAuthentication: "not-established" });
}

/** Materialize the original native settlement from its retained generators. */
export function materializeExactResourceMathSettlement(received) {
  const evidence = received?.evidence;
  if (evidence?.kind !== KIND) throw new TypeError("exact resource evidence is required");
  const log = new TellingLog(evidence.rows).seal();
  const base = freeSite(evidence.site);
  // The presented site retains unwitnessed propositions as well as tellings.
  const seed = [...base.cells.map(at => cell(at.subject, at.predicate, at.object)), ...log.cells()];
  const settlement = settleValuation(base, seed, evidence.rules);
  if (semanticId(settlement) !== evidence.settlementId || settlement.settledAt !== evidence.settledAt)
    throw new TypeError("exact resource settlement differs from its source generators");
  return settlement;
}

/**
 * Read source-told claims through the original Heyting token frame, FOUR
 * fibers and source-preserving sheaf. Additional observations may support or
 * oppose a claim; knowledge join keeps both. This reader grants no authority
 * to an observation and performs no external action. For externally received
 * work, replayExactResourceMathWork first binds this presentation to the
 * request and mathematical certificate; this reader alone does not do so.
 */
export function readExactResourceMathEvidence(received, { sourceCells = [] } = {}) {
  const evidence = received?.evidence;
  if (evidence?.kind !== KIND) throw new TypeError("exact resource evidence is required");
  const settlement = materializeExactResourceMathSettlement(received);
  const admission = settlementAdmits(settlement);
  if (!admission.admitted) throw new TypeError(`exact resource settlement refused: ${admission.reason}`);
  const frame = tokenFrame([...settlement.settled, ...sourceCells]);
  const claims = Object.fromEntries(Object.entries(evidence.claims).map(([name, at]) => {
    const section = inheritedClaim(frame, at.subject, at.predicate, at.object);
    const direct = valuationOf(frame, at.predicate, at.object);
    const inherited = possibilize(frame, direct);
    const reading = inherited.find(entry => same(entry.token, at.subject))?.reading;
    const atCell = section.cells[0] ?? cell(at.subject, at.predicate, at.object);
    if (reading !== knowledgeReading(atCell)) throw new TypeError("native fiber and sheaf disagree");
    return [name, { reading, cell: atCell, sources: section.sources[0] ?? [], contested: section.contested }];
  }));
  return retainedCarrier({ kind: "signcraft.exact-resource-readings/v1", claims });
}

/** Compute a bounded exact model from actual source cells, then settle its evidence. */
export function computeExactResourceMathWork(input, hostPolicy) {
  const source = sourceModel(input, hostPolicy);
  const work = retainedCarrier(computeWork(source.input));
  const verification = verifyWork(source.input, work);
  if (!verification.verified) throw new Error(`exact resource output refused: ${verification.reason}`);
  const evidence = evidenceOfWork(source, work, verification);
  return retainedCarrier({ ...work, evidence });
}

/**
 * Buyer-side replay after JSON transport. It rechecks the mathematical
 * certificate against THIS request and reconstructs native tellings and rules;
 * supplied verified flags, identifiers and derivation summaries are not trust.
 * The mathematical verifier does not invoke the optimizer. Selected budget
 * certificates strengthen new receipts; legacy receipts retain their recorded
 * endpoint-only scope. Neither independently certifies the unqueried curve.
 */
export function replayExactResourceMathWork(input, received, hostPolicy) {
  const refuse = reason => Object.freeze({ admitted: false, reason });
  try {
    const source = sourceModel(input, hostPolicy);
    const retained = retainedCarrier(received);
    const { evidence, ...work } = retained;
    if (evidence?.kind !== KIND) return refuse("missing original cellular evidence");
    const verification = verifyWork(source.input, work);
    if (!verification.verified) return refuse(`mathematical certificate: ${verification.reason}`);
    const native = settlementAdmits(materializeExactResourceMathSettlement(retained));
    if (!native.admitted) return refuse(`settlement: ${native.reason}`);
    const expected = evidenceOfWork(source, work, verification);
    if (!same(expected, evidence)) return refuse("source cells, numerical cells or licensed derivation differ from this request and certificate");
    return retainedCarrier({ admitted: true, requestId: expected.requestId, resultId: expected.resultId,
      verification, scope: expected.scope, readings: readExactResourceMathEvidence(retained) });
  } catch (error) { return refuse(error.message); }
}
