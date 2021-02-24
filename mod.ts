/**
 * Lithuanian national identification number generator
 * 
 * Outputs a valid random nin when called.
 */
import { format } from "./deps.ts";
import { calculateG, checksum, Gender } from "./src/lt-nin-rules.ts";
import { birthDate, gender, serialNumber } from "./src/property-generator.ts";

export function generateNIN(year: number | null, verbose: boolean) {
  const bdArg = year ? { firstYear: year, lastYear: year } : {};
  const bd = birthDate(bdArg);
  const gd = gender();

  if (verbose) {
    console.log(
      `Birth date: ${format(bd, "yyyy-MM-dd")}\n`,
      `   Gender: ${Gender[gd]}\n`,
    );
  }

  const identificationNumber = calculateG(bd.getFullYear(), gd).toString() +
    format(bd, "yyMMdd") +
    serialNumber().toString();

  return identificationNumber + checksum(identificationNumber);
}
