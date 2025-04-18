
export interface Access {
  owner: string;
  entityName: string;
}

export interface Subscription {
  owner: string;
  entityName: string;
  key: string;
  queue?: {
    queueName: string;
    
  };
  webhook?: {
    url: string;
  };
}
export interface Tenant {
  _id: string;
  name: string;
  lastSecret: string;
  lastSecretHash: string;
  accessAllowed: Access[];
  subscriptions?: Subscription[];
}
