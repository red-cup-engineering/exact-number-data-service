/**
 * Canonical UTC window coordinates for observed events and interval samples.
 * This is measurement geometry only: without source clock precision a reader
 * may NEVER promote a day-only transaction into a second-level observation.
 */
export const UTC_WINDOWS=Object.freeze([
 Object.freeze({resolution:'second',milliseconds:1000}),
 Object.freeze({resolution:'minute',milliseconds:60000}),
 Object.freeze({resolution:'hour',milliseconds:3600000}),
 Object.freeze({resolution:'day',milliseconds:86400000})
]);
const INSTANT=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const invalid=reason=>{throw new TypeError('UTC windows: '+reason)};
/**
 * Return only windows permitted by the real precision of the input source.
 * 'second' means the event has an exact timestamp to at least a second;
 * 'minute' excludes second; 'day' excludes second, minute and hour.
 * Every window is half-open [startAt,endAt), no stored aggregate.
 */
export function utcWindowsAt(timestamp,{finest='second'}={}){
 if(typeof timestamp!=='string'||!INSTANT.test(timestamp))
  invalid('expected a canonical UTC timestamp with millisecond digits');
 const event=Date.parse(timestamp);
 if(!Number.isFinite(event)||new Date(event).toISOString()!==timestamp)
  invalid('timestamp is not a real UTC instant');
 const minimum=UTC_WINDOWS.find(x=>x.resolution===finest);
 if(minimum===undefined)invalid('unrecognized source time precision');
 return Object.freeze(UTC_WINDOWS.filter(x=>x.milliseconds>=minimum.milliseconds).map(x=>{
  const start=Math.floor(event/x.milliseconds)*x.milliseconds;
  const end=start+x.milliseconds;
  if(!Number.isFinite(end))invalid('window exceeds time range');
  return Object.freeze({resolution:x.resolution,milliseconds:x.milliseconds,
   startAt:new Date(start).toISOString(),endAt:new Date(end).toISOString()});
 }));
}
