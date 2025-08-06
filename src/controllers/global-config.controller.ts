import { FastifyRequest, FastifyReply } from 'fastify';
import GlobalConfigModel from '../models/global-config.model';
import GlobalConfigInterface from '../interfaces/global-config.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { decodeToken } from '../middlewares/verifyToken';


export async function createGlobalConfig(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub
  try {
    const industries = request.body as GlobalConfigInterface;
    const item: any = await GlobalConfigModel.create({ ...industries });
    reply.status(201).send({
      status_code: 201,
      message: "Global config created successfully",
      created_by: userId,
      updated_by: userId,
      data: item?.id,
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while creating',
      error
    });
  }
}


export async function getGlobalConfig(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const query = request.query as GlobalConfigInterface;
    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '10');
    const offset = (page - 1) * limit;
    query.page && delete query.page;
    query.limit && delete query.limit;
    const { rows: flags, count } = await GlobalConfigModel.findAndCountAll({
      where: { ...query, is_deleted: false },
      attributes: ["id", "name", "slug", "is_enabled",],
      limit: limit,
      offset: offset,
    });
    if (flags.length === 0) {
      return reply.status(200).send({ status_code: 200, message: "GlobalConfig not found", globalConfigs: [] });
    }
    reply.status(200).send({
      status_code: 200,
      message: "Global Config data get successfully",
      items_per_page: limit,
      total_records: count,
      industries: flags,
      trace_id: traceId,
    });
  } catch (error) {
    console.error(error);
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server error', error: error
    });
  }
}

export async function getGlobalConfigById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const { id } = request.params as { id: string };
  const globalConfig = await GlobalConfigModel.findOne({
    where: {
      id: id,
      is_deleted: false,
    },
    attributes: ["id", "name", "slug", "is_enabled"]
  });
  if (globalConfig) {
    reply.status(200).send({
      status_code: 200,
      message: "Global config get successfully",
      global_launch_data: globalConfig,
      trace_id: traceId,
    });
  } else {
    reply.status(404).send({
      status_code: 404,
      message: 'Global Config Not Found',
      globalConfig: []
    });
  }
}


export async function updateGlobalConfig(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub
  try {
    const { id } = request.params as { id: string };
    const { ...config } = request.body as GlobalConfigInterface;
    const globalConfig = await GlobalConfigModel.update({ ...config, updated_by: userId }, { where: { id } },);
    if (globalConfig) {
      reply.status(200).send({
        status_code: 200,
        message: 'GlobalConfig Updated Successfully',
        data: globalConfig,
        trace_id: traceId,
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'Global Config Not Found'
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server error', error: error,
    });
  }
}

export async function updateGlobalConfigFlags(
  request: FastifyRequest<{ Body: { global_launches: { id: string; is_enabled: boolean }[] } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const { global_launches } = request.body;
  const user = request?.user;
  const userId = user?.sub
  try {
    await GlobalConfigModel.sequelize?.transaction(async (t) => {
      await Promise.all(global_launches.map(async (launch) => {
        await GlobalConfigModel.update(
          { is_enabled: launch.is_enabled, updated_by: userId, },
          { where: { id: launch.id }, transaction: t }
        );
      }));
    });
    reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: 'Global launch flag updated successfully',
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while updating data.',
      error: error as Error,
    });
  }
}

export async function deleteGlobalConfig(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub
  try {
    const { id } = request.params;
    const globalConfig = await GlobalConfigModel.findByPk(id);
    if (globalConfig) {
      await globalConfig.update({
        is_enabled: false,
        is_deleted: true,
        updated_by: userId,
      })
      reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: 'Global Config Deleted Successfully'
      });
    } else {
      reply.status(404).send({ status_code: 404, message: 'Global Config Not Found' });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while deleting GlobalConfig',
      error: error,
    });
  }
}

export const bulkUploadGlobalConfig = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  try {
    const { global_config_data } = request.body as { global_config_data: any[] };

    if (!global_config_data || !Array.isArray(global_config_data)) {
      return reply.status(400).send({
        status_code: 400,
        message: 'Invalid input: global_config_data should be an array',
        trace_id: traceId,
      });
    }

    const global_launch_data = await GlobalConfigModel.bulkCreate(global_config_data);

    reply.status(201).send({
      status_code: 201,
      data: global_launch_data,
      message: 'Global config created successfully',
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Failed to create global config',
      trace_id: traceId,
      error: error,
    });
  }
};
