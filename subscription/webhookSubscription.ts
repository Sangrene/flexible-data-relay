import { Subscription } from "../tenants/tenant.model.ts";

const createWebhookSubscriptionManager = () => {
  const sendTo = async ({
    webhook,
    entity,
    action,
  }: Required<Pick<Subscription, "webhook">> & {
    entity: Record<string, any>;
    action: string;
  }) => {
    await fetch(webhook.url, {
      method: "POST",
      body: JSON.stringify({ action, entity }),
    });
  };
  return { sendTo };
};

export type WebhookSubscriptionManager = ReturnType<
  typeof createWebhookSubscriptionManager
>;
