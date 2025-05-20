import { FastifyInstance } from "fastify";
import { WebServerProps, getTenantFromRequest } from "./webserver.ts";
import { executeSourceAgainstSchema } from "../tenants/graphqlExecutionManager.ts";
import { SubscriptionCommand } from "../subscription/subscription.model.ts";

export const createAppRoutes = (
  fastify: FastifyInstance,
  { entityCore, tenantCore }: WebServerProps
) => {
  fastify.post<{ Body: { tenantName: string; entityName: string } }>(
    "/allow-access",
    {
      schema: {
        description: "Allow access to one of your entity to another tenant",
        tags: ["tenant"],
        summary: "Allow access to an entity",
        body: {
          type: "object",
          properties: {
            tenantName: { type: "string" },
            entityName: { type: "string" },
          },
        },
        headers: {
          Bearer: { type: "string" },
        },
        response: {
          201: {
            description: "Successful response",
            type: "object",
            properties: {},
          },
        },
      },
    },
    async (req) => {
      return await tenantCore.allowTenantAccessToOwnResource({
        currentTenantName: getTenantFromRequest(req).name,
        allowedTenantName: req.body.tenantName,
        entityName: req.body.entityName,
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
      const result = executeSourceAgainstSchema({
        source: request.body.query,
        entityCore,
        tenantCore,
        tenant: request.params.tenant,
        tenantRequestingAccess: getTenantFromRequest(request),
      });

      return result;
    }
  );

  fastify.post<{
    Params: { entity: string; tenant: string };
    Querystring: {
      reconciliationMode: "override" | "merge";
      transient: boolean;
    };
    Body:
      | Array<{ id: string; data: Record<string, any> }>
      | { id: string; data: Record<string, any> };
  }>(
    "/:tenant/entity/:entity",
    {
      schema: {
        description: "Create or update an entity",
        tags: ["entity"],
        summary: "Add entity",
        querystring: {
          type: "object",
          properties: {
            reconciliationMode: {
              type: "string",
              enum: ["override", "merge"],
              description:
                "If 'override', will replace existing object. If 'merge', it will merge into it, if it exists.",
            },
            transient: {
              type: "boolean",
              description:
                "If true, the data won't be stored but simply dispatch to subscribers.",
            },
          },
        },
        body: {
          anyOf: [
            {
              type: "object",
              properties: {
                id: { type: "string" },
                data: { type: "object" },
              },
            },
            {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  data: { type: "object" },
                },
              },
            },
          ],
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
    async function handler(request, reply) {
      tenantCore
        .accessGuard(getTenantFromRequest(request), {
          owner: request.params.tenant,
          entityName: request.params.entity,
        })
        .mapErr(({ error }) => {
          if (error === "NO_ACCESS") {
            return reply.status(403).send({
              error: error,
              message: "You don't have permission to access this resource",
            });
          }
        });
      if (Array.isArray(request.body)) {
        const result = await entityCore.createOrUpdateEntityList({
          tenant: request.params.tenant,
          entityName: request.params.entity,
          entityList: request.body,
          options: {
            schemaReconciliationMode: request.query.reconciliationMode,
            transient: request.query.transient,
          },
        });
        return result;
      } else {
        const entity = entityCore.createOrUpdateEntity({
          entity: request.body,
          tenant: request.params.tenant,
          entityName: request.params.entity,
          options: {
            schemaReconciliationMode: request.query.reconciliationMode,
            transient: request.query.transient,
          },
        });
        return entity;
      }
    }
  );

  fastify.post<{
    Body: { subscription: SubscriptionCommand };
  }>(
    "/subscribe",
    {
      schema: {
        description:
          "Create a subscription to a tenant entity update or creation",
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
    async function handler(request, reply) {
      const currentTenant = getTenantFromRequest(request);
      tenantCore
        .accessGuard(getTenantFromRequest(request), {
          owner: request.body.subscription.owner,
          entityName: request.body.subscription.entityName,
        })
        .mapErr(({ error }) => {
          if (error === "NO_ACCESS") {
            return reply.status(403).send({
              error: error,
              message: "You don't have permission to access this resource",
            });
          }
        });
      return (
        await tenantCore.createSubscription({
          subscription: request.body.subscription,
          tenant: currentTenant,
        })
      ).match(
        (result) => result,
        ({ error }) => {
          if (error === "NO_PERMISSION_TO_SUBSCRIBE_TO_THIS_RESOURCE") {
            return reply.status(403).send({
              error: error,
              message:
                "You don't have permission to subscribe to this resource",
            });
          }
        }
      );
    }
  );
};
