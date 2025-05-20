import {
  connect,
  AmqpConnection,
  AmqpChannel,
} from "https://deno.land/x/amqp/mod.ts";
import { SubscriptionPlugin } from "./subscriptionManager.ts";
import { logger } from "../logging/logger.ts";
import { Env } from "../env/loadEnv.ts";
import type {
  QueueSubscriptionCommand,
  SubscriptionQuery,
  SubscriptionCommand,
} from "./subscription.model.ts";
import type { MessageBrokerManager } from "../message-broker/messageBrokerManager.ts";
import type { TenantCore } from "../tenants/tenant.core.ts";

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
  messageBrokerManager,
}: {
  env: Env;
  messageBrokerManager: MessageBrokerManager;
  tenantCore: TenantCore;
}): Promise<SubscriptionPlugin> => {
  if (!env.RABBIT_MQ_CONNECTION_STRING || !env.RABBIT_MQ_CREDENTIALS) {
    logger.error("RabbitMQ connection string or credentials are not provided.");
    return {
      publishMessage: async () => {},
    };
  }
  const connectionPool = new Map<
    string,
    { connection: AmqpConnection; channel: AmqpChannel }
  >();
  logger.info("Connected to provided RabbitMQ instance.");
  return {
    publishMessage: async ({ action, entity, subscription, tenantName }) => {
      if (subscription.type === "queue") {
        const connection = connectionPool.get(tenantName);
        if (!connection) {
          throw new Error(
            `AMQP connection for tenant ${tenantName} not found.`
          );
        }
        await connection.channel.publish(
          { routingKey: subscription.queueName },
          { contentType: "application/json" },
          new TextEncoder().encode(JSON.stringify({ entity, action }))
        );
      }
    },
    onTenantCreated: async ({ tenant }) => {
      if (!env.RABBIT_MQ_CONNECTION_STRING || !env.RABBIT_MQ_CREDENTIALS) {
        logger.error(
          "Tried to create a tenant in RabbitMQ but connection string is not provided."
        );
        return;
      }
      await messageBrokerManager.createTenantUser({
        name: tenant.name,
        password: tenant.messageBrokerPassword,
      });
      await messageBrokerManager.createUserVhost(tenant.name);
      await messageBrokerManager.setAccessPermissionForUserVHost(tenant.name);
      await messageBrokerManager.setAdminPermissionsForVHost({
        adminName: env.RABBIT_MQ_CREDENTIALS.split(":")[0],
        vhost: tenant.name,
      });

      const connection = await connect(
        env.RABBIT_MQ_CONNECTION_STRING + `/${tenant.name}-host`
      );
      connectionPool.set(tenant.name, {
        connection,
        channel: await connection.openChannel(),
      });
    },
    onSubscriptionCreated: async ({ subscription, tenantName }) => {
      const connection = connectionPool.get(tenantName);
      if (subscription.type !== "queue") return;
      if (!connection) {
        throw new Error(`AMQP connection for tenant ${tenantName} not found.`);
      }
      await connection.channel.declareQueue({
        queue: subscription.queueName,
      });
    },
  };
};
