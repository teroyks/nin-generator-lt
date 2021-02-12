/**
 * Generates random properties for the person.
 */

const yearMin = 2019;
const yearMax = new Date().getFullYear();

/**
 * Generate a random four-digit year.
 */
export const year = () =>
  Math.floor(Math.random() * (yearMax - yearMin + 1)) + yearMin;

/**
 * Generate a random date within given data range
 * @param param0 
 */
export const birthDate = (
  { firstYear = yearMin, lastYear = yearMax } = {},
): Date => {
  const firstTime = new Date(`${firstYear}-01-01`).getTime();
  const lastTime = new Date(`${lastYear}-12-31`).getTime();

  return new Date(firstTime + Math.random() * (lastTime - firstTime));
};
