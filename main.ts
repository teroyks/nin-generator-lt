import docopt from "https://deno.land/x/docopt@v1.0.6/mod.ts";
import { generateNIN } from "./mod.ts";

const doc = `
National Identification Number Generator

Usage:
  ${import.meta.url} [--year=<yyyy>]

Options:
  -h --help        Show this screen
  -y --year=<yyyy> Birth year (default: random)
`;

type Year = number | null;

try {
  const args = docopt(doc);
  const year: Year = typeof args["--year"] === "string"
    ? parseInt(args["--year"]) || null
    : null;

  console.log(generateNIN(year));
} catch (e) {
  console.error(e.message);
}
