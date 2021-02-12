import { assert, assertEquals } from "asserts";
import { birthDate, serialNumber, year } from "../src/property-generator.ts";

Deno.test("year is calculated correctly", () => {
  assert(year() >= 1900);
});

Deno.test("birthdate in a fixed year", () => {
  assertEquals(
    birthDate({ firstYear: 2000, lastYear: 2000 }).getFullYear(),
    2000,
  );
});

Deno.test("birthdate with default parameters", () => {
  assert(birthDate().getFullYear() >= 1900);
});

Deno.test("serial number", () => {
  assert(serialNumber() >= 100);
  assert(serialNumber() <= 999);
});
