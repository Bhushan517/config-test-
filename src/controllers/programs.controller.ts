import { Programs } from "../models/programs.model";
import { FastifyRequest, FastifyReply } from "fastify";
import {
  CreateProgramData,
  ProgramQuery,
} from "../interfaces/programs.interface";
import Tenant from "../models/tenant.model";
import { baseSearch } from "../utility/baseService";
import { Op, QueryTypes } from "sequelize";
import generateCustomUUID from "../utility/genrateTraceId";
import ProgramConfig from "../models/programs-config.model";
import Configuration from "../models/configuration.model";
import ProgramModule from "../models/program-module.model";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { sequelize } from "../config/instance";
import ProgramCustomField from "../models/program_custom_field_model";
import { clonePredefinedPicklistsForProgram } from "./picklist.controller";
import programMspAssociationModel from "../models/program-msp-association.model";
import { getCustomsField } from "../utility/get-custom-field";
import { parseValue } from "../utility/parse-value";
type MSP = {
  id: string;
  is_enabled: boolean;
};

export const saveProgram = async (request: FastifyRequest, reply: FastifyReply) => {
  const { msps = [], ...programData } = request.body as CreateProgramData & { msps?: string[] };
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
      eventname: "authenticated",
      status: "success",
      description: `Authenticated user ${user?.preferred_username}`,
      level: 'info',
      action: request.method,
      url: request.url,
      is_deleted: false
    },
    Programs
  );

  const transaction = await sequelize.transaction();

  try {
    const unique_id = programData.unique_id;
    if (unique_id) {
      const existingProgram = await Programs.findOne({ where: { unique_id } });
      if (existingProgram) {
        await transaction.rollback();
        return reply.status(400).send({
          status_code: 400,
          message: "Program with the same code already exists",
          trace_id: traceId,
        });
      }
    }
    const item: any = await Programs.create({ ...programData }, { transaction });

    const programId = item.id;

    if (Array.isArray(msps) && msps.length > 0) {
      for (const msp of msps) {
        const existingAssociation = await programMspAssociationModel.findOne({
          where: {
            program_id: programId,
            msp_id: msp.id
          },
          transaction
        });

        if (!existingAssociation) {
          await programMspAssociationModel.create({
            program_id: programId,
            msp_id: msp.id,
            created_by: userId,
            updated_by: userId,
            is_enabled: msp.is_enabled,
          }, { transaction });
        }
      }
    }

    reply.status(201).send({
      status_code: 201,
      id: programId,
      message: "Program Created Successfully",
      trace_id: traceId,
    });

    await clonePredefinedPicklistsForProgram(programId, userId, transaction);

    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating program",
        status: "success",
        description: `Creating program for ${item.id}`,
        level: 'success',
        action: request.method,
        url: request.url,
        is_deleted: false
      },
      Programs
    );

    process.nextTick(async () => {
      try {
        const defaultConfigs = await Configuration.findAll({ transaction });

        const programConfigs = defaultConfigs.map((config) => {
          const { id, created_by, updated_by, created_on, updated_on, ...configWithoutId } = config.toJSON();
          return {
            program_id: item.id,
            created_by: user.sub,
            updated_by: user.sub,
            configuration_id: id,
            ...configWithoutId,
          };
        });

        await ProgramConfig.bulkCreate(programConfigs, { transaction });

        await transaction.commit();
      } catch (error) {

        logger(
          {
            trace_id: traceId,
            actor: {
              user_name: user?.preferred_username,
              user_id: user?.sub,
            },
            data: request.body,
            eventname: "configuring program",
            status: "error",
            description: `Error configuring program for ${item.id}`,
            level: 'error',
            action: request.method,
            url: request.url,
            is_deleted: false
          },
          Programs
        );

        await transaction.rollback();
        console.error("Error in async configuration setup:", error);
      }
    });
  } catch (error: any) {

    await transaction.rollback();
    console.log(error);

    reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error.message,
    });

    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating program",
        status: "error",
        description: `Error creating program for ${programData.name}`,
        level: 'error',
        action: request.method,
        url: request.url,
        is_deleted: false
      },
      Programs
    );
  }
};

export const getAllProgram = async (request: FastifyRequest<{ Querystring: ProgramQuery }>, reply: FastifyReply) => {
  const { name, is_activated, start_date, tenant_id } = request.query as Partial<ProgramQuery>;
  const traceId = generateCustomUUID();

  try {
    const query = request.query as any;
    const page = parseInt(query.page ?? "1");
    const limit = parseInt(query.limit ?? "10");
    const offset = (page - 1) * limit;
    query.page && delete query.page;
    query.limit && delete query.limit;

    const filters: any = {
      is_deleted: false,
      ...(name && { display_name: { [Op.like]: `%${name.trim()}%` } }),
      ...(is_activated !== undefined && { is_activated: is_activated === "true" ? 1 : 0 }),
      ...(start_date && { start_date: { [Op.gte]: new Date(start_date) } }),
      ...(tenant_id && {
        [Op.or]: [
          { client_id: tenant_id.trim() },
          { msp_id: tenant_id.trim() }
        ]
      }),
    };

    const programs = await Programs.findAll({
      where: filters,
      include: [
        {
          model: Tenant,
          as: "client",
          where: {
            is_deleted: false,
          },
          attributes: ["name", "display_name", "id", "logo"],
        },
      ],
      attributes: ["id", "name", "display_name", "is_enabled", "unique_id", "client_id", "msp_id"],
      order: [['updated_on', 'DESC']],
      limit: limit,
      offset: offset,
    });

    const count = await Programs.count({
      where: filters,
    });

    if (programs.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "Programs not found",
        programs: [],
        trace_id: traceId,
      });
    }

    reply.status(200).send({
      status_code: 200,
      message: "Programs found",
      items_per_page: limit,
      total_records: count,
      programs: programs,
      trace_id: traceId,
    });
  } catch (error) {
    console.error('Error in getAllProgram:', error);
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server error",
      trace_id: traceId,
    });
  }
};

export const getProgramById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const traceId = generateCustomUUID();
  try {
const programs = await Programs.findOne({
  where: {
    id: id,
    is_deleted: false,
  },
  include: [
    {
      model: Tenant,
      as: "client",
      where: {
        is_deleted: false,
      },
      attributes: ["name", "display_name", "id", "logo"],
    },
    {
      model: Tenant,
      as: "msp",
      required: false,
      where: {
        is_deleted: false,
      },
      attributes: ["name", "display_name", "id", "logo"],
    },
  ],
  attributes: [
    "id",
    "name",
    "display_name",
    "description",
    "type",
    "start_date",
    "is_enabled",
    "unique_id",
  ],
});

if (programs) {
  const [customFieldsResult] = await sequelize.query(
    getCustomsField(programs.id, 'program_custom_field', 'program_id', 'custom_field_id'),
    {
      replacements: { id: programs.id },
      type: QueryTypes.SELECT,
    }
  ) as any;
  const customFields = customFieldsResult?.custom_fields
      .map((field: any) => ({
        ...field,
        value: parseValue(field.value),
      }))

  reply.status(200).send({
    status_code: 200,
    message: "Data fetch successfully",
    data: {
      ...programs.toJSON(),
      custom_fields: customFields ||[],
    },
    trace_id: traceId,
  });

} else {
  reply.status(200).send({
    status_code: 200,
    message: "Programs not found",
    trace_id: traceId,
    program: [],

  });
}
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server error",
      trace_id: traceId,
      error: error,
    });
  }
};

export const updateProgramById = async (request: FastifyRequest<{ Params: { id: string }; Body: Partial<CreateProgramData>; }>, reply: FastifyReply) => {
  const { id } = request.params;
  const updates = request.body as CreateProgramData;
  const traceId = generateCustomUUID();

  try {
    const user=request?.user
    const userId = user?.sub;

    const program = await Programs.findOne({
      where: {
        id: id,
        is_deleted: false,

      },
    });
    if (!program) {
      return reply.status(200).send({
        status_code: 200,
        message: "Program not found",
        trace_id: traceId,
      });
    }
    if (updates.module_groups != null && updates.module_groups.length > 0) {
      let modules = {
        modules: updates.module_groups,
      };
      await ProgramModule.update(modules, {
        where: { program_id: id }
      });
    }

    if (updates.msps?.length) {
      await updateProgramMsps(id, updates.msps, userId);
    }

    const updatedCount: any = await Programs.update({ ...updates, updated_by: userId }, {
      where: { id: id },
    });

    if (updates.custom_fields) {
      await ProgramCustomField.destroy({
        where: { program_id: id }

      });
    }


    if (Array.isArray(updates.custom_fields) && updates.custom_fields.length > 0) {
      const customFields = updates.custom_fields.map((field: { id: any; value: any; }) => ({
        program_id: updates.id,
        custom_field_id: field.id,
        value: field.value,
      }));
      await ProgramCustomField.bulkCreate(customFields);
    }

    reply.status(200).send({
      status_code: 200,
      id: updatedCount.id,
      message: "Program configuration updated successfully",
      trace_id: traceId,
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error.message,
    });
  }
};

export const updateProgramMsps = async (programId: string, msps: any[], userId: string) => {
  const mspIds = msps.map(msp => msp.id);

  if (mspIds.length === 0) return;

  const validMspIds = (
    await Tenant.findAll({
      where: { id: mspIds },
      attributes: ['id'],
      raw: true,
    })
  ).map((tenant) => tenant.id);

  if (validMspIds.length === 0) return;

  const existingAssociations = await programMspAssociationModel.findAll({
    where: { program_id: programId },
    attributes: ['msp_id', 'is_enabled'],
    raw: true,
  });

  const existingMspMap = new Map(existingAssociations.map(record => [record.msp_id, record.is_enabled]));

  const mspUpserts = msps.map((msp) => ({
    program_id: programId,
    msp_id: msp.id,
    created_by: userId,
    updated_by: userId,
    is_enabled: msp.is_enabled,
  }));

  const newAssociations = mspUpserts.filter(item => !existingMspMap.has(item.msp_id));
  const existingToUpdate = mspUpserts.filter(item => existingMspMap.has(item.msp_id));

  if (newAssociations.length > 0) {
    await programMspAssociationModel.bulkCreate(newAssociations);
  }

  for (const update of existingToUpdate) {
    await programMspAssociationModel.update(
      {
        is_enabled: update.is_enabled,
        updated_by: userId,
      },
      {
        where: {
          program_id: programId,
          msp_id: update.msp_id,
        },
      }
    );
  }
};

export async function deleteProgramById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const traceId = generateCustomUUID();
  try {
    const user=request?.user
    const userId = user?.sub;
    const program = await Programs.findByPk(id);
    if (program) {
      await program.update({
        is_enabled: false,
        is_deleted: true,
        updated_by: userId,
      });
      reply.status(204).send({
        status_code: 204,
        message: "Program Deleted Successfully",
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Program Not Found",
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error,
    });
  }
};

export async function advancedFilter(request: FastifyRequest, reply: FastifyReply) {
  const searchFields = ["is_enabled", "name"];
  const responseFields = ["id", "name", "display_name", "type", "is_enabled"];
  return baseSearch(request, reply, Programs, searchFields, responseFields);
}

export async function getMspByProgramId(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();

  try {
    const { program_id } = request.params as { program_id: string };
    const { is_enabled, is_msp_not_associated,type,display_name } = request.query as { is_enabled?: string; is_msp_not_associated?: string ,type?:string,display_name?:string};

    if (is_msp_not_associated === 'true') {
      const associatedMspRecords = await programMspAssociationModel.findAll({
        where: { program_id },
        attributes: ['msp_id'],
      });

      const associatedMspIds = associatedMspRecords.map((record: any) => record.msp_id);

      const tenantWhere: any = {
        id: {
          [Op.notIn]: associatedMspIds.length ? associatedMspIds : [null],
        },
        type:"msp"?.toLowerCase()
      };

      if (type) {
        tenantWhere.type = type;
      }
      if (display_name) {
        tenantWhere.display_name = {
          [Op.like]: `%${display_name.trim()}%`,
        };
      }

      const tenantData = await Tenant.findAll({
        where: tenantWhere,
        attributes: ['id', 'name', 'display_name'],
      });

      reply.status(200).send({
        status_code: 200,
        message: tenantData.length
          ? 'Unassociated MSP(s) retrieved successfully'
          : 'No unassociated MSP(s) found for the given program ID',
        total_records: tenantData.length,
        msps: tenantData,
        trace_id: traceId,
      });

      return;
    }
    const whereCondition: any = { program_id };

    if (is_enabled !== undefined) {
      whereCondition.is_enabled = is_enabled === 'true';
    }

    if (type) {
      whereCondition.type = type;
    }

    const { rows: mspAssociations, count: totalRecords } =
      await programMspAssociationModel.findAndCountAll({
        where: whereCondition,
        attributes: { exclude: ['created_by', 'updated_by'] },
        include: [
          {
            model: Tenant,
            as: 'msp',
            attributes: ['id', 'name', 'display_name'],
            required: false,
          },
        ],
      });

    const responseData = mspAssociations.map((item: any) => {
      const msp = item.toJSON();
      return {
        id: msp.id,
        program_id: msp.program_id,
        msp: {
          id: msp.msp?.id || null,
          name: msp.msp?.name || null,
          display_name: msp.msp?.display_name || null,
        },
        is_enabled: msp.is_enabled,
        created_on: msp.created_on,
        updated_on: msp.updated_on,
      };
    });

    reply.status(200).send({
      status_code: 200,
      message: responseData.length
        ? 'MSP(s) retrieved successfully'
        : 'No MSP(s) found for the given program ID',
      total_records: totalRecords,
      msp_associations: responseData,
      trace_id: traceId,
    });

  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal server error',
      trace_id: traceId,
      error: error.message,
    });
  }
}

export async function updateMspByProgramId(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const transaction = await sequelize.transaction();
  try {
    const { program_id, msp_id } = request.params as { program_id: string; msp_id: string };
    const updateData = request.body as Partial<{ is_enabled: boolean }>;

    const existingRecord = await programMspAssociationModel.findOne({
      where: { program_id, msp_id },
      transaction,
    });

    if (!existingRecord) {
      await transaction.rollback();
      return reply.status(404).send({
        status_code: 404,
        message: 'MSP association not found',
        trace_id: traceId,
      });
    }
    await programMspAssociationModel.update(updateData, {
      where: { program_id, msp_id },
      transaction
    });

    await transaction.commit();

    reply.status(200).send({
      status_code: 200,
      message: 'MSP association updated successfully',
      msp_id: msp_id,
      trace_id: traceId
    });
  } catch (error: any) {
    await transaction.rollback();
    reply.status(500).send({
      status_code: 500,
      message: 'Internal server error',
      error: error.message,
      trace_id: traceId
    });
  }
}
