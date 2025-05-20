type SubscriptionBaseCommand = {
  owner: string;
  entityName: string;
};
export type QueueSubscriptionCommand = {
  type: "queue";
} & SubscriptionBaseCommand;

export type WebhookSubscriptionCommand = {
  type: "webhook";
  webhookUrl: string;
} & SubscriptionBaseCommand;

export type SubscriptionCommand =
  | QueueSubscriptionCommand
  | WebhookSubscriptionCommand;

type SubscriptionBaseQuery = {
  owner: string;
  entityName: string;
  key: string;
};

type QueueSubscriptionQuery = SubscriptionBaseQuery & {
  type: "queue";
  queueName: string;
};

type WebhookSubscriptionQuery = SubscriptionBaseQuery & {
  type: "webhook";
  webhookUrl: string;
};

export type SubscriptionQuery =
  | QueueSubscriptionQuery
  | WebhookSubscriptionQuery;
