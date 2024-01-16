import { EventBus } from "ts-simple-event-bus";

import { v4 as uuidv4 } from "uuid";
import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";

type EventBusTyping = {
  "entity-schema.updated": {
    tenant: string;
    schema: JSONSchema7;
  };
};

export const eventBus = new EventBus<EventBusTyping>(uuidv4);
