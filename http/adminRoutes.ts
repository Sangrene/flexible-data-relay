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
        async (req) => {
          return await tenantCore.createTenant(req.body.tenantName);
        }
      );
      done();
    },
    { prefix: "/admin" }
  );
};
