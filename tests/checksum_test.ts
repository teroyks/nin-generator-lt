import { assertEquals } from "asserts";
import { ltNINChecksum } from "../src/lt-nin-rules.ts";

/**
 * 10101010005 is a valid NIN.
 */
Deno.test("calculate checksum", () => {
  assertEquals(ltNINChecksum("1010101000"), 5);
});
