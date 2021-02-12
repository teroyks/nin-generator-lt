/**
 * Construct the NIN code structure
 */

/**
 * Gender values in the NIN
 */
export enum Gender {
  female = 0,
  male = 1,
}

/**
 * Calculate the gender & birth century value.
 * 
 * @param year Birth year (full year, four digits)
 * @param gender 
 */
export const calculateG = (year: number, gender: Gender): number =>
  Math.floor(year / 100) * 2 - 34 - gender;

/**
 * Calculate the NIN checksum.
 * 
 * See https://en.wikipedia.org/wiki/National_identification_number#Lithuania
 * for the formula origin.
 * 
 * @param code The first 10 digits of the NIN
 */
export function ltNINChecksum(code: string): number {
  var b = 1, c = 3, d = 0, e = 0, i, digit;
  for (i = 0; i < 10; i++) {
    digit = parseInt(code[i]);
    d += digit * b;
    e += digit * c;
    b++;
    if (b == 10) b = 1;
    c++;
    if (c == 10) c = 1;
  }
  d = d % 11;
  e = e % 11;
  if (d < 10) {
    return d;
  } else if (e < 10) {
    return e;
  } else {
    return 0;
  }
}
