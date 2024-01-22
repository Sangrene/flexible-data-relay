import { FastifyInstance } from "fastify";
import { WebServerProps, getTenantFromRequest } from "./webserver.ts";
import { executeSourceAgainstSchema } from "../tenants/graphqlExecutionManager.ts";
import { Subscription } from "../tenants/tenant.model.ts";

export const createAppRoutes = (
  fastify: FastifyInstance,
  { authCore, entityCore, schemasCache, tenantCore }: WebServerProps
) => {
  fastify.post<{ Body: { tenantName: string } }>(
    "/allow-access",
    {
      schema: {
        description: "Allow access to your entities to another tenant",
        tags: ["tenant"],
        summary: "Allow access to own entities",
        body: {
          type: "object",
          properties: {
            tenantName: { type: "string" },
          },
        },
        headers: {
          Bearer: { type: "string" },
        },
        response: {
          201: {
            description: "Successful response",
            type: "object",
            properties: {
              Bearer: { type: "string" },
            },
          },
        },
      },
    },
    async (req) => {
      return await tenantCore.allowTenantAccessToOwnResource({
        currentTenantName: getTenantFromRequest(req).name,
        allowedTenantName: req.body.tenantName,
      });
    }
  );

  fastify.post<{ Params: { tenant: string }; Body: { query: string } }>(
    "/:tenant/graphql",
    {
      schema: {
        description: "Get access to the graphql endpoint",
        tags: ["tenant"],
        summary: "Graphql endpoint",
        body: {
          type: "object",
          properties: {
            tenantName: { type: "string" },
          },
        },
        headers: {
          Bearer: { type: "string" },
        },
        response: {
          201: {
            description: "Successful response",
            type: "object",
          },
        },
      },
    },
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
    {
      schema: {
        description: "Create or update an entity",
        tags: ["entity"],
        summary: "Add entity",
        body: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        headers: {
          Bearer: { type: "string" },
        },
        response: {
          201: {
            description: "Successful response",
            type: "object",
          },
        },
      },
    },
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
  }>(
    "/:tenant/subscribe",
    {
      schema: {
        description:
          "Create a subscription to a tenant entities update or creation",
        tags: ["entity"],
        summary: "Create subscription",
        body: {
          type: "object",
          properties: {
            subscription: {
              type: "object",
              properties: {
                owner: { type: "string" },
                entityName: { type: "string" },
                webhook: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                  },
                },
              },
            },
          },
        },
        headers: {
          Bearer: { type: "string" },
        },
        response: {
          201: {
            description: "Successful response",
            type: "object",
            properties: {
              subscriptionKey: { type: "string" },
            },
          },
        },
      },
    },
    async function handler(request) {
      const currentTenant = getTenantFromRequest(request);
      tenantCore.accessGuard(currentTenant, {
        owner: request.params.tenant,
      });

      return await tenantCore.createSubscription({
        subscription: request.body.subscription,
        tenant: currentTenant,
      });
    }
  );
};
