import { executeSourceAgainstSchema } from "../tenants/tenantSchema.ts";
import { EntityCore } from "../entities/entity.core.ts";
import { GraphqlSchemasCache } from "../graphql/graphqlSchemasCache.ts";
import Fastify, { FastifyRequest } from "fastify";
import { AuthCore } from "../auth/auth.ts";
import { Tenant } from "../tenants/tenant.model.ts";
import { TenantCore } from "../tenants/tenant.core.ts";

export const runWebServer = async ({
  entityCore,
  tenantCore,
  authCore,
  schemasCache,
}: {
  entityCore: EntityCore;
  tenantCore: TenantCore;
  authCore: AuthCore;
  schemasCache: GraphqlSchemasCache;
}) => {
  const fastify = Fastify({
    logger: true,
  });

  fastify.post<{ Body: { clientId: string; clientSecret: string } }>(
    "/token",
    async (req) => {
      return {
        Bearer: await authCore.generateTokenFromCredentials(req.body),
      };
    }
  );

  fastify.addHook(
    "preHandler",
    async (req: FastifyRequest & { tenant?: Tenant }) => {
      const tenant = await authCore.getTenantFromToken(req.headers.Bearer);
      req.tenant = tenant;
    }
  );

  fastify.get("/app/:tenant", async function handler(request) {
    console.log(request.params);

    return { hello: "world" };
  });

  fastify.post<{ Headers: { tenant: string }; Body: { query: string } }>(
    "/app/:tenant/graphql",
    async function handler(request) {
      const result = await executeSourceAgainstSchema({
        source: request.body.query,
        schemasCache: schemasCache,
        tenant: request.headers.tenant,
      });
      return result;
    }
  );

  fastify.post<{ Headers: { tenant: string }; Params: { entity: string } }>(
    "/app/entity/:entity",
    async function handler(request) {
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
