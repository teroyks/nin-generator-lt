/**
 * Generates random properties for the person.
 */

import { format } from "datetime/mod.ts";

const yearMin = 2019;
const yearMax = parseInt(format(new Date(), "yyyy"));

export const year = () =>
  Math.floor(Math.random() * (yearMax - yearMin + 1)) + yearMin;
