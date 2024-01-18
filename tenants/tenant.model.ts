type Permission = "read";

export interface Access {
  owner: string;
}

export interface Subscription {
  owner: string;
  entityName: string;
}
export interface Tenant {
  _id: string;
  name: string;
  lastSecret: string;
  lastSecretHash: string;
  accessAllowed: Access[];
  subscriptions: Subscription[];
}
