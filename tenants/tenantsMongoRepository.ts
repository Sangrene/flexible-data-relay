import { Collection, ObjectId } from "mongodb";
import { TenantRepository } from "./tenant.persistence.ts";
import { Tenant } from "./tenant.model.ts";
import { MongoService } from "../persistence/mongo.ts";

const TENANT_COLLECTION_NAME = "tenant";

export const createTenantsMongoRepository = ({
  mongoService,
}: {
  mongoService: MongoService;
}): TenantRepository => {
  return {
    getTenantById: async (tenantId) => {
      const collection = mongoService
        .getMasterDb()
        .collection(TENANT_COLLECTION_NAME);
      const tenant = (await collection.findOne({
        _id: new ObjectId(tenantId),
      })) as any;
      return tenant;
    },
    createTenant: async (tenant) => {
      const collection = mongoService
        .getMasterDb()
        .collection(TENANT_COLLECTION_NAME);
      const savedTenant = (await collection.insertOne({ ...tenant })) as any;
      return savedTenant;
    },
    getAllTenants: async () => {
      const collection = mongoService
        .getMasterDb()
        .collection(TENANT_COLLECTION_NAME);
      const result = (await collection.find({}).toArray()) as any;
      return result;
    },
    getTenantByName: async (name) => {
      const collection = mongoService
        .getMasterDb()
        .collection(TENANT_COLLECTION_NAME);
      const tenant = (await collection.findOne({ name })) as any;
      return tenant;
    },
    addAllowedAccessToTenant: async (name, access) => {
      const collection: Collection<Tenant> = mongoService
        .getMasterDb()
        .collection(TENANT_COLLECTION_NAME);
      const tenant = (await collection.findOneAndUpdate(
        { name },
        { $push: { accessAllowed: access } }
      )) as any;
      return tenant;
    },
    addSubscription: async ({ subscription, tenantId }) => {
      const collection: Collection<Omit<Tenant, "_id">> = mongoService
        .getMasterDb()
        .collection(TENANT_COLLECTION_NAME);
      const tenant = (await collection.findOneAndUpdate(
        { _id: new ObjectId(tenantId) },
        { $push: { subscriptions: subscription } }
      )) as any;
      return tenant;
    },
  };
};
