import { Db, ObjectId } from "mongodb";
import { TenantRepository } from "./tenant.persistence.ts";

const TENANT_COLLECTION_NAME = "tenant";

export const createTenantsMongoRepository = (
  masterDb: Db
): TenantRepository => {
  return {
    getTenantById: async (tenantId) => {
      const collection = masterDb.collection(TENANT_COLLECTION_NAME);
      const tenant = (await collection.findOne({
        _id: new ObjectId(tenantId),
      })) as any;
      return tenant;
    },
    createTenant: async (tenant) => {
      const collection = masterDb.collection(TENANT_COLLECTION_NAME);
      const savedTenant = (await collection.insertOne({ ...tenant })) as any;
      return savedTenant;
    },
    getAllTenants: async () => {
      const collection = masterDb.collection(TENANT_COLLECTION_NAME);
      const result = (await collection.find({}).toArray()) as any;
      return result;
    },
    getTenantByName: async (name) => {
      const collection = masterDb.collection(TENANT_COLLECTION_NAME);
      const tenant = (await collection.findOne({ name })) as any;
      return tenant;
    },
    addAllowedAccessToTenant: async (name, access) => {
      const collection = masterDb.collection(TENANT_COLLECTION_NAME);
      const tenant = (await collection.updateOne(
        { name },
        { $push: { accessAllowed: access } }
      )) as any;
      return tenant;
    },
  };
};
