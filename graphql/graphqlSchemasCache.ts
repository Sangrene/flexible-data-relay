import { ChangeStreamDocument } from "mongodb";
import { eventBus } from "../event/eventBus.ts";
import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";
import { getKeys } from "../utils/objectUtils.ts";
import { logger } from "../logging/logger.ts";
import { MongoService } from "../persistence/mongo.ts";

type SchemaChangeHandler = {
  schemas: CacheContent;
  mongoService?: MongoService;
};
const createMongoSchemaChangeHandler = ({
  mongoService,
  schemas,
}: SchemaChangeHandler) => {
  if (!mongoService)
    throw new Error(
      "Mongo service is not provided to the MongoSchemaChangeHandler"
    );
  const onChangeEntitySchema =
    (tenant: string) => (e: ChangeStreamDocument<JSONSchema7>) => {
      if (e.operationType === "insert") {
        schemas[tenant].entities?.push(e.fullDocument);
      }
      if (e.operationType === "update") {
        if (!schemas[tenant].entities) {
          schemas[tenant].entities = [];
        }
        const index = schemas[tenant].entities?.findIndex(
          (schema) => schema.title === e.fullDocument?.title
        );
        if (index) {
          schemas[tenant].entities![index] = e.fullDocument!;
        } else {
          schemas[tenant].entities?.push(e.fullDocument!);
        }
      }
    };

  const listenToTenantSchemaUpdate = (tenant: string) => {
    const tenantStream = mongoService
      .getTenantDb(tenant)
      .collection<JSONSchema7>("schemas")
      .watch([], { fullDocument: "updateLookup" });
    logger.info(`Cache listening to change on ${tenant}`);
    tenantStream.on("change", onChangeEntitySchema(tenant));
  };

  const init = () => {
    const masterStream = mongoService.getMasterDb().watch();
    masterStream.on("change", (e) => {
      if (e.operationType === "insert") {
        schemas[e.fullDocument.name] = { entities: [] };
        listenToTenantSchemaUpdate(e.fullDocument.name);
      }
    });

    for (let i = 0; i < getKeys(schemas).length; i++) {
      const tenant = getKeys(schemas)[i] as string;
      listenToTenantSchemaUpdate(tenant);
    }
    logger.info("Init mongo cache & subscription");
  };

  return {
    init,
  };
};

const createLocalSchemaChangeHandler = ({ schemas }: SchemaChangeHandler) => {
  const init = () => {
    eventBus.subscribe({
      queue: "entity-schema.updated",
      callback: ({ schema, tenant }) => {
        if (!schemas[tenant]) {
          schemas[tenant] = { entities: [] };
        }
        logger.info("Entity schema updated using local bus");
        const index = schemas[tenant].entities?.findIndex(
          (entity) => entity.title === schema.title
        );
        if (typeof index === "undefined") return;
        if (index > -1) {
          schemas[tenant].entities![index] = schema;
        } else {
          schemas[tenant].entities!.push(schema);
        }
      },
    });
    logger.info("Init local cache & subscription");
  };

  return { init };
};

const schemaChangeHandlersFactories = {
  local: createLocalSchemaChangeHandler,
  mongo: createMongoSchemaChangeHandler,
};

type CacheContent = {
  [tenant: string]: { entities?: JSONSchema7[] };
};

type TenantCacheProps =
  | { mode: "mongo"; mongoService: MongoService }
  | { mode: "local"; mongoService: undefined };
  
export const createTenantCache = ({
  initContent,
  mode,
  mongoService,
}: {
  initContent?: CacheContent;
} & TenantCacheProps) => {
  const schemas: CacheContent = initContent || {};

  const getTenantCache = (tenant: string) => {
    return schemas[tenant];
  };

  const getEntitySchemaFromCache = (tenant: string, entityName: string) => {
    return schemas[tenant]?.entities?.find((ent) => ent.title === entityName);
  };
  schemaChangeHandlersFactories[mode]({ schemas, mongoService }).init();

  return {
    getTenantCache,
    getEntitySchemaFromCache,
  };
};

export type TenantsCache = Awaited<ReturnType<typeof createTenantCache>>;
