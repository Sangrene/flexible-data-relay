import { eventBus } from "../event/eventBus.ts";
import { TenantRepository } from "../tenants/tenant.persistence.ts";
import { WebhookSubscriptionManager } from "./webhookSubscription.ts";

export const createSubscriptionManager = ({
  tenantPersistence,
  webhookManager,
}: {
  tenantPersistence: TenantRepository;
  webhookManager: WebhookSubscriptionManager;
}) => {
  eventBus.subscribe({
    queue: "entity.updated",
    callback: async ({ entity }) => {
      // Should use cache version of subscription here, not query everytime
      const tenants = await tenantPersistence.getAllTenants();
      for (let i = 0, n = tenants.length; i < n; i++) {
        const tenant = tenants[i];
        tenant.subscriptions.forEach((sub) => {
          if (sub.webhook) {
            webhookManager.sendTo({
              webhook: sub.webhook,
              entity,
              action: "updated",
            });
          }
          if (sub.queue) {
          }
        });
      }
    },
  });
};
