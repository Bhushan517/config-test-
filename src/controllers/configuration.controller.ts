import { FastifyRequest, FastifyReply } from "fastify";
import Configuration from "../models/configuration.model";
import { ConfigurationAttributes } from "../interfaces/configuration.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import generateSlug from '../plugins/slugGenerate';
import { logger } from "../utility/loggerService";
import { decodeToken } from "../middlewares/verifyToken";

export const getConfigurations = async (
  request: FastifyRequest,
  reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  try {
    const configurations = await Configuration.findAll({  order: [["updated_on", "DESC"], ["sr_Number", "ASC"]]  });

    if (configurations.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "Configuration data not found",
        configurations: [],
        trace_id: traceId,
      });
    }
    reply.status(200).send({
      status_code: 200,
      message: "Data fetch successfully",
      configurations: configurations,
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Failed to fetch configurations",
      trace_id: traceId,
    });
  }
};

export const getConfigurationById = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const { id } = request.params as { id: string };
  const configuration = await Configuration.findByPk(id);
  if (configuration) {
    reply.status(200).send({
      status_code: 200,
      message: "Data fetch successfully",
      configurations: configuration,
      trace_id: traceId,
    });
  } else {
    reply.status(200).send({
      status_code: 200,
      message: "Configuration data not found",
      configuration: [],
      trace_id: traceId,
    });
  }
};

export const createConfiguration = async (request: FastifyRequest, reply: FastifyReply) => {
  const configData = request.body as Partial<ConfigurationAttributes>;
  const { program_id } = request.body as { program_id: string };
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub;


  logger(
    {
      trace_id: traceId,
      actor: {
        user_name: user?.preferred_username,
        user_id: userId,
      },
      data: request.body,
      eventname: "creating configuration",
      status: "success",
      description: `Creating configuration for ${program_id}`,
      level: 'info',
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false
    },
    Configuration
  );

  try {
    const key = generateSlug(configData.title ?? '', {
      lowercase: true,
      trim: true,
      removedspecial: true,
    });

    if (configData.config_model) {
      configData.config_model = configData.config_model.toLowerCase();
    }

    if (configData.key) {
      configData.key = configData.key.toLowerCase();
    }

    const newConfiguration: any = await Configuration.create({
      ...configData,
      key,
      created_by: userId,
      updated_by: userId,
    });

    reply.status(201).send({
      status_code: 201,
      message: "Configuration data created successfully",
      configuration: newConfiguration?.id,
      trace_id: traceId,
    });


    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: userId,
        },
        data: request.body,
        eventname: "create configuration",
        status: "success",
        description: `create configuration for ${program_id} successfully`,
        level: 'success',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      Configuration
    );
  } catch (error) {
    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: userId,
        },
        data: request.body,
        eventname: "creating configuration",
        status: "error",
        description: `Error creating configuration for ${program_id}`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      Configuration
    );

    reply.status(500).send({
      status_code: 500,
      message: "Failed to create configuration",
      trace_id: traceId,
      error: error,
    });
  }
};

export const updateConfiguration = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();

  const user = request?.user;

  const userId = user?.sub;
  try {
    const { id } = request.params as { id: string };
    const configData = request.body as Partial<ConfigurationAttributes>;
    const configuration: any = await Configuration.findByPk(id);
    if (configuration) {
      await configuration.update({
        configData,
        updated_by: userId,
      });
      reply.status(201).send({
        status_code: 201,
        message: "Configuration data update successfully",
        configuration: configuration?.id,
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Configuration not found",
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Failed to update configuration",
      trace_id: traceId,
      error: error,
    });
  }
};

export const deleteConfiguration = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub;
  try {
    const { id } = request.params as { id: string };
    const configuration = await Configuration.findByPk(id);
    if (configuration) {
      await configuration.update({
        is_deleted: true,
        is_enabled: false,
        updated_by: userId,
      });
      reply.status(204).send({
        status_code: 204,
        message: "Configuration data deleted successfully",
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Configuration not found",
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Failed to delete configuration",
      trace_id: traceId,
      error: error,
    });
  }
};
