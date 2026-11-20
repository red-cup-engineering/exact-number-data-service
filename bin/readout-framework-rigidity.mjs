#!/usr/bin/env node
/**
 * Run the original exact rational geometry solver on a caller-supplied finite
 * framework. stdin: {"vertices":[[0,0],...],"contacts":[[0,1],...]}
 * stdout: one frameworkRigidityReadout JSON, no synthetic measurements.
 */
import { readFileSync } from "node:fs";
import { frameworkRigidityReadout } from "../src/framework-rigidity.mjs";

try {
  const source = JSON.parse(readFileSync(0, "utf8"));
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError("request must be an object with vertices and contacts");
  }
  const output = frameworkRigidityReadout(source.vertices, source.contacts);
  process.stdout.write(`${JSON.stringify(output)}\n`);
} catch (error) {
  process.stderr.write(`exact framework rigidity refusal: ${error.message}\n`);
  process.exitCode = 1;
}
