import { Tenant } from "./tenant.model.ts";

export interface TenantRepository {
  getTenantById: (tenantId: string) => Promise<Tenant>;
  createTenant: (tenant: Omit<Tenant, "_id">) => Promise<Tenant>;
  getAllTenants: () => Promise<Tenant[]>;
}
