import { rationalOfBigInts } from "@red-cup-engineering/metrologic/number/exact-number";
import {
  solveExactResourceFlow, solveExactResourceFrontier,
} from "@red-cup-engineering/metrologic/number/exact-resource-flow";
import {
  verifyResourceFlowCertificate as verify,
} from "@red-cup-engineering/metrologic/number/resource-flow-verifier";
import { ratioTextOfRational } from "../ratio-text.mjs";

const SOURCE_RATIO = /^\d{1,14}(?:\/[1-9]\d{0,13})?$/u;
const CLAIM_RATIO = /^-?\d{1,4096}(?:\/[1-9]\d{0,4095})?$/u;

function readRatio(value, grammar, signed = false) {
  const text = Number.isSafeInteger(value) ? String(value) : value;
  if (typeof text !== "string" || !grammar.test(text) || (!signed && text.startsWith("-")))
    throw new TypeError("malformed exact resource ratio");
  const [numerator, denominator = "1"] = text.split("/");
  return rationalOfBigInts(BigInt(numerator), BigInt(denominator));
}

const readSource = value => readRatio(value, SOURCE_RATIO);
const readClaim = value => readRatio(value, CLAIM_RATIO);
const readPotential = value => readRatio(value, CLAIM_RATIO, true);

export const writeResourceRational = value =>
  ratioTextOfRational(value, { integerShorthand: true });

function readModel(spec) {
  return {
    nodes: spec.nodes,
    links: spec.links.map(row => ({
      ...row, capacity: readSource(row.capacity), unitResourceCost: readSource(row.unitResourceCost),
    })),
    sources: spec.sources.map(row => ({ ...row, capacity: readSource(row.capacity) })),
    demands: spec.demands.map(row => ({ ...row, amount: readSource(row.amount) })),
    ...(spec.budget == null ? {} : { budget: readSource(spec.budget) }),
  };
}

function writeReadout(value) {
  if (value?.kind === "exactNumber.rational") return writeResourceRational(value);
  if (Array.isArray(value)) return value.map(writeReadout);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, writeReadout(item)]));
  return value;
}

export function solveResourceFlow(spec) {
  return writeReadout(solveExactResourceFlow(readModel(spec)));
}

export function solveResourceFrontier(spec, budgets) {
  return writeReadout(solveExactResourceFrontier(readModel(spec), budgets.map(readSource)));
}

/** Decode only the fields used by the independent mathematical checker. */
export function verifyResourceFlowCertificate(spec, claim) {
  const funded = claim?.withBudget;
  if (!funded) throw new TypeError("malformed problem or claim");
  return writeReadout(verify(readModel(spec), {
    totalDemand: readClaim(claim.totalDemand),
    budget: claim.budget == null ? null : readClaim(claim.budget),
    allDemandFeasible: claim.allDemandFeasible,
    withBudget: {
      delivered: readClaim(funded.delivered),
      resourceCost: readClaim(funded.resourceCost),
      remainingDemand: readClaim(funded.remainingDemand),
      flows: funded.flows.map(row => ({ ...row, volume: readClaim(row.volume) })),
      supplied: funded.supplied.map(row => ({ ...row, volume: readClaim(row.volume) })),
      served: funded.served.map(row => ({
        ...row, requested: readClaim(row.requested), delivered: readClaim(row.delivered),
      })),
      reducedCostPotentials: funded.reducedCostPotentials.map(readPotential),
    },
  }));
}
