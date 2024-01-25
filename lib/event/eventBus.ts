import { EventBus } from "ts-simple-event-bus";

import { v4 as uuidv4 } from "uuid";
import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";

type EventBusTyping = {
  "entity-schema.updated": {
    tenant: string;
    schema: JSONSchema7;
  };
  "entity.updated": {
    entity: Record<string, any>;
  };
  "entity.created": {
    entity: Record<string, any>;
  };
};

export const eventBus = new EventBus<EventBusTyping>(uuidv4);
