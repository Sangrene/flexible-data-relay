import { executeSourceAgainstSchema } from "../tenants/graphqlExecutionManager.ts";
import { EntityCore } from "../entities/entity.core.ts";
import { TenantsCache } from "../graphql/graphqlSchemasCache.ts";
import Fastify, { FastifyRequest } from "fastify";
import { AuthCore } from "../auth/auth.ts";
import { Subscription, Tenant } from "../tenants/tenant.model.ts";
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
  schemasCache: TenantsCache;
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
    async (fastify, _, done) => {
      fastify.addHook("preHandler", async (req: RequestWithTenant) => {
        const tenant = await authCore.getTenantFromToken(req.headers.bearer);
        if (!tenant) throw new Error("No tenant");
        req.tenant = tenant;
      });

      const getTenantFromRequest = (request: FastifyRequest) => {
        //@ts-ignore tenant is always there, and can't declare module to extends Request with deno
        return request.tenant as Tenant;
      };

      fastify.get("/:tenant", async function handler(request) {
        console.log(request.params);

        return { hello: "world" };
      });

      fastify.post<{ Body: { tenantName: string } }>(
        "/allow-access",
        async (req) => {
          return await tenantCore.allowTenantAccessToOwnResource({
            currentTenantName: getTenantFromRequest(req).name,
            allowedTenantName: req.body.tenantName,
          });
        }
      );

      fastify.post<{ Params: { tenant: string }; Body: { query: string } }>(
        "/:tenant/graphql",
        async function handler(request) {
          tenantCore.accessGuard(getTenantFromRequest(request), {
            owner: request.params.tenant,
          });

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
          tenantCore.accessGuard(getTenantFromRequest(request), {
            owner: request.params.tenant,
          });

          const entity = entityCore.createOrUpdateEntity({
            entity: request.body as any,
            tenant: request.params.tenant,
            entityName: request.params.entity,
          });
          return entity;
        }
      );

      fastify.post<{
        Params: { tenant: string };
        Body: { subscription: Subscription };
      }>("/:tenant/subscribe", async function handler(request) {
        const currentTenant = getTenantFromRequest(request);
        tenantCore.accessGuard(currentTenant, {
          owner: request.params.tenant,
        });

        return await tenantCore.createSubscription({
          subscription: request.body.subscription,
          tenant: currentTenant,
        });
      });
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
