import { SubscriptionPlugin } from "./subscriptionManager.ts";
import { logger } from "../logging/logger.ts";

export const createWebhookSubscriptionPlugin = (): SubscriptionPlugin => {
  return {
    publishMessage: async ({ subscription, action, entity }) => {
      if (subscription.type === "webhook") {
        try {
          await fetch(subscription.webhookUrl, {
            method: "POST",
            body: JSON.stringify({ action, entity, key: subscription.key }),
          });
        } catch (e) {
          logger.error(e);
        }
      }
    },
  };
};
