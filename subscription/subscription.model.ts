type QueueSubscription = {
  type: "queue";
  queueName: string;
};

type WebhookSubscription = {
  type: "webhook";
  webhookUrl: string;
};

type SubscriptionBase = {
  owner: string;
  entityName: string;
};

export type SubscriptionCommand = SubscriptionBase &
  (QueueSubscription | WebhookSubscription);

export type SubscriptionQuery = SubscriptionCommand & { key: string };