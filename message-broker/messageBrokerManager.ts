import { Env } from "../env/loadEnv.ts";
import { encodeBase64 } from "https://deno.land/std@0.205.0/encoding/base64.ts";
import { logger } from "../logging/logger.ts";

export const createMessageBrokerManager = ({ env }: { env: Env }) => {
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

  const createTenantUser = async ({
    name,
    password,
  }: {
    name: string;
    password: string;
  }) => {
    await makeRabbitMQAdminRequest(`/api/users/${name}`, "PUT", {
      password,
      tags: "tenant",
    });
    logger.info(`[RABBITMQ] Created tenant user ${name}`);
  };

  const createUserVhost = async (name: string) => {
    await makeRabbitMQAdminRequest(`/api/vhosts/${name}-host`, "PUT", {
      description: `Virtual host for tenant ${name}`,
    });
    logger.info(`[RABBITMQ] Created tenant vhost ${name}-host`);
  };

  const setAccessPermissionForUserVHost = async (name: string) => {
    await makeRabbitMQAdminRequest(
      `/api/permissions/${name}-host/${name}`,
      "PUT",
      {
        configure: "",
        write: ".*",
        read: ".*",
      }
    );
    logger.info(`[RABBITMQ] Set permissions for tenant ${name}`);
  };

  const setAdminPermissionsForVHost = async ({
    adminName,
    vhost,
  }: {
    adminName: string;
    vhost: string;
  }) => {
    await makeRabbitMQAdminRequest(
      `/api/permissions/${vhost}/${adminName}`,
      "PUT",
      {
        configure: ".*",
        write: ".*",
        read: ".*",
      }
    );
    logger.info(`[RABBITMQ] Set admin permissions for vhost ${vhost}`);
  };
  return {
    createTenantUser,
    createUserVhost,
    setAccessPermissionForUserVHost,
    setAdminPermissionsForVHost,
  };
};

export type MessageBrokerManager = ReturnType<
  typeof createMessageBrokerManager
>;
