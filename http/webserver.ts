import { executeSourceAgainstSchema } from "../tenants/tenantSchema.ts";
import { EntityCore } from "../entities/entity.core.ts";
import { schemaCache } from "../graphql/graphqlSchemasCache.ts";
import { EntityPersistenceHandler } from "../entities/entities.persistence.ts";
import Fastify, { FastifyRequest } from "fastify";
import createAuthServer from "../auth/auth.ts";
import { TenantRepository } from "../tenants/tenant.persistence.ts";
import { Tenant } from "../tenants/tenant.model.ts";

export const runWebServer = async ({
  entityCore,
  entityPersistence,
  tenantPersistence,
}: {
  entityCore: EntityCore;
  entityPersistence: EntityPersistenceHandler;
  tenantPersistence: TenantRepository;
}) => {
  const authServer = await createAuthServer({
    tenantRepository: tenantPersistence,
  });
  const store = schemaCache(entityPersistence);
  const fastify = Fastify({
    logger: true,
  });

  fastify.post<{ Body: { clientId: string; clientSecret: string } }>(
    "/token",
    async (req, res) => {
      return {
        Bearer: await authServer.generateTokenFromCredentials(req.body),
      };
    }
  );

  fastify.addHook(
    "preHandler",
    async (req: FastifyRequest & { tenant?: Tenant }, rep) => {
      const tenant = await authServer.getTenantFromToken(req.headers.Bearer);
      req.tenant = tenant;
    }
  );

  fastify.get("/app/:tenant", async function handler(request, reply) {
    console.log(request.params);

    return { hello: "world" };
  });

  fastify.post<{ Headers: { tenant: string }; Body: { query: string } }>(
    "/app/:tenant/graphql",
    async function handler(request, reply) {
      const result = await executeSourceAgainstSchema({
        source: request.body.query,
        schemasCache: store,
        tenant: request.headers.tenant,
      });
      return result;
    }
  );

  fastify.post<{ Headers: { tenant: string }; Params: { entity: string } }>(
    "/app/entity/:entity",
    async function handler(request, reply) {
      const entity = entityCore.createOrUpdateEntity({
        entity: request.body as any,
        tenant: request.headers.tenant,
        entityName: request.params.entity,
      });
      return entity;
    }
  );

  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
  }
};
