type QueueSubscription = {
  type: "queue";
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

export type SubscriptionQuery = SubscriptionBase &
  ((QueueSubscription & { queueName: string }) | WebhookSubscription) & {
    key: string;
  };
