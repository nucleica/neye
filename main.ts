import { log } from "@nucleic/sna";
import { Neye } from "./src/neye.ts";

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const port = Deno.args[0];

  if (port) {
    const eye = new Neye(parseInt(port));
  } else {
    log("No port provided");
  }
}
