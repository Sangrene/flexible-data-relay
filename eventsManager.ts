import { v4 as uuidv4 } from "uuid";
import { EventBus } from "ts-simple-event-bus";

const events = ["schema.updated", "entity.created", "entity.updated"] as const;

type eventType = (typeof events)[number];

export const eventBus = new EventBus(uuidv4);