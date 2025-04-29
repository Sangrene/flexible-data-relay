import { connect } from "https://deno.land/x/amqp/mod.ts";
import { SubscriptionPlugin } from "./subscriptionManager.ts";
import { logger } from "../logging/logger.ts";
import { Env } from "../env/loadEnv.ts";
import {
  QueueSubscriptionCommand,
  SubscriptionQuery,
  SubscriptionCommand,
} from "./subscription.model.ts";

const computeQueueName = (
  tenantName: string,
  subscription: SubscriptionCommand
) => {
  return `${tenantName}.${subscription.owner}.${subscription.entityName}`;
};

export const createAMQPSubscription = (
  subscription: QueueSubscriptionCommand
): SubscriptionQuery => {
  return {
    ...subscription,
    key: crypto.randomUUID(),
    queueName: computeQueueName(subscription.owner, subscription),
  };
};

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
      if (subscription.type === "queue") {
        await channel.declareQueue({ queue: subscription.queueName });
        await channel.publish(
          { routingKey: subscription.queueName },
          { contentType: "application/json" },
          new TextEncoder().encode(JSON.stringify({ entity, action }))
        );
      }
    },
    onTenantCreated: async () => {
      // TODO: Create a user for the tenant
    },
    onSubscriptionCreated: async () => {
      // TODO: Create a queue for the subscription (tenant.owner.entity)
    },
  };
};
