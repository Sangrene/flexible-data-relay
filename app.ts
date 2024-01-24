import "https://deno.land/std@0.209.0/dotenv/load.ts";
import { runWebServer } from "./http/webserver.ts";
import { createEntityCore as createEntityCore } from "./entities/entity.core.ts";
// import { createEntityInMemoryRepository } from "./entities/entitiesinMemoryRepository.ts";
// import { tenantInMemoryRepository } from "./tenants/tenantsInMemoryRepository.ts";
import { createAuthCore } from "./auth/auth.ts";
import { createTenantCore } from "./tenants/tenant.core.ts";
import { createTenantCache } from "./graphql/graphqlSchemasCache.ts";
import { createTenantsMongoRepository } from "./tenants/tenantsMongoRepository.ts";
import { createEntitiesMongoRepository } from "./entities/entitiesMongoRepository.ts";
import { getMasterDb, getTenantDb } from "./persistence/mongo.ts";
import { createSubscriptionManager } from "./subscription/subscriptionManager.ts";
import { createWebhookSubscriptionPlugin } from "./subscription/webhookSubscription.ts";
import { createAMQPSubscriptionPlugin } from "./subscription/amqpSubscription.ts";

// const entityPersistence = createEntityInMemoryRepository();
// const tenantPersistence = tenantInMemoryRepository();

// Repositories
const entityPersistence = createEntitiesMongoRepository({ getTenantDb });
const tenantsPersistence = createTenantsMongoRepository(getMasterDb());

// Cores
const entityCore = createEntityCore({ persistence: entityPersistence });
const tenantCore = createTenantCore({
  tenantPersistenceHandler: tenantsPersistence,
});
const authCore = await createAuthCore({
  tenantCore,
});

// Services
const cache = await createTenantCache({
  initContent: await tenantCore.getAllSchemas(entityCore),
  mode: "mongo",
});
tenantCore.setCache(cache);

const subscriptionPlugins = [];
subscriptionPlugins.push(createWebhookSubscriptionPlugin());
if (Deno.env.get("RABBIT_MQ_CONNECTION_STRING")) {
  subscriptionPlugins.push(
    await createAMQPSubscriptionPlugin({
      connectionString: Deno.env.get("RABBIT_MQ_CONNECTION_STRING")!,
    })
  );
}
createSubscriptionManager({
  subscriptionPlugins: subscriptionPlugins,
  tenantCore,
});

// Start
runWebServer({
  entityCore,
  authCore,
  tenantCore,
  schemasCache: cache,
});
