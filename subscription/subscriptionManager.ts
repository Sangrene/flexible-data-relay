import { eventBus } from "../event/eventBus.ts";
import { TenantCore } from "../tenants/tenant.core.ts";
import { Subscription } from "../tenants/tenant.model.ts";

export interface SubscriptionPlugin {
  publishMessage: (p: {
    subscription: Subscription;
    entity: Record<string, any>;
    action: string;
  }) => void;
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
      // Should use cache version of subscription here, not query everytime
      const tenants = await tenantCore.getAllTenants();
      for (let i = 0, n = tenants.length; i < n; i++) {
        const tenant = tenants[i];
        tenant.subscriptions.forEach((sub) => {
          subscriptionPlugins.forEach((plugin) => {
            plugin.publishMessage({
              subscription: sub,
              entity,
              action: "updated",
            });
          });
        });
      }
    },
  });
};
