import "https://deno.land/std@0.209.0/dotenv/load.ts";
import { runWebServer } from "./http/webserver.ts";
import { createEntityCore as createEntityCore } from "./entities/entity.core.ts";
import { createEntityInMemoryRepository } from "./entities/entitiesinMemoryRepository.ts";
import { createTenantInMemoryRepository } from "./tenants/tenantsInMemoryRepository.ts";
import { createAuthCore } from "./auth/auth.ts";
import { createTenantCore } from "./tenants/tenant.core.ts";
import {
  createLocalSchemaChangeHandler,
  createMongoSchemaChangeHandler,
  createTenantCache,
} from "./graphql/graphqlSchemasCache.ts";
import { createTenantsMongoRepository } from "./tenants/tenantsMongoRepository.ts";
import { createEntitiesMongoRepository } from "./entities/entitiesMongoRepository.ts";
import { createMongoService } from "./persistence/mongo.ts";
import {
  createSubscriptionManager,
  SubscriptionPlugin,
} from "./subscription/subscriptionManager.ts";
import { createWebhookSubscriptionPlugin } from "./subscription/webhookSubscription.ts";
import { createAMQPSubscriptionPlugin } from "./subscription/amqpSubscription.ts";
import { logger } from "./logging/logger.ts";
import { Env, loadEnv } from "./env/loadEnv.ts";
import { createMessageBrokerManager } from "./message-broker/messageBrokerManager.ts";
const componentMap = {
  inMemory: async () => {
    return {
      entityRepository: createEntityInMemoryRepository(),
      tenantRepository: createTenantInMemoryRepository(),
      createSchemaChangeHandler: createLocalSchemaChangeHandler(),
    };
  },
  integrated: async (env: Env) => {
    const mongoService = await createMongoService(env);
    return {
      entityRepository: createEntitiesMongoRepository({ mongoService }),
      tenantRepository: createTenantsMongoRepository({ mongoService }),
      createSchemaChangeHandler: createMongoSchemaChangeHandler(mongoService),
    };
  },
} as const;

const startApp = async () => {
  const env = loadEnv();
  const { entityRepository, tenantRepository, createSchemaChangeHandler } =
    await componentMap[env.MODE](env);

  const entityCore = createEntityCore({ persistence: entityRepository });
  const tenantCore = createTenantCore({
    tenantPersistenceHandler: tenantRepository,
    env,
  });
  const authCore = await createAuthCore({
    tenantCore,
    env,
  });

  const cache = createTenantCache({
    initContent: await tenantCore.getAllSchemas(entityCore),
    createSchemaChangeHandler,
  });
  tenantCore.setCache(cache);
  entityCore.setCache(cache);

  const messageBrokerManager = createMessageBrokerManager({ env });
  const subscriptionPlugins: SubscriptionPlugin[] = [
    createWebhookSubscriptionPlugin(),
    await createAMQPSubscriptionPlugin({ env, messageBrokerManager, tenantCore }),
  ];

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
