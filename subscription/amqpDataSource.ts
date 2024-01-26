import { connect } from "https://deno.land/x/amqp@v0.23.1/mod.ts";
import { eventBus } from "../event/eventBus.ts";
import { logger } from "../logging/logger.ts";
import { EntityCore } from "../entities/entity.core.ts";

const createAMQPDataSource = async ({
  connectionString,
  entityCore,
}: {
  connectionString: string;
  entityCore: EntityCore;
}) => {
  const connection = await connect(connectionString);
  const channel = await connection.openChannel();
  logger.info("AMQP publisher plugin connected to provided RabbitMQ instance.");

  eventBus.subscribe({
    queue: "entity.subscribed",
    callback: async ({ entityName, queueName, tenant }) => {
      await channel.declareQueue({ queue: queueName });
      await channel.consume({ queue: queueName }, async (args, props, data) => {
        const decodedData = JSON.parse(new TextDecoder().decode(data));
        if (decodedData.entity?.id) {
          await entityCore.createOrUpdateEntity({
            entity: decodedData.entity,
            entityName,
            tenant,
          });
        }
        await channel.ack({ deliveryTag: args.deliveryTag });
      });
    },
  });
};
