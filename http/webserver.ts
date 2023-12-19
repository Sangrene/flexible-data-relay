import Fastify from "fastify";
import { executeSourceAgainstSchema } from "../tenants/tenantSchema.ts";
import { schemasInMemoryStore } from "../tenants/inMemoryTenantGraphqlSchemas.ts";

const runWebServer = async () => {
  const store = schemasInMemoryStore();
  const fastify = Fastify({
    logger: true,
  });

  fastify.get("/:tenant", async function handler(request, reply) {
    console.log(request.params);

    return { hello: "world" };
  });

  fastify.post<{ Params: { tenant: string }; Body: { query: string } }>(
    "/:tenant",
    async function handler(request, reply) {
      const result = executeSourceAgainstSchema({
        source: request.body.query,
        store,
        tenant: request.params.tenant,
      });
      console.log(request.body);
      return result;
    }
  );

  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
  }
};
