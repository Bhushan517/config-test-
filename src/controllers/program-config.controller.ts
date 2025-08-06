import { FastifyRequest, FastifyReply } from "fastify";
import ProgramsConfig from "../models/programs-config.model";
import { ProgramConfigAttributes } from "../interfaces/program-config.interface";
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from "sequelize";
import { decodeToken } from "../middlewares/verifyToken";

export const getConfigurations = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const configurations = await ProgramsConfig.findAll({ order: [["sr_Number", "ASC"]] });
  if (configurations.length === 0) {
    return reply.status(200).send({ message: "Configuration Not Found", hierarchies: [] });
  }
  reply.status(200).send({
    status_code: 200,
    message: "Configurations fetched successfully",
    program_configurations: configurations,
    trace_id: traceId,
  });
};

export const getConfigurationById = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const { id } = request.params as { id: string };
  const configuration = await ProgramsConfig.findByPk(id);
  if (configuration) {
    reply.status(200).send({
      status_code: 200,
      message: "Configuration fetched successfully",
      program_configuration: configuration,
      trace_id: traceId,
    });
  } else {
    reply.status(200).send({ status_code: 200, message: "Configuration Not Found", programsConfig: [] });
  }
};

export const createConfiguration = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const configData = request.body as Partial<ProgramConfigAttributes>;
  const newConfiguration = await ProgramsConfig.create(configData);
 
  const user=request?.user
  const userId = user?.sub;
  configData.created_by = userId;
  configData.updated_by = userId;


  reply.status(200).send({
    status_code: 200,
    message: "program configuration created successfully",
    trace_id: traceId,
    programsConfig: newConfiguration.id
  });
};

export const updateConfiguration = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
 
  const user=request?.user
  const userId = user?.sub
  try {
    const { program_id } = request.params as { program_id: string };
    const configs = request.body as Array<Partial<ProgramConfigAttributes & { id: string; value: any }>>;

    const updatedConfigurations = [];

    for (const configData of configs) {
      const { id, value, child_config } = configData;

      const configuration = await ProgramsConfig.findOne({
        where: {
          id,
          program_id,
        },
      });

      if (configuration) {
        await configuration.update({ value, child_config, updated_by: userId, });
        updatedConfigurations.push(configuration);
      } else {
        return reply.status(200).send({ status_code: 200, message: `Configuration With ID ${id} Not Found` });
      }
    }

    reply.status(200).send({
      status_code: 200,
      message: `Configuration has been updated  `,
      updatedConfigurations: updatedConfigurations,
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      stutus_code: 500,
      message: "Failed to update the configurations", error,
      trace_id: traceId,
    });
  }
};

export const deleteConfiguration = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { id } = request.params as { id: string };
  
  const user=request?.user
  const userId = user?.sub;
  const configuration = await ProgramsConfig.findByPk(id);
  if (configuration) {


    await configuration.destroy();
    reply.status(204).send({
      status_code: 204,
      message: "Configuration delete successfully",
    });
  } else {
    reply.status(200).send({ status_code: 200, message: "Configuration Not Found" });
  }
};

export const getProgramConfigurations = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { program_id } = request.params as { program_id: string };
  const { config_model, title } = request.query as {
    config_model?: string;
    title?: string;
  };

  const queryConditions: any = { program_id };
  if (title) queryConditions.title = { [Op.like]: `%${title}%` };
  if (config_model) queryConditions.config_model = config_model;
  const traceId = generateCustomUUID();
  try {
    const configurations = await ProgramsConfig.findAll({
      where: queryConditions,
    });

    if (configurations.length === 0) {
      return reply.status(200).send({ message: "Configuration Not Found", programsConfigs: [] });
    }

    const configMap = new Map<string, any>();
    configurations.forEach(config => {
      const configData = { ...config.toJSON(), child_config: [] };
      configMap.set(config.configuration_id, configData);
    });

    configMap.forEach(config => {
      if (config.parent_config_id) {
        const parentConfig = configMap.get(config.parent_config_id);
        parentConfig?.child_config.push(config);
      }
    });

    const filteredResult = [...configMap.values()].filter(config => !config.parent_config_id);

    return reply.status(200).send({
      statusCode: 200,
      message: "Program configurations retrieved successfully",
      configuration: filteredResult,
      traceId:traceId
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

export async function getConfigByProgramIdAndTitles(request: FastifyRequest,reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const { title, key } = request.query as { title?: string; key?: string };

  const responseFields = ['id', 'title', 'value', 'key'];
  const whereClause: any = { program_id };

  if (title) {
    const titlesArray = title.split(',').map((t) => t.trim());
    whereClause.title = titlesArray.length > 1 ? { [Op.in]: titlesArray } : titlesArray[0];
  }

  if (key) {
    whereClause.key = key;
  }

  try {
    const results = await ProgramsConfig.findAll({
      where: whereClause,
      attributes: responseFields,
    });

    if (results.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: 'No configurations found for the given program ID and title(s).',
        ProgramsConfig: []
      });
    }

    reply.status(200).send({
      status_code: 200,
      message: 'Configurations fetched successfully.',
      data: results,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: (error as any).message,
    });
  }
}

export const getTransformedConfig = async (request: FastifyRequest,reply: FastifyReply) => {
  const { program_id } = request.params as { program_id: string };
  const { config_model, key } = request.query as { config_model?: string; key?: string };

  try {
    const whereClause: Record<string, any> = { program_id };
    if (config_model) whereClause.config_model = config_model;
    if (key) whereClause.key = key;

    const configuration = await ProgramsConfig.findOne({
      where: whereClause,
    });

    if (!configuration) {
      return reply.status(200).send({
        status_code: 200,
        message: "Configuration Not Found",
        configuration: null,
      });
    }

    const transformedConfig = transformConfiguration(configuration.toJSON());

    reply.status(200).send({
      status_code: 200,
      message: "Configuration transformed successfully",
      configuration: transformedConfig,
    });
  } catch (error) {
    console.error("Error transforming configuration:", error);
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      error: error,
    });
  }
};

function transformConfiguration(config: any) {
  const transformed: any = {
    id: config.id,
  };

  if (Array.isArray(config.value)) {
    config.value.forEach((entry: any) => {
      const scope = entry.title.toLowerCase().replace(" ", "_");
      if (Array.isArray(entry.fields)) {
        entry.fields.forEach((field: any) => {
          if (field.type === "group") {
            const key = field.label
              .toLowerCase()
              .replace(/[^a-zA-Z0-9]+/g, "_")
              .replace(/(^_|_$)/g, "");
            transformed[`${key}`] = {
              name: field.label,
              scale: getScaleValue(field.fields, "Scaling Limit"),
              threshold: getScaleValue(field.fields, "Scaling Threshold"),
              precision_type: getFieldValue(field.fields, "Scaling Type"),
              scope: scope,
            };
          }
        });
      }
    });
  }

  return transformed;
}

function getScaleValue(fields: any[], label: string) {
  return fields.find((field: any) => field.label === label)?.value || 1; // Default to 1 if not found
}

function getFieldValue(fields: any[], label: string) {
  return fields.find((field: any) => field.label === label)?.value || "Round Up"; // Default to "Round Up" if not found
}