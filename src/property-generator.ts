/**
 * Generates random properties for the person.
 */

const yearMin = 2019;
const yearMax = new Date().getFullYear();

const randomNumber = (min: number, max: number): number =>
  Math.floor(Math.random()) * (max - min + 1) + min;

/**
 * Generate a random four-digit year.
 */
export const year = () => randomNumber(yearMin, yearMax);

/**
 * Generate a random date within given data range
 * @param param0 
 */
export const birthDate = (
  { firstYear = yearMin, lastYear = yearMax } = {},
): Date => {
  const firstTime = new Date(`${firstYear}-01-01`).getTime();
  const lastTime = new Date(`${lastYear}-12-31`).getTime();

  return new Date(randomNumber(firstTime, lastTime));
};

/**
 * Generate a three-digit random number.
 */
export const serialNumber = () => randomNumber(100, 999);
