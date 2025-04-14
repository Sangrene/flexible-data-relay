import { FastifyInstance } from "fastify";
import { WebServerProps } from "./webserver.ts";

export const createAdminRoutes = async (
  fastify: FastifyInstance,
  { authCore, tenantCore }: WebServerProps
) => {
  await fastify.register(
    async (fastify, _, done) => {
      fastify.addHook<{ Headers: { Bearer: string } }>(
        "preHandler",
        async (req) => {
          const isAdmin = await authCore.getAdminFromToken(req.headers.bearer);
          if (!isAdmin) throw new Error("Not an admin");
        }
      );

      fastify.post<{ Body: { tenantName: string } }>(
        "/create-tenant",
        {
          schema: {
            description:
              "This will create a new tenant with the given name.",
            tags: ["tenant"],
            summary: "Create tenant",
            headers: {
              Bearer: { type: "string", description: "This is the admin token that has been generated through the /admin-token endpoint." },
            },
            body: {
              type: "object",
              properties: {
                tenantName: { type: "string" },
              },
            },
            response: {
              201: {
                description: "Successful response",
                type: "object",
                properties: {
                  name: { type: "string" },
                },
              },
            },
          },
        },
        async (req) => {
          return await tenantCore.createTenant(req.body.tenantName);
        }
      );
      done();
    },
    { prefix: "/admin" }
  );
};
