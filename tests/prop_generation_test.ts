import { assert } from "asserts";
import { year } from "../src/property-generator.ts";

Deno.test("year is calculated correctly", () => {
  assert(year() >= 1900);
});
