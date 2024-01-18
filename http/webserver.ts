import { executeSourceAgainstSchema } from "../tenants/tenantSchema.ts";
import { EntityCore } from "../entities/entity.core.ts";
import { GraphqlSchemasCache } from "../graphql/graphqlSchemasCache.ts";
import Fastify, { FastifyRequest } from "fastify";
import { AuthCore } from "../auth/auth.ts";
import { Tenant } from "../tenants/tenant.model.ts";
import { TenantCore } from "../tenants/tenant.core.ts";

type RequestWithTenant = FastifyRequest & { tenant?: Tenant };

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
        Bearer: await authCore.generateTokenFromCredentials({
          clientId: req.body.clientId,
          clientSecret: req.body.clientSecret,
        }),
      };
    }
  );

  await fastify.register(
    async (fastify, opts, done) => {
      fastify.addHook("preHandler", async (req: RequestWithTenant) => {
        const tenant = await authCore.getTenantFromToken(req.headers.bearer);
        req.tenant = tenant;
      });

      fastify.get("/:tenant", async function handler(request) {
        console.log(request.params);

        return { hello: "world" };
      });

      fastify.post<{ Params: { tenant: string }; Body: { query: string } }>(
        "/:tenant/graphql",
        async function handler(request) {
          //@ts-ignore
          const currentTenant: Tenant = request.tenant;
          if (currentTenant.name !== request.params.tenant) {
            authCore.accessGuard(currentTenant, {
              owner: request.params.tenant,
            });
          }

          const result = await executeSourceAgainstSchema({
            source: request.body.query,
            schemasCache: schemasCache,
            tenant: request.params.tenant,
          });
          return result;
        }
      );

      fastify.post<{ Params: { entity: string; tenant: string } }>(
        "/:tenant/entity/:entity",
        async function handler(request) {
          const entity = entityCore.createOrUpdateEntity({
            entity: request.body as any,
            tenant: request.params.tenant,
            entityName: request.params.entity,
          });
          return entity;
        }
      );
      done();
    },
    { prefix: "/app" }
  );

  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
  }
};
