import assert from "node:assert/strict";
import test from "node:test";
import { fromRatio } from "@red-cup-engineering/metrologic/number/exact-number";
import { solveExactResourceFlow } from "@red-cup-engineering/metrologic/number/exact-resource-flow";
import { verifyResourceFlowCertificate } from "@red-cup-engineering/metrologic/number/resource-flow-verifier";
import {
  computeExactResourceMathWork, replayExactResourceMathWork,
} from "@red-cup-engineering/exact-number-data-service/exact-resource-work";

const model = {
  nodes: ["A", "B"],
  links: [{ id: "ab", from: "A", to: "B", capacity: "10", unitResourceCost: "2" }],
  sources: [{ node: "A", capacity: "10" }],
  demands: [{ node: "B", amount: "9" }],
};

test("the optimizer and independent checker share native rational carriers", () => {
  const native = {
    ...model,
    links: [{ ...model.links[0], capacity: fromRatio(10, 1), unitResourceCost: fromRatio(2, 1) }],
    sources: [{ node: "A", capacity: fromRatio(10, 1) }],
    demands: [{ node: "B", amount: fromRatio(9, 1) }],
    budget: fromRatio(5, 1),
  };
  const claim = solveExactResourceFlow(native);
  assert.deepEqual(claim.withBudget.delivered, fromRatio(5, 2));
  assert.equal(verifyResourceFlowCertificate(native, claim).verified, true);
  const forged = { ...claim, withBudget: { ...claim.withBudget, resourceCost: fromRatio(4, 1) } };
  assert.equal(verifyResourceFlowCertificate(native, forged).verified, false);
});

test("the number service presents and independently replays budget and frontier Work", () => {
  for (const request of [{ ...model, budget: "5" }, { network: model, budgets: ["0", "5", "10"] }]) {
    const answer = JSON.parse(JSON.stringify(computeExactResourceMathWork(request)));
    assert.equal(replayExactResourceMathWork(request, answer).admitted, true);
  }
  const request = { ...model, budget: "5" };
  const answer = JSON.parse(JSON.stringify(computeExactResourceMathWork(request)));
  assert.equal(answer.result.withBudget.delivered, "5/2");
  answer.result.withBudget.resourceCost = "4";
  assert.equal(replayExactResourceMathWork(request, answer).admitted, false);
});
