import { connect } from "https://deno.land/x/amqp/mod.ts";
import { PublishingPlugin } from "./publishingManager.ts";
import { logger } from "../logging/logger.ts";

export const createAMQPSubscriptionPlugin = async ({
  connectionString,
}: {
  connectionString: string;
}): Promise<PublishingPlugin> => {
  const connection = await connect(connectionString);
  const channel = await connection.openChannel();
  logger.info("AMQP publisher plugin connected to provided RabbitMQ instance.");
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
