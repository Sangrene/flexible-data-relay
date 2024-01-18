import { Tenant } from "./tenant.model.ts";
import { TenantRepository } from "./tenant.persistence.ts";

export const tenantInMemoryRepository = (): TenantRepository => {
  const inMemoryStore: Tenant[] = [];
  const getTenantById = async (id: string) => {
    const tenant = inMemoryStore.find((tenant) => tenant._id === id);
    if (!tenant) throw new Error(`No tenant associated with id ${id}`);
    return tenant;
  };
  const createTenant = async (tenant: Omit<Tenant, "_id">) => {
    const storedTenant = { ...tenant, _id: crypto.randomUUID() };
    inMemoryStore.push(storedTenant);
    return storedTenant;
  };

  const getAllTenants = async () => {
    return inMemoryStore;
  };

  return {
    getTenantById,
    createTenant,
    getAllTenants,
  };
};
