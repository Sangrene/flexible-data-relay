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
import { createMongoService } from "./persistence/mongo.ts";
import { createSubscriptionManager, SubscriptionPlugin } from "./subscription/subscriptionManager.ts";
import { createWebhookSubscriptionPlugin } from "./subscription/webhookSubscription.ts";
import { createAMQPSubscriptionPlugin } from "./subscription/amqpSubscription.ts";
import { logger } from "./logging/logger.ts";

const startApp = async () => {
  // const entityPersistence = createEntityInMemoryRepository();
  // const tenantPersistence = tenantInMemoryRepository();

  const mongoService = await createMongoService();

  const entityPersistence = createEntitiesMongoRepository({ mongoService });
  const tenantsPersistence = createTenantsMongoRepository(mongoService);

  const entityCore = createEntityCore({ persistence: entityPersistence });
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantsPersistence,
  });
  const authCore = await createAuthCore({
    tenantCore,
  });

  const cache = createTenantCache({
    initContent: await tenantCore.getAllSchemas(entityCore),
    mode: "mongo",
    mongoService,
  });
  tenantCore.setCache(cache);
  entityCore.setCache(cache);

  const subscriptionPlugins: SubscriptionPlugin[] = [];
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
  await runWebServer({
    entityCore,
    authCore,
    tenantCore,
  });

  logger.info("App successfuly started");
};

try {
  await startApp();
} catch (e) {
  logger.error(e);
  throw e;
}
