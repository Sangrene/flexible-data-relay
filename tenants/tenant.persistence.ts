import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";
import { Tenant } from "./tenant.model.ts";

export interface TenantRepository {
  addTenantPermissionOnOwnResources: (tenant: string) => Promise<string[]>;
  getTenantById: (tenantId: string) => Promise<Tenant>;
}
