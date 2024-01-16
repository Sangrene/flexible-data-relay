type Permission = "read";
export interface Tenant {
  _id: string;
  lastSecret: string;
  lastSecretHash: string;
  accessAllowed: {
    owner: string;
    entityName: string;
    permissions: Permission[];
  }[];
}