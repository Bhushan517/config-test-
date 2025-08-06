import rateType from "../models/rate-type.model";
import { FastifyRequest, FastifyReply } from "fastify";
import { CreateRateTypeData, RateTypeInterface } from "../interfaces/rate-type-interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op, QueryTypes, Sequelize } from "sequelize";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { sequelize } from "../config/instance";
import { getAllRateTypes, rateTypeAdvanceFilter, rateTypeShiftAndRate } from "../utility/queries";

export const saveRateType = async (request: FastifyRequest, reply: FastifyReply) => {
  const data = request.body as CreateRateTypeData;
  const { program_id } = request.params as { program_id: string };
  const { name, rate, rate_type_category } = data;
  const trace_id = generateCustomUUID();
  const user=request?.user;
  logger(
    {
      trace_id,
      actor: {
        user_name: user?.preferred_username,
        user_id: user?.sub,
      },
      data: request.body,
      eventname: "Creating rate type config",
      status: "success",
      description: `Creating rate type for ${program_id}`,
      level: "info",
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false,
    },
    rateType
  );

  try {
    const existingRateTypeWithSameName = await rateType.findOne({
      where: { name, program_id },
    });

    if (existingRateTypeWithSameName) {
      logger(
        {
          trace_id,
          actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
          },
          data: request.body,
          eventname: "creating rate type",
          status: "error",
          description: `Rate type with name ${name} already exists for program ${program_id}`,
          level: "error",
          action: request.method,
          url: request.url,
          entity_id: program_id,
          is_deleted: false,
        },
        rateType
      );

      return reply.status(400).send({
        status_code: 400,
        message: "A rate type with this name already exists.",
        trace_id,
      });
    }

    if (rate?.base_differential_on) {
      const existingRateTypeWithSameBaseDifferential = await rateType.findOne({
        where: {
          rate_type_category,
          program_id,
          is_deleted: false,
          [Op.and]: Sequelize.literal(
            `JSON_EXTRACT(rate, '$.base_differential_on') = '${rate.base_differential_on}'`
          ),
        },
      });

      if (existingRateTypeWithSameBaseDifferential) {
        logger(
          {
            trace_id,
            actor: {
              user_name: user?.preferred_username,
              user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating rate type",
            status: "error",
            description: `Rate type with the same rate_type_category and base_differential_on already exists for program ${program_id}`,
            level: "error",
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false,
          },
          rateType
        );

        return reply.status(400).send({
          status_code: 400,
          message: "A rate type with the same category and base differential already exists.",
          trace_id,
        });
      }
    }

    const item = await rateType.create({
      ...data,
      program_id,
      created_by: user.sub,
      updated_by: user.sub,
    });

    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating rate type",
        status: "success",
        description: `Rate type created successfully for program ${program_id}`,
        level: "success",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      rateType
    );

    reply.status(201).send({
      status_code: 201,
      id: item.id,
      message: "Rate Type created successfully.",
      trace_id,
    });
  } catch (error: any) {
    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors[0].path;
      return reply.status(400).send({
        trace_id,
        message: `${field} already in use!`,
      });
    }
    logger(
      {
        trace_id,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating rate type",
        status: "error",
        description: `Error creating rate type for program ${program_id}`,
        level: "error",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      rateType
    );
    reply.status(500).send({
      status_code: 500,
      message: "Internal server error",
      trace_id,
      error,
    });
  }
};

export async function getAllRateType(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const {
    id,
    name,
    is_enabled,
    updated_on,
    is_shift_rate,
    is_base_rate,
    differential_on,
    rate_type_category,
    shift_type,
    rate_type_category_label,
    abbreviation,
    page = "1",
    limit = "10",
    hierarchy_ids,
  } = request.query as RateTypeInterface;

  const traceId = generateCustomUUID();

  try {
    const queryParams = getQueryParams({
      id,
      name,
      is_enabled,
      updated_on,
      is_shift_rate,
      is_base_rate,
      differential_on,
      rate_type_category,
      shift_type,
      rate_type_category_label,
      abbreviation,
      page,
      limit,
      hierarchy_ids,
    });

    const rateType = await fetchRateTypes(queryParams, program_id);
    const totalCount = rateType[0]?.total_records ?? 0;

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: rateType.length ? "Rate type fetched successfully." : "No rate type found for the given program",
      total_records: totalCount,
      page: queryParams.pageNumber,
      limit: queryParams.pageSize,
      rate_type: rateType,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal server error",
      error: error.message,
    });
  }
}

function getQueryParams(query: any) {
  const {
    id,
    name,
    is_enabled,
    updated_on,
    is_shift_rate,
    is_base_rate,
    differential_on,
    rate_type_category,
    shift_type,
    rate_type_category_label,
    abbreviation,
    page = "1",
    limit = "10",
    hierarchy_ids,
  } = query;

  return {
    id,
    name,
    differential_on,
    rate_type_category,
    shift_type,
    abbreviation,
    rateTypeCategoryLabels: rate_type_category_label ? rate_type_category_label.split(",") : [],
    hasName: !!name,
    hasId: !!id,
    isEnabledValue: parseBoolean(is_enabled),
    isShiftRateValue: parseBoolean(is_shift_rate),
    isBaseRate: parseBoolean(is_base_rate),
    hasDifferentialOn: !!differential_on,
    hasRateTypeCategory: !!rate_type_category,
    hasShiftType: !!shift_type,
    hasAbbreviation: !!abbreviation,
    hasHierarchies: !!hierarchy_ids,
    hierarchyIdsArray: hierarchy_ids ? hierarchy_ids.split(",") : [],
    ...parseDateRange(updated_on),
    pageNumber: parseInt(page, 10),
    pageSize: parseInt(limit, 10),
    offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
    hasHierarchyShiftFilter: !!hierarchy_ids,
  };
}

function parseBoolean(value: any): number | undefined {
  if (typeof value === "string") {
    return value.toLowerCase() === "true" ? 1 : value.toLowerCase() === "false" ? 0 : undefined;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return undefined;
}

function parseDateRange(updated_on: string): { startDate?: number; endDate?: number } {
  if (!updated_on) return {};

  const [startDateStr, endDateStr] = updated_on.split(",").map(v => v.trim());

  let startMs: number | undefined;
  let endMs: number | undefined;

  if (startDateStr) {
    const startDate = new Date(Number(startDateStr));
    startDate.setHours(0, 0, 0, 0);
    startMs = startDate.getTime();
  }

  if (endDateStr) {
    const endDate = new Date(Number(endDateStr));
    endDate.setHours(23, 59, 59, 999);
    endMs = endDate.getTime();
  } else if (startMs) {
    const endDate = new Date(Number(startDateStr));
    endDate.setHours(23, 59, 59, 999);
    endMs = endDate.getTime();
  }

  return {
    ...(startMs !== undefined && { startDate: startMs }),
    ...(endMs !== undefined && { endDate: endMs }),
  };
}


async function fetchRateTypes(queryParams: any, program_id: string) {
  return await sequelize.query<{ total_records: any }>(
    getAllRateTypes(
      queryParams.hasName,
      queryParams.hasId,
      queryParams.isEnabledValue !== undefined,
      queryParams.isShiftRateValue !== undefined,
      queryParams.isBaseRate !== undefined,
      queryParams.hasDifferentialOn,
      queryParams.hasRateTypeCategory,
      queryParams.hasShiftType,
      queryParams.rateTypeCategoryLabels.length > 0,
      queryParams.hasAbbreviation,
      queryParams.startDate,
      queryParams.endDate,
      queryParams.pageSize,
      queryParams.offset,
      queryParams.hasHierarchyShiftFilter
    ),
    {
      replacements: {
        program_id,
        ...(queryParams.hasName && { name: `%${queryParams.name}%` }),
        ...(queryParams.hasId && { id: queryParams.id }),
        ...(queryParams.isEnabledValue !== undefined && { is_enabled: queryParams.isEnabledValue }),
        ...(queryParams.isShiftRateValue !== undefined && { is_shift_rate: queryParams.isShiftRateValue }),
        ...(queryParams.isBaseRate !== undefined && { is_base_rate: queryParams.isBaseRate }),
        ...(queryParams.hasDifferentialOn && { differential_on: `%${queryParams.differential_on}%` }),
        ...(queryParams.hasRateTypeCategory && { rate_type_category: queryParams.rate_type_category }),
        ...(queryParams.rateTypeCategoryLabels.length > 0 && { rate_type_category_labels: queryParams.rateTypeCategoryLabels }),
        ...(queryParams.hasAbbreviation && { abbreviation: `%${queryParams.abbreviation}%` }),
        ...(queryParams.startDate !== undefined && { startDate: queryParams.startDate }),
        ...(queryParams.endDate !== undefined && { endDate: queryParams.endDate }),
        ...(queryParams.hasHierarchyShiftFilter && { hierarchy_ids: queryParams.hierarchyIdsArray }),
        limit: queryParams.pageSize,
        offset: queryParams.offset,
      },
      type: QueryTypes.SELECT,
    }
  );
}

export async function getRateTypeById(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as {
    id: string;
    program_id: string;
  };
  const traceId = generateCustomUUID();
  if (!id || !program_id) {
    return reply.status(400).send({
      status_code: 400,
      trace_id: traceId,
      message: "Invalid parameters"
    });
  }
  try {
    const rateTypeRecord = await rateType.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      }
    });

    if (!rateTypeRecord) {
      return reply.status(404).send({
        status_code: 404,
        trace_id: traceId,
        message: "Rate type not found"
      });
    }

    const [rateTypeCategory] = await sequelize.query(`SELECT id, label, value FROM picklistitems WHERE id = :rateTypeCategoryId;`, {
      replacements: { rateTypeCategoryId: rateTypeRecord.rate_type_category }
    });

    const [shiftType] = await sequelize.query(`SELECT id, shift_type_name FROM shift_types WHERE id = :shiftTypeId;`, {
      replacements: { shiftTypeId: rateTypeRecord.shift_type }
    });

    rateTypeRecord.rate_type_category = rateTypeCategory.length > 0 ? rateTypeCategory[0] : null;
    rateTypeRecord.shift_type = shiftType.length > 0 ? shiftType[0] : null;

    return reply.status(200).send({
      status_code: 200,
      message: "Get Ratetype succesfully",
      rate_type: rateTypeRecord,
      trace_id: traceId,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Failed to retrieve rate type",
      error: error.message
    });
  }
}

export const updateRateTypeById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { program_id, id } = request.params as { program_id: string; id: string };
  const updates = request.body as CreateRateTypeData;
  const traceId = generateCustomUUID();
  const { name } = request.body as { name: string };
  const user=request?.user;
  const userId = user?.sub;

  try {
    const rateTypes = await rateType.findOne({
      where: {
        id: id,
        program_id,
        is_deleted: false,
      },
    });

    if (!rateTypes) {
      return reply.status(200).send({
        status_code: 200,
        message: "Rate Types not found",
        trace_id: traceId,
      });
    }

    if (updates.name) {
      const existingRateTypeWithSameName = await rateType.findOne({
        where: {
          name,
          program_id: program_id,
          id: { [Op.ne]: id },
        },
      });

      if (existingRateTypeWithSameName) {
        return reply.status(400).send({
          status_code: 400,
          message: "A rate type with this name already exists.",
          trace_id: traceId,
        });
      }
    }
    await rateType.update(
      {
        ...updates,
        updated_on: Date.now(),
        updated_by: userId,
      },
      { where: { id, program_id } }
    );

    return reply.status(200).send({
      status_code: 200,
      message: "Rate type updated successfully",
      trace_id: traceId,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      message: "Internal server error",
      trace_id: traceId,
      error: error.message,
    });
  }
};

export async function getDifferentialOnForRateType(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const { is_shift_rate } = request.query as { is_shift_rate?: string };
  const traceId = generateCustomUUID();
  try {
    const whereConditions: any = {
      program_id,
      is_enabled: true,
      is_deleted: false,
    };

    const rateTypes = await rateType.findAll({
      where: whereConditions,
      attributes: ["id", "name", "is_base_rate", "is_shift_rate"],
    });

    let standard = null;
    const shift: { id: string; name: string }[] = [];

    rateTypes.forEach((rate: any) => {
      if (rate.is_base_rate && !rate.is_shift_rate) {
        standard = {
          id: rate.id,
          name: rate.name,
        };
      } else if (rate.is_base_rate && rate.is_shift_rate) {
        shift.push({
          id: rate.id,
          name: rate.name,
        });
      }
    });

    if (is_shift_rate === "false") {
      return reply.status(200).send({
        status_code: 200,
        message: "RateType get successfully",
        trace_id: traceId,
        differential_on: {
          standard
        },
      });
    }

    return reply.status(200).send({
      status_code: 200,
      message: "Rate type get successfully",
      trace_id: traceId,
      differential_on: {
        standard,
        shift,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Failed to retrieve rate type",
      error: error.message,
    });
  }
}

export async function getShiftAndRateType(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const traceId = generateCustomUUID();

  try {
    const results = await sequelize.query(rateTypeShiftAndRate, {
      replacements: { program_id },
      type: QueryTypes.SELECT,
    });

    const shiftTypes = results
      .filter((result: any) => result.shift_id && result.shift_name)
      .map((result: any) => ({
        id: result.shift_id,
        name: result.shift_name,
      }));

    const rateTypeCategories = results
      .filter((result: any) => result.rate_type_id && result.rate_type_value)
      .map((result: any) => ({
        id: result.rate_type_id,
        name: result.rate_type_value,
      }));

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      data: {
        shift_type: shiftTypes,
        rate_type_category: rateTypeCategories,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: 'Failed to retrieve shift and rate type data',
      error: error.message,
    });
  }
}

export async function rateTypeFilter(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const { id, rate_type_category, name, abbreviation, is_enabled, is_base_rate, updated_on, page, limit } = request.body as {
      id?: string;
      rate_type_category?: string;
      name?: string;
      abbreviation?: string;
      is_enabled?: boolean | string;
      is_base_rate?: boolean | string;
      updated_on?: any;
      page?: string;
      limit?: string;
    };

    const isEnabledFilter =
      typeof is_enabled === 'string'
        ? is_enabled === 'true' ? 1 : 0
        : is_enabled === true ? 1 : is_enabled === false ? 0 : undefined;

    const isBaseRateFilter =
      typeof is_base_rate === 'string'
        ? is_base_rate === 'true' ? 1 : 0
        : is_base_rate === true ? 1 : is_base_rate === false ? 0 : undefined;

    const pageNumber = parseInt(page ?? '1', 10);
    const limitNumber = parseInt(limit ?? '10', 10);
    const offset = (pageNumber - 1) * limitNumber;

    const hasUpdatedOnFilter = Array.isArray(updated_on) && updated_on.length === 2;

    const query = rateTypeAdvanceFilter(
      Boolean(id),
      Boolean(rate_type_category),
      Boolean(name),
      Boolean(abbreviation),
      isBaseRateFilter !== undefined,
      isEnabledFilter !== undefined,
      hasUpdatedOnFilter
    );

    const replacements: Record<string, any> = {
      program_id,
      id,
      rate_type_category,
      name: name ? `%${name}%` : undefined,
      abbreviation: abbreviation ? `%${abbreviation}%` : undefined,
      limit: limitNumber,
      offset,
      is_enabled: isEnabledFilter,
      is_base_rate: isBaseRateFilter,
      updated_on_start: hasUpdatedOnFilter ? updated_on[0] : undefined,
      updated_on_end: hasUpdatedOnFilter ? updated_on[1] : undefined,
    };

    const data = await sequelize.query<{ total_count: any }>(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const totalRecords = data.length > 0 ? data[0].total_count : 0;

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: data.length > 0 ? 'Rate Types fetched successfully.' : 'No records found.',
      total_records: totalRecords,
      page: pageNumber,
      limit: limitNumber,
      rate_type: data,
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
