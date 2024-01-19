import { SubscriptionPlugin } from "./subscriptionManager.ts";

export const createWebhookSubscriptionPlugin = (): SubscriptionPlugin => {
  return {
    publishMessage: ({ subscription, action, entity }) => {
      if (subscription.webhook) {
        fetch(subscription.webhook.url, {
          method: "POST",
          body: JSON.stringify({ action, entity }),
        });
      }
    },
  };
};
