import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";
import { Tenant } from "./tenant.model.ts";

export interface TenantRepository {
  getTenantById: (tenantId: string) => Promise<Tenant>;
}
