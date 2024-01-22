import { SubscriptionPlugin } from "./subscriptionManager.ts";
import { logger } from "../logging/logger.ts";

export const createWebhookSubscriptionPlugin = (): SubscriptionPlugin => {
  return {
    publishMessage: ({ subscription, action, entity }) => {
      if (subscription.webhook) {
        try {
          fetch(subscription.webhook.url, {
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
