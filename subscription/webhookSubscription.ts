import { SubscriptionPlugin } from "./subscriptionManager.ts";
import { logger } from "../logging/logger.ts";
import {
  WebhookSubscriptionCommand,
  SubscriptionQuery,
} from "./subscription.model.ts";

export const createWebhookSubscription = (
  subscription: WebhookSubscriptionCommand
): SubscriptionQuery => {
  return {
    ...subscription,
    key: crypto.randomUUID(),
  };
};

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
