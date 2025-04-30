import {
  connect,
  AmqpConnection,
  AmqpChannel,
} from "https://deno.land/x/amqp/mod.ts";
import { SubscriptionPlugin } from "./subscriptionManager.ts";
import { logger } from "../logging/logger.ts";
import { Env } from "../env/loadEnv.ts";
import {
  QueueSubscriptionCommand,
  SubscriptionQuery,
  SubscriptionCommand,
} from "./subscription.model.ts";
import { encodeBase64 } from "https://deno.land/std@0.205.0/encoding/base64.ts";

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
  if (!env.RABBIT_MQ_CONNECTION_STRING || !env.RABBIT_MQ_CREDENTIALS) {
    logger.error("RabbitMQ connection string or credentials are not provided.");
    return {
      publishMessage: async () => {},
    };
  }
  const makeRabbitMQAdminRequest = (
    path: `/api/${string}`,
    method: "PUT" | "POST",
    body: Record<string, unknown>
  ) => {
    if (!env.RABBIT_MQ_CONNECTION_STRING || !env.RABBIT_MQ_CREDENTIALS) {
      logger.error(
        "RabbitMQ connection string or credentials are not provided."
      );
      throw new Error(
        "RabbitMQ connection string or credentials are not provided."
      );
    }
    return fetch(env.RABBIT_MQ_CONNECTION_STRING + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${encodeBase64(env.RABBIT_MQ_CREDENTIALS)}`,
      },
      body: JSON.stringify(body),
    });
  };
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
      await makeRabbitMQAdminRequest(`/api/users/${tenant.name}`, "PUT", {
        password: tenant.messageBrokerPassword,
        tags: ["tenant"],
      });
      await makeRabbitMQAdminRequest(`/api/vhosts/${tenant.name}-host`, "PUT", {
        description: `Virtual host for tenant ${tenant.name}`,
      });
      await makeRabbitMQAdminRequest(
        `/api/permissions/${tenant.name}-host/${tenant.name}`,
        "PUT",
        {
          configure: "",
          write: ".*",
          read: ".*",
        }
      );
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
