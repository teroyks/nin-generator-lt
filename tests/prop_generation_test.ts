import { assert, assertEquals } from "asserts";
import {
  birthDate,
  gender,
  serialNumber,
  year,
} from "../src/property-generator.ts";

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
  const firstDayOfNextYear = new Date(new Date().getFullYear() + 1, 0, 1);

  testProperty(
    birthDate,
    [
      (bd: Date) => bd.getFullYear() >= 1900,
      (bd: Date) => bd < firstDayOfNextYear,
    ],
  );
});

Deno.test("serial number", () => {
  testProperty(
    serialNumber,
    [
      (x: number) => (x) >= 100,
      (x: number) => (x) <= 999,
    ],
  );
});

Deno.test("gender", () => {
  testProperty(
    gender,
    [(x: number) => [0, 1].includes(x)],
  );
});

/**
 * Run crude property-based tests.
 * 
 * @param generatorFn Function that generates the test value
 * @param conditions List of test functions to run on the test value
 * @param iterations How many test values to generate
 */
function testProperty<TestValueType>(
  generatorFn: () => TestValueType,
  conditions: ((x: TestValueType) => boolean)[],
  iterations = 10000,
) {
  for (const _ of Array(iterations)) {
    const testVal = generatorFn();
    for (const condFn of conditions) {
      assert(
        condFn(testVal),
        `Value ${testVal} does not match condition ${condFn}`,
      );
    }
  }
}
