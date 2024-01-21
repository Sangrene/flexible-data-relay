import { FastifyInstance } from "fastify";
import { WebServerProps } from "./webserver.ts";

export const createAdminRoutes = async (
  fastify: FastifyInstance,
  { authCore, entityCore, schemasCache, tenantCore }: WebServerProps
) => {
  await fastify.register(
    async (fastify, _, done) => {
      fastify.post<{ Body: { secret: string } }>(
        "/createTenant",
        async (req) => {
          return await authCore.generateAdminTokenFromSecret(req.body.secret);
        }
      );
    },
    { prefix: "/admin" }
  );
};
