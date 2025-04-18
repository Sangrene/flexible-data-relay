import { assertEquals } from "https://deno.land/std@0.209.0/assert/assert_equals.ts";
import { createAuthCore } from "./auth.ts";
import { createTenantCore } from "../tenants/tenant.core.ts";
import { createTenantInMemoryRepository } from "../tenants/tenantsInMemoryRepository.ts";
import { createEntityInMemoryRepository } from "../entities/entitiesinMemoryRepository.ts";
import {
  createLocalSchemaChangeHandler,
  createTenantCache,
} from "../graphql/graphqlSchemasCache.ts";
import { createEntityCore } from "../entities/entity.core.ts";
import { loadEnv } from "../env/loadEnv.ts";

Deno.test(async function canGenerateTenantTokenFromIdAndCredentials() {
  const tenantPersistence = createTenantInMemoryRepository();
  const entityPersistence = createEntityInMemoryRepository();
  const entityCore = createEntityCore({ persistence: entityPersistence });
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const cache = createTenantCache({
    initContent: await tenantCore.getAllSchemas(entityCore),
    createSchemaChangeHandler: createLocalSchemaChangeHandler(),
  });
  tenantCore.setCache(cache);

  const authCore = await createAuthCore({ tenantCore, env: loadEnv() });
  const newTenant = await tenantCore.createTenant("tenant");
  const result = await authCore.generateTokenFromCredentials({
    clientId: newTenant._id,
    clientSecret: newTenant.lastSecret,
  });
  assertEquals(result.isOk(), true);
});

Deno.test(
  async function returnErrorIfGenerateTokenFromCredentialsWithWrongCredentials() {
    const tenantPersistence = createTenantInMemoryRepository();
    const tenantCore = createTenantCore({
      tenantPersistenceHandler: tenantPersistence,
    });
    const authCore = await createAuthCore({ tenantCore, env: loadEnv() });
    const newTenant = await tenantCore.createTenant("tenant");
    const result = await authCore.generateTokenFromCredentials({
      clientId: newTenant._id,
      clientSecret: "wrongSecret",
    });
    assertEquals(result._unsafeUnwrapErr(), { error: "BAD_CREDENTIALS" });
  }
);

Deno.test(
  async function returnErrorIfGenerateTokenFromCredentialsWithWrongId() {
    const tenantPersistence = createTenantInMemoryRepository();
    const tenantCore = createTenantCore({
      tenantPersistenceHandler: tenantPersistence,
    });
    const authCore = await createAuthCore({ tenantCore, env: loadEnv() });
    const newTenant = await tenantCore.createTenant("tenant");
    const result = await authCore.generateTokenFromCredentials({
      clientId: "wrongId",
      clientSecret: newTenant.lastSecret,
    });
    assertEquals(result._unsafeUnwrapErr(), {
      error: "NO_TENANT_WITH_THIS_ID",
    });
  }
);

Deno.test(async function canGetTenantUsingToken() {
  const tenantPersistence = createTenantInMemoryRepository();
  const entityPersistence = createEntityInMemoryRepository();
  const entityCore = createEntityCore({ persistence: entityPersistence });
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const cache = createTenantCache({
    initContent: await tenantCore.getAllSchemas(entityCore),
    createSchemaChangeHandler: createLocalSchemaChangeHandler(),
  });
  tenantCore.setCache(cache);

  const authCore = await createAuthCore({ tenantCore, env: loadEnv() });
  const newTenant = await tenantCore.createTenant("tenant");
  const token = (
    await authCore.generateTokenFromCredentials({
      clientId: newTenant._id,
      clientSecret: newTenant.lastSecret,
    })
  )._unsafeUnwrap();

  const gottenTenant = await authCore.getTenantFromToken(token);
  assertEquals(newTenant, gottenTenant._unsafeUnwrap());
});

Deno.test(async function canGenerateAdminToken() {
  const tenantPersistence = createTenantInMemoryRepository();
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const authCore = await createAuthCore({
    tenantCore,
    env: { ...loadEnv(), ADMIN_SECRET: "admin" },
  });
  const token = await authCore.generateAdminTokenFromSecret("admin");
  assertEquals(token.isOk(), true);
});

Deno.test(async function returnErrorIfGenerateAdminTokenWithWrongSecret() {
  const tenantPersistence = createTenantInMemoryRepository();
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const authCore = await createAuthCore({
    tenantCore,
    env: { ...loadEnv(), ADMIN_SECRET: "admin" },
  });
  const token = await authCore.generateAdminTokenFromSecret("wrongSecret");
  assertEquals(token._unsafeUnwrapErr(), { error: "BAD_SECRET" });
});

Deno.test(async function returnErrorIfGenerateAdminTokenWithNoAdminSecret() {
  const tenantPersistence = createTenantInMemoryRepository();
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const authCore = await createAuthCore({
    tenantCore,
    env: { ...loadEnv(), ADMIN_SECRET: undefined! },
  });
  const token = await authCore.generateAdminTokenFromSecret("admin");
  assertEquals(token._unsafeUnwrapErr(), { error: "NO_ADMIN_SECRET_DEFINED" });
});

Deno.test(async function canGetAdminFromToken() {
  const tenantPersistence = createTenantInMemoryRepository();
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const authCore = await createAuthCore({
    tenantCore,
    env: { ...loadEnv(), ADMIN_SECRET: "admin" },
  });
  const token = await authCore.generateAdminTokenFromSecret("admin");
  assertEquals(token.isOk(), true);
  const admin = await authCore.getAdminFromToken(token._unsafeUnwrap());
  assertEquals(admin.isOk(), true);
});

Deno.test(async function notAdminTokenIsNotAdmin() {
  const tenantPersistence = createTenantInMemoryRepository();
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantPersistence,
  });
  const authCore = await createAuthCore({
    tenantCore,
    env: { ...loadEnv(), ADMIN_SECRET: "admin" },
  });
  const newTenant = await tenantCore.createTenant("tenant");
  const token = await authCore.generateTokenFromCredentials({
    clientId: newTenant._id,
    clientSecret: newTenant.lastSecret,
  });
  assertEquals(token.isOk(), true);
  const admin = await authCore.getAdminFromToken(token._unsafeUnwrap());
  assertEquals(admin._unsafeUnwrapErr(), { error: "BAD_CREDENTIALS" });
});
