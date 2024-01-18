import { connect } from "https://deno.land/x/amqp/mod.ts";
import { Subscription } from "../tenants/tenant.model.ts";

const createAMQPSubscriptionManager = () => {
  const connectionPool = [];

  const publishTo = async({entity,queue}: {queue: Required<Pick<Subscription, "queue">>, entity: Record<string, any>}) => {
    await connect()
  }
}