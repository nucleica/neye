import { Neye } from "./src/neye.ts";


// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
    const eye = new Neye();
    
}
