import assert from "node:assert/strict";
import test from "node:test";
import { frameworkRigidityReadout, frameworkRigidityRows } from "../src/framework-rigidity.mjs";
import { ratRank } from "../src/rational-matrix.mjs";

// Exact integer placements and seven-contact graphs from Lenticule's
// 2026-10-01 Associative Exchange and Ring–Chain Ledger §1.
const p = [[0,0], [2,0], [0,3], [3,4], [5,2]];
const A = [[0,1],[0,2],[1,2],[0,3],[1,3],[1,4],[2,4]];
const B = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3],[3,4]];

test("material-ledger A/B: same |V|,|E|,chi,H1 but exact physical-placement rank differs", () => {
  const a = frameworkRigidityReadout(p, A);
  const b = frameworkRigidityReadout(p, B);
  assert.deepEqual([a.spaceDimension,a.vertices,a.contacts,a.rank,a.kernelDimension], [2,5,7,7,3]);
  assert.deepEqual([b.spaceDimension,b.vertices,b.contacts,b.rank,b.kernelDimension], [2,5,7,6,4]);
  assert.match(a.limitations[1], /hypotheses/);
  assert.equal(ratRank(frameworkRigidityRows(p,A)), 7);
  assert.equal(ratRank(frameworkRigidityRows(p,B)), 6);
});

test("3D tetrahedron rigidity depends on exact 3D geometry, not on a 2D Laman game", () => {
  const edges = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
  const space = [[0,0,0],[1,0,0],[0,1,0],[0,0,1]];
  const flat = [[0,0,0],[1,0,0],[0,1,0],[1,1,0]];
  const tetra = frameworkRigidityReadout(space, edges);
  const coplanar = frameworkRigidityReadout(flat, edges);
  assert.deepEqual([tetra.rank, tetra.kernelDimension], [6,6]);
  assert.deepEqual([coplanar.rank,coplanar.kernelDimension], [5,7]);
  assert.equal(tetra.model, "exact-finite-bar-framework-rigidity-matrix/v1");
});

test("degenerate planar placement is not generically rigid even for K4", () => {
  const edges = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
  const collinear = [[0,0],[1,0],[2,0],[3,0]];
  const noncollinear = [[0,0],[1,0],[0,1],[1,1]];
  assert.equal(frameworkRigidityReadout(collinear, edges).rank, 3);
  assert.equal(frameworkRigidityReadout(noncollinear, edges).rank, 5);
});

test("fractional and arbitrarily large exact coordinates retain rank with no binary64 approximation", () => {
  const fractional = frameworkRigidityRows([["0","0"],["1/2","0"]],[[0,1]]);
  assert.deepEqual(fractional,[["-1/2","0","1/2","0"]]);
  const giant=10n**80n;
  const large = [[giant,0n],[0n,giant],[giant,giant]];
  assert.equal(frameworkRigidityReadout(large,[[0,1],[1,2],[0,2]]).rank,3);
});

test("null contacts are not invented as structural bonds", () => {
  const readout = frameworkRigidityReadout([[0,0],[1,0]],[]);
  assert.equal(readout.contacts,0);
  assert.equal(readout.rank,0);
  assert.equal(readout.kernelDimension,4);
});

test("no silent coordinate coercion, extra dimensions, duplicate or invalid edges", () => {
  const ordinary = [[0,0],[1,1],[2,0]];
  for (const [vertices, contacts] of [
    [[[0,0]],[]],
    [[[0,0,0,0],[1,0,0,0]],[]],
    [[[0,0],[1,0,0]],[[0,1]]],
    [[[0,0],[0.1,1]],[[0,1]]],
    [[[0,0],["0.5",1]],[[0,1]]],
    [ordinary,[[0,0]]],
    [ordinary,[[0,3]]],
    [ordinary,[[0,1],[1,0]]],
    [ordinary,[[0,"1"]]],
    [ordinary,null],
  ]) assert.throws(()=>frameworkRigidityReadout(vertices,contacts));
});
