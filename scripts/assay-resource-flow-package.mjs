/**
 * The original exact-number package producer must fabricate reproducible
 * source-pinned tarballs and be received by a truly isolated Node consumer.
 *
 * This is NOT registry publication, a Cold Red Gate install, a provider
 * energy meter, beneficiary Work acceptance or economic settlement.
 */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const sourceRoot=dirname(dirname(fileURLToPath(import.meta.url)));
const scratch=mkdtempSync(join(tmpdir(),"exact-number-pack-receive-"));
const environment={
 ...process.env,
 npm_config_offline:"true",
 npm_config_ignore_scripts:"true",
 npm_config_audit:"false",
 npm_config_fund:"false"
};
const run=(command,args,cwd)=>{
 const result=spawnSync(command,args,{
  cwd,env:environment,encoding:"utf8",timeout:120000,maxBuffer:1024*1024
 });
 if(result.error)throw result.error;
 if(result.status!==0)
  throw new Error(command+" "+args.join(" ")+" failed (exit "+result.status+
   "): "+String(result.stderr).slice(-3000)+"\n"+String(result.stdout).slice(-3000));
 return result.stdout;
};
const digest=file=>createHash("sha256").update(readFileSync(file)).digest("hex");
const ni=x=>"ni:///sha-256;"+x.repeat(43);
try{
 const first=join(scratch,"first"),second=join(scratch,"second"),consumer=join(scratch,"consumer");
 for(const dir of [first,second,consumer])mkdirSync(dir,{recursive:true});
 const pack=dest=>{
  const raw=run("npm",["pack","--ignore-scripts","--offline",
   "--json","--pack-destination",dest],sourceRoot);
  const result=JSON.parse(raw);
  assert.equal(result.length,1,"one exact source package must be fabricated");
  const filename=result[0].filename;
  assert.match(filename,/^[A-Za-z0-9._-]+\.tgz$/u,"reject unexpected archive path");
  return join(dest,filename);
 };
 const archiveOne=pack(first),archiveTwo=pack(second);
 const hashOne=digest(archiveOne),hashTwo=digest(archiveTwo);
 assert.equal(hashOne,hashTwo,"two identical source inputs must fabricate byte-identical archives");
 const manifest=JSON.parse(readFileSync(join(sourceRoot,"package.json"),"utf8"));
 writeFileSync(join(consumer,"package.json"),JSON.stringify({
  name:"original-source-isolated-resource-consumer",version:"0.0.0",
  private:true,type:"module"
 },null,2)+"\n");
 run("npm",["install","--ignore-scripts","--offline","--no-audit","--no-fund",
  archiveOne],consumer);
 const consumerTest=String.raw\`
import assert from "node:assert/strict";
import {
  deriveResourceEventReadings,
  compareResourceEventIntensityWindows,
  compareResourceFlowIntensityWindows
} from "@red-cup-engineering/exact-number-data-service/resource-flow";
const ni=x=>"ni:///sha-256;"+x.repeat(43);
const amount=x=>({numerator:String(x),denominator:"1"});
const event=(id,time,count)=>({
 sourceObservationAddress:ni(id),observedAt:time,
 feedRef:ni("F"),resourceSubjectRef:ni("S"),
 consumerActorRef:"actor:source-receiver-test",
 measurements:[{resource:"inference-input",unit:"token",amount:amount(count)}]
});
const outcome=(source,count)=>({
 sourceEvidenceRef:ni(source),functionalUnitRef:ni("K"),
 acceptedUnits:amount(count)
});
const before=event("A","2026-10-18T20:03:00.127Z",100);
const after=event("B","2026-10-18T20:04:00.875Z",120);
const args={
 baselineEvents:[before],successorEvents:[after],
 baselineSourceSubjectRef:ni("S"),successorSourceSubjectRef:ni("S"),
 baselineStartAt:"2026-10-18T20:03:00.000Z",
 successorStartAt:"2026-10-18T20:04:00.000Z",
 resolution:"minute",comparisonRef:ni("C"),
 baselineOutcome:outcome("D",1),successorOutcome:outcome("E",2)
};
const result=compareResourceEventIntensityWindows(args);
assert.equal(result.kind,"source-event-window-conditional-resource-intensity-reading");
assert.equal(result.conditionalIntensityCount,1);
assert.deepEqual(result.readings[0].totalRecordedEventDifference,amount(20));
assert.deepEqual(result.readings[0].successorOverBaselineIntensity,
 {numerator:"3",denominator:"5"});
assert.equal(result.sourceEventCollectionCompletenessVerified,false);
assert.equal(result.sourceAndFunctionalEquivalenceIndependentlyVerified,false);
assert.equal(result.requirementOrEngineeringAcceptanceClaimAllowed,false);
assert.deepEqual(deriveResourceEventReadings([before,before]),
 deriveResourceEventReadings([before]),"same source retry cannot double count");
assert.throws(()=>compareResourceEventIntensityWindows({
 ...args,successorEvents:[{...before,observedAt:after.observedAt}]
}),/reuse an original source event identity/u);
assert.equal(typeof compareResourceFlowIntensityWindows,"function");
process.stdout.write(JSON.stringify({
 consumer:"isolated-packed-artifact",eventIntensity:result.readings[0].intensityDirection,
 sourcePopulationVerified:result.sourceEventCollectionCompletenessVerified,
 originalSourceEvidenceOnly:true
 })+"\n");
\`;
 writeFileSync(join(consumer,"acceptance.mjs"),consumerTest);
 const receipt=run("node",["acceptance.mjs"],consumer).trim();
 const parsed=JSON.parse(receipt);
 assert.equal(parsed.consumer,"isolated-packed-artifact");
 process.stdout.write(JSON.stringify({
  kind:"source-pinned-exact-resource-packaging-receipt",
  sourcePackage:manifest.name+"@"+manifest.version,
  sha256:hashOne,repeatSha256:hashTwo,
  deterministic:true,isolatedPackedConsumerPassed:true,
  imported:"./resource-flow",
  downstreamReleaseInstalled:false,
  nativeProviderOutcomeReceived:false,
  originalConsumer:parsed
 },null,2)+"\n");
}finally{
 rmSync(scratch,{force:true,recursive:true});
}
