import { assertEquals } from "asserts";
import { calculateG, Gender } from "../src/lt-nin-rules.ts";

Deno.test("calculate G value for 1900 female", () => {
  assertEquals(calculateG(1950, Gender.female), 4);
});

Deno.test("calculate G value for 2000 male", () => {
  assertEquals(calculateG(2001, Gender.male), 5);
});
