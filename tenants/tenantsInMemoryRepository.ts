import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";
import { TenantPersistenceHandler } from "./tenant.persistence.ts";

export const tenantInMemoryRepository = (): TenantPersistenceHandler => {
  const inMemoryStore: {
    [tenant: string]: { };
  } = {};
  return {
    addAllowedTenant: ()
  }
    
};
