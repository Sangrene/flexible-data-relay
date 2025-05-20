import { eventBus } from "../event/eventBus.ts";
import { logger } from "../logging/logger.ts";
import { TenantCore } from "../tenants/tenant.core.ts";
import { Tenant } from "../tenants/tenant.model.ts";
import {
  SubscriptionQuery,
  SubscriptionCommand,
} from "./subscription.model.ts";
import { createAMQPSubscription } from "./amqpSubscription.ts";
import { createWebhookSubscription } from "./webhookSubscription.ts";

export const computeSubscription = (
  subscription: SubscriptionCommand
): SubscriptionQuery => {
  const type = subscription.type;
  if (type === "queue") {
    return createAMQPSubscription(subscription);
  }
  if (type === "webhook") {
    return createWebhookSubscription(subscription);
  }
  throw new Error(`Unknown subscription type: ${type}`);
};
export interface SubscriptionPlugin {
  publishMessage: (p: {
    tenantName: string;
    subscription: SubscriptionQuery;
    entity: Record<string, any>;
    action: string;
  }) => Promise<void>;
  onTenantCreated?: (p: { tenant: Tenant }) => Promise<void>;
  onSubscriptionCreated?: (p: {
    tenantName: string;
    subscription: SubscriptionQuery;
  }) => Promise<void>;
}

export const createSubscriptionManager = ({
  tenantCore,
  subscriptionPlugins,
}: {
  tenantCore: TenantCore;
  subscriptionPlugins: SubscriptionPlugin[];
}) => {
  eventBus.subscribe({
    queue: "tenant.created",
    callback: async ({ tenant }) => {
      subscriptionPlugins.forEach(async (plugin) => {
        if (plugin.onTenantCreated) {
          await plugin.onTenantCreated({ tenant });
        }
      });
    },
  });
  eventBus.subscribe({
    queue: "entity.updated",
    callback: async ({ entity }) => {
      const tenants = await tenantCore.getAllTenants();
      for (let i = 0, n = tenants.length; i < n; i++) {
        const tenant = tenants[i];
        tenant.subscriptions?.forEach((sub) => {
          try {
            subscriptionPlugins.forEach(async (plugin) => {
              await plugin.publishMessage({
                tenantName: tenant.name,
                subscription: sub,
                entity,
                action: "updated",
              });
            });
          } catch (e) {
            logger.error(e, entity, "updated");
          }
        });
      }
    },
  });
  eventBus.subscribe({
    queue: "entity.created",
    callback: async ({ entity }) => {
      const tenants = await tenantCore.getAllTenants();
      for (let i = 0, n = tenants.length; i < n; i++) {
        const tenant = tenants[i];
        tenant.subscriptions?.forEach((sub) => {
          subscriptionPlugins.forEach(async (plugin) => {
            try {
              await plugin.publishMessage({
                tenantName: tenant.name,
                subscription: sub,
                entity,
                action: "created",
              });
            } catch (e) {
              logger.error(e, entity, "created");
            }
          });
        });
      }
    },
  });
};
