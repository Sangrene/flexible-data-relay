import { eventBus } from "../event/eventBus.ts";
import { logger } from "../logging/logger.ts";
import { TenantCore } from "../tenants/tenant.core.ts";
import { SubscriptionQuery } from "./subscription.model.ts";

export interface SubscriptionPlugin {
  publishMessage: (p: {
    subscription: SubscriptionQuery;
    entity: Record<string, any>;
    action: string;
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
    queue: "entity.updated",
    callback: async ({ entity }) => {
      const tenants = await tenantCore.getAllTenants();
      for (let i = 0, n = tenants.length; i < n; i++) {
        const tenant = tenants[i];
        tenant.subscriptions?.forEach((sub) => {
          try {
            subscriptionPlugins.forEach(async(plugin) => {
              await plugin.publishMessage({
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
          subscriptionPlugins.forEach(async(plugin) => {
            try {
              await plugin.publishMessage({
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
