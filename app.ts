import "https://deno.land/std@0.209.0/dotenv/load.ts";
import { runWebServer } from "./http/webserver.ts";
import { entityCore as createEntityCore } from "./entities/entity.core.ts";
import { inMemoryRepository } from "./entities/entitiesinMemoryRepository.ts";

const persistence = inMemoryRepository();
const entityCore = runWebServer({
  entityCore: createEntityCore({ persistence }),
  entityPersistence: persistence,
});
