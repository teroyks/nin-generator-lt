import { assertEquals } from "asserts";
import { checksum } from "../src/lt-nin-rules.ts";

/**
 * 10101010005 is a valid NIN.
 */
Deno.test("calculate checksum", () => {
  assertEquals(checksum("1010101000"), 5);
});
