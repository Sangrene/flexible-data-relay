import { SubscriptionQuery } from "../subscription/subscription.model.ts";
export interface Access {
  owner: string;
  entityName: string;
}


export interface Tenant {
  _id: string;
  name: string;
  lastSecret: string;
  lastSecretHash: string;
  accessAllowed: Access[];
  subscriptions?: SubscriptionQuery[];
}
