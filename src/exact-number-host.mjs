/** The crossings between exact numbers and the host: exact audit strings and native floating point
 *  (lossy, read only). Decimal strings are decimal-string's; host-integer lifts are exact-number's. */
import { rationalParts, toBigInt, toNumber as rationalToNumber } from "./exact-number.mjs";

/** A rational read as a native floating-point value (lossy). */
export const toNumber = rationalToNumber;

/** An integer's exact decimal-string form. */
export const integerToDecimalString = (z) => toBigInt(z).toString();

/** A rational's lossless audit form "num/den". */
export const ratToExactString = (q) => rationalParts(q).join("/");
