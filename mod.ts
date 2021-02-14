/**
 * Lithuanian national identification number generator
 * 
 * Outputs a valid random nin when called.
 */
import { format } from "datetime/mod.ts";
import { calculateG, checksum } from "./src/lt-nin-rules.ts";
import { birthDate, gender, serialNumber } from "./src/property-generator.ts";

export function generateNIN(year: number | null) {
  const bdArg = year ? { firstYear: year, lastYear: year } : {};
  const bd = birthDate(bdArg);

  const identificationNumber =
    calculateG(bd.getFullYear(), gender()).toString() +
    format(bd, "yyMMdd") +
    serialNumber().toString();

  return identificationNumber + checksum(identificationNumber);
}
