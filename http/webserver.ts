import { EntityCore } from "../entities/entity.core.ts";
import Fastify, { FastifyRequest } from "fastify";
import { AuthCore } from "../auth/auth.ts";
import { Tenant } from "../tenants/tenant.model.ts";
import { TenantCore } from "../tenants/tenant.core.ts";
import fastifySwaggerPlugin from "@fastify/swagger";
import fastifySwaggerUIPlugin from "@fastify/swagger-ui";
import { createAppRoutes } from "./appRoutes.ts";
import { createAdminRoutes } from "./adminRoutes.ts";
import { logger } from "../logging/logger.ts";
import { AddressInfo } from "node:net";

type RequestWithTenant = FastifyRequest & { tenant?: Tenant };

export const getTenantFromRequest = (request: FastifyRequest) => {
  //@ts-ignore tenant is always there, and can't declare module to extends Request with deno
  return request.tenant as Tenant;
};
export interface WebServerProps {
  entityCore: EntityCore;
  tenantCore: TenantCore;
  authCore: AuthCore;
}
export const runWebServer = async ({
  entityCore,
  tenantCore,
  authCore,
}: WebServerProps) => {
  const fastify = Fastify({
    logger: false,
  });
  await fastify.register(fastifySwaggerPlugin, {
    swagger: {
      info: {
        title: "Flexible Data Relay",
        description: "Flexible data relay API description",
        version: "0.1.0",
      },
      host: "localhost",
      schemes: ["http"],
      consumes: ["application/json"],
      produces: ["application/json"],
      tags: [
        { name: "tenant", description: "Tenant related end-points" },
        { name: "entity", description: "Entity related end-points" },
      ],
    },
  });
  await fastify.register(fastifySwaggerUIPlugin, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (_request, _reply, next) {
        next();
      },
      preHandler: function (_request, _reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, _request, _reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  fastify.get("/health", () => {
    return {
      health: "OK",
    };
  });

  fastify.post<{ Body: { clientId: string; clientSecret: string } }>(
    "/token",
    {
      schema: {
        description:
          "Generate a token that should be use on all requests, in the Bearer header.",
        tags: ["tenant"],
        summary: "Generate token",
        body: {
          type: "object",
          properties: {
            clientId: { type: "string" },
            clientSecret: {
              type: "string",
            },
          },
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
    async (req, rep) => {
      return (
        await authCore.generateTokenFromCredentials({
          clientId: req.body.clientId,
          clientSecret: req.body.clientSecret,
        })
      ).match(
        (token) => {
          return { Bearer: token };
        },
        ({ error }) => {
          if (error === "NO_TENANT_WITH_THIS_ID") {
            return rep.status(404).send({
              error: "NO_TENANT_WITH_THIS_ID",
              message: "No tenant with this id",
            });
          }
          if (error === "BAD_CREDENTIALS") {
            return rep.status(401).send({
              error: "BAD_CREDENTIALS",
              message: "Bad credentials",
            });
          }
        }
      );
    }
  );

  fastify.post<{ Body: { secret: string } }>(
    "/admin-token",
    {
      schema: {
        description: "Generate an admin token that expires in 30 days",
        tags: ["admin"],
        summary: "Generate an admin token",
        body: {
          type: "object",
          properties: {
            secret: { type: "string" },
          },
        },
      },
    },
    async (req, rep) => {
      return (
        await authCore.generateAdminTokenFromSecret(req.body.secret)
      ).match(
        (token) => {
          return { Bearer: token };
        },
        ({ error }) => {
          return rep.status(401).send({ error: error });
        }
      );
    }
  );
  await createAdminRoutes(fastify, {
    authCore,
    entityCore,
    tenantCore,
  });

  await fastify.register(
    async (fastify, _, done) => {
      fastify.addHook("preHandler", async (req: RequestWithTenant) => {
        const bearer = req.headers.bearer;
        if (typeof bearer !== "string") {
          throw new Error("Bearer token format error");
        }
        const result = await authCore.getTenantFromToken(bearer);
        if (result.isErr()) {
          throw new Error(result.error.error);
        } else {
          req.tenant = result.value;
        }
      });

      createAppRoutes(fastify, {
        authCore,
        entityCore,
        tenantCore,
      });

      done();
    },
    { prefix: "/app" }
  );

  await fastify.listen({ port: 3000 });
  logger.info(
    `Webserver listening on port ${
      (fastify.server.address() as AddressInfo).port
    }`
  );
};
