import { assertEquals } from "asserts";
import { Gender } from "../src/lt-nin-rules.ts";

Deno.test("female value exists", () => {
  assertEquals(Gender.female, 0);
});

Deno.test("male value exists", () => {
  assertEquals(Gender.male, 1);
});
