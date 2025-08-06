import { FastifyRequest, FastifyReply } from 'fastify';
import IndustriesModel from '../models/labour-category.model';
import { IndustriesInterface, } from '../interfaces/labour-category.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Op, QueryTypes } from 'sequelize';
import { labourCategoryAdvanceFilter } from '../utility/queries';
import { sequelize } from '../config/instance';

export async function createIndustries(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { program_id } = request.params as { program_id: string };
  const labour_categories = request.body as IndustriesInterface;
  const { name } = request.body as { name: string };
  const traceId = generateCustomUUID();

  const user=request?.user
  const userId = user?.sub;

  

  logger(
    {
      trace_id: traceId,
      actor: {
        user_name: user?.preferred_username,
        user_id: user?.sub,
      },
      data: request.body,
      eventname: "creating labour categories",
      status: "success",
      description: `Creating labour categories for ${program_id}`,
      level: 'info',
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false
    },
    IndustriesModel
  );

  try {
    const existingIndustryWithSameName = await IndustriesModel.findOne({
      where: {
        name,
        program_id
      },
    });

    if (existingIndustryWithSameName) {
      return reply.status(400).send({
        status_code: 400,
        message: " labour category already exists with this name",
        trace_id: traceId,
      });
    }

    const item = await IndustriesModel.create({ ...labour_categories, created_by: userId, updated_by: userId });
    reply.status(201).send({
      status_code: 201,
      message: "Industries create successfully",
      data: item.id,
      trace_id: traceId,
    });

    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creat labour categories",
        status: "success",
        description: `Creat labour categories for ${program_id} successfully: ${item.id}`,
        level: 'success',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      IndustriesModel
    );
  } catch (error: any) {
    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create labour categories",
        status: "error",
        description: `error to create labour categories for ${program_id}`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      IndustriesModel
    );

    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
    });
  }
}

export const getIndustries = async (request: FastifyRequest, reply: FastifyReply) => {
  const { program_id } = request.params as { program_id: string };
  const { name, is_enabled, updated_on, page, limit } = request.query as {
    name?: string;
    is_enabled?: boolean | string;
    updated_on?: string;
    page?: string;
    limit?: string;
  };
  const traceId = generateCustomUUID();

  try {
    const pageNumber = page ? parseInt(page, 10) : null;
    const pageSize = limit ? parseInt(limit, 10) : null;

    const offset = pageNumber && pageSize ? (pageNumber - 1) * pageSize : undefined;

    const whereCondition: any = { is_deleted: false, program_id };

    if (name) {
      whereCondition.name = { [Op.like]: `%${name}%` };
    }

    if (is_enabled !== undefined) {
      whereCondition.is_enabled = is_enabled === 'true';
    }

    if (updated_on) {
      const dateRange = updated_on.split(',');
      if (dateRange.length === 2) {
        const startDate = parseFloat(dateRange[0].trim());
        const endDate = parseFloat(dateRange[1].trim());
        whereCondition.updated_on = { [Op.between]: [startDate, endDate] };
      }
    }

    const queryOptions: any = {
      where: whereCondition,
      attributes: ['id', 'name', 'is_enabled', 'created_on', 'updated_on', 'code'],
      order: [['updated_on', 'DESC']]
    };

    if (pageNumber && pageSize) {
      queryOptions.limit = pageSize;
      queryOptions.offset = offset;
    }

    const { rows: labour_categories, count } = await IndustriesModel.findAndCountAll(queryOptions);

    if (labour_categories.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: 'No labour categories found',
        labour_categories: [],
      });
    }

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: 'Labour categories retrieved successfully',
      ...(pageNumber && pageSize
        ? {
            items_per_page: pageSize,
            current_page: pageNumber,
            total_records: count,
          }
        : {}),
      labour_categories
    });

  } catch (error) {
    return reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: error
    });
  }
};


export async function getIndustriesById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const item = await IndustriesModel.findOne({
      where: { id, program_id, is_deleted: false },
      attributes: ['id', 'name', 'is_enabled', 'created_on', 'updated_on','code'],
    });
    if (item) {
      reply.status(200).send({
        status_code: 200,
        message: "Industries get sueccssfully",
        labour_category_data: item,
        trace_id: traceId
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'labour category not found',
        labour_category: [],
        trace_id: traceId
      });
    }
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      message: 'An error occurred while fetching',
      trace_id: traceId
    });
  }
}

export async function updateIndustries(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const { id } = request.params as { id: string };
    const labour_categories = request.body as IndustriesInterface;
    const { name } = request.body as { name: string };
    const user=request?.user
    const userId = user?.sub;

    const existingIndustryWithSameName = await IndustriesModel.findOne({
      where: {
        name,
        program_id,
        id: { [Op.ne]: id },
      },
    });

    if (existingIndustryWithSameName) {
      return reply.status(400).send({
        status_code: 400,
        message: "Invalid Name Field, Name Must Be Unique.",
        trace_id: traceId,
      });
    }

    const [numRowsUpdated] = await IndustriesModel.update(
      { ...labour_categories, updated_on: Date.now(), updated_by: userId },
      { where: { id, program_id } }
    );

    if (numRowsUpdated > 0) {
      reply.status(200).send({
        status_code: 200,
        message: "Industries get successfully",
        labour_category_id: id,
        trace_id: traceId,
      });
    } else {
      reply.status(404).send({ status_code: 401, message: 'labour categories not found' });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while updating',
      trace_id: traceId
    });
  }
}

export async function deleteIndustries(
  request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id, program_id } = request.params;
    const user=request?.user
    const userId = user?.sub;
    const [numRowsDeleted] = await IndustriesModel.update({
      is_deleted: true,
      is_enabled: false,
      updated_on: Date.now(),
      updated_by: userId
    },
      { where: { id, program_id } }
    );

    if (numRowsDeleted > 0) {
      reply.status(200).send({
        statusCode: 200,
        message: "Industries delete successfully",
        labour_category_id: id,
        trace_id: traceId,
      });
    } else {
      reply.status(404).send({ status_code: 404, message: 'labour categories not found' });
    }
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      message: 'An error occurred while deleting',
      trace_id: traceId
    });
  }
}

export const bulkUploadIndustries = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  try {
    const labour_categories = request.body as any[];
    const createdLabourCategories = await IndustriesModel.bulkCreate(labour_categories);
    reply.status(201).send({
      status_code: 201,
      data: createdLabourCategories,
      message: 'labour categories Created successfully',
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Failed to create labour categories',
      trace_id: traceId,
      error: error,
    });
  }
};

export async function labourCategoryFilter(request: FastifyRequest,reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };

    const {
      id,
      name,
      updated_on,
      is_enabled,
      page,
      limit,
    } = request.body as {
        id?: string;
        name?: string;
        updated_on?: any;
        is_enabled?: boolean | string;
        page?: string;
        limit?: string;
    };

    const isEnabledFilter =
      is_enabled === 'true' || is_enabled === true ? true :
        is_enabled === 'false' || is_enabled === false ? false :
          undefined;

    const pageNumber = parseInt(page ?? '1', 10);
    const limitNumber = parseInt(limit ?? '10', 10);
    const offset = (pageNumber - 1) * limitNumber;

    const replacements: Record<string, any> = {
      program_id,
      id,
      limit: limitNumber,
      offset,
      is_enabled: isEnabledFilter,
    };

    if (name) {
      replacements['name'] = `%${name}%`;
    }

    let updatedOnCondition = '';
    if (Array.isArray(updated_on) && updated_on.length === 2) {
      const [startDate, endDate] = updated_on;
      if (!isNaN(startDate) && !isNaN(endDate)) {
        replacements['updated_on_start'] = startDate;
        replacements['updated_on_end'] = endDate;
        updatedOnCondition = 'AND labour_category.updated_on BETWEEN :updated_on_start AND :updated_on_end';
      }
    } else if (updated_on) {
      console.warn(`Invalid format for updated_on`);
    }

    const query = labourCategoryAdvanceFilter(
      Boolean(id),
      Boolean(name),
      updatedOnCondition,
      isEnabledFilter !== undefined
    );

    const data = await sequelize.query<{ total_count: number }>(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const totalRecords = data.length > 0 ? data[0].total_count : 0;

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: data.length > 0 ? 'Labour categories fetched successfully.' : 'No records found.',
      total_records: totalRecords,
      page: pageNumber,
      limit: limitNumber,
      labour_categories: data,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: error.message,
    });
  }
}