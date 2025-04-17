import { connect } from "https://deno.land/x/amqp/mod.ts";
import { SubscriptionPlugin } from "./subscriptionManager.ts";
import { logger } from "../logging/logger.ts";
import { Env } from "../env/loadEnv.ts";

export const createAMQPSubscriptionPlugin = async ({
  env,
}: {
  env: Env;
}): Promise<SubscriptionPlugin> => {
  if (!env.RABBIT_MQ_CONNECTION_STRING) {
    logger.error("RabbitMQ connection string is not provided.");
    return {
      publishMessage: async () => {},
    };
  }
  const connection = await connect(env.RABBIT_MQ_CONNECTION_STRING);
  const channel = await connection.openChannel();
  logger.info("Connected to provided RabbitMQ instance.");
  return {
    publishMessage: async ({ action, entity, subscription }) => {
      if (subscription.queue) {
        await channel.declareQueue({ queue: subscription.queue.queueName });
        await channel.publish(
          { routingKey: subscription.queue.queueName },
          { contentType: "application/json" },
          new TextEncoder().encode(JSON.stringify({ entity, action }))
        );
      }
    },
  };
};
