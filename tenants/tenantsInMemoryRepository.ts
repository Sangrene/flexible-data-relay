import { Tenant } from "./tenant.model.ts";
import { TenantRepository } from "./tenant.persistence.ts";

export const createTenantInMemoryRepository = (): TenantRepository => {
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
    getTenantByName: async (name: string) => {
      return inMemoryStore.find((tenant) => tenant.name === name) || null;
    },
    addAllowedAccessToTenant: async (name, access) => {
      for (let i = 0, n = inMemoryStore.length; i < n; i++) {
        const tenant = inMemoryStore[i];
        if (tenant.name === name) {
          tenant.accessAllowed.push(access);
          return tenant;
        }
      }
      throw new Error(`No tenant with name ${name}`);
    },
    addSubscription: async ({ subscription, tenantId }) => {
      for (let i = 0, n = inMemoryStore.length; i < n; i++) {
        const tenant = inMemoryStore[i];
        if (tenant._id === tenantId) {
          tenant.subscriptions?.push(subscription);
          return tenant;
        }
      }
      throw new Error(`No tenant with name ${name}`);
    },
  };
};
