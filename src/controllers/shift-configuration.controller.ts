import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from '../utility/genrateTraceId';
import ShiftType from '../models/shift-type.model'
import { ShiftConfigurationAttributes } from "../interfaces/shift-configuration.interface";
import ShiftConfiguration from "../models/shift-configuration.model";
import shiftConfigurationHierarchies from "../models/shift-configuration-hierarchies.model";
import hierarchies from "../models/hierarchies.model"
import { sequelize } from '../config/instance';
import { Op, QueryTypes } from 'sequelize';
import shiftTypeConfiguration from "../models/shift-type-configuration.model";
import { decodeToken } from "../middlewares/verifyToken";
import { sameShiftConfiguration } from "../utility/queries";

export const getAllshiftConfiguration = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };
  const { name, is_enabled, start_date, end_date, hierarchy_names, hierarchy_ids, shift_type_name, page = '1', limit = '10' } = request.query as { name?: string; is_enabled?: boolean | string; start_date?: string; end_date?: string; hierarchy_names?: string; hierarchy_ids?: string; shift_type_name?: string; page?: string; limit?: string };

  if (!program_id) {
    reply.status(400).send({
      status_code: 400,
      message: 'Program ID is required',
      trace_id: traceId,
    });
    return;
  }

  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    reply.status(400).send({
      status_code: 400,
      message: 'Invalid page number',
      trace_id: traceId,
    });
    return;
  }

  if (isNaN(pageSize) || pageSize < 1) {
    reply.status(400).send({
      status_code: 400,
      message: 'Invalid limit',
      trace_id: traceId,
    });
    return;
  }

  const offset = (pageNumber - 1) * pageSize;

  try {
    const searchFilters: any = { program_id };

    if (name) {
      searchFilters.name = { [Op.like]: `%${name}%` };
    }

    if (is_enabled !== undefined) {
      searchFilters.is_enabled = is_enabled === 'true' || is_enabled === true;
    }

    if (start_date && end_date) {
      searchFilters.updated_on = {
        [Op.between]: [start_date, end_date],
      };
    } else if (start_date) {
      searchFilters.updated_on = {
        [Op.gte]: start_date,
      };
    } else if (end_date) {
      searchFilters.updated_on = {
        [Op.lte]: end_date,
      };
    }

    let shiftConfigIds: string[] = [];
    if (hierarchy_ids) {
      const hierarchyIdsArray = hierarchy_ids.split(',').map(id => id.trim());
      const shiftConfigurationHierarchyRecords = await shiftConfigurationHierarchies.findAll({
        where: { hierarchy_id: { [Op.in]: hierarchyIdsArray } },
        attributes: ['shift_config_id'],
      });
      shiftConfigIds = shiftConfigurationHierarchyRecords.map(record => record.shift_config_id);
      searchFilters.id = { [Op.in]: shiftConfigIds };
    }
    else if (hierarchy_names) {
      const hierarchyRecords = await hierarchies.findAll({
        where: { name: { [Op.like]: `%${hierarchy_names}%` } },
        attributes: ['id'],
      });
      const hierarchyIdsFromNames = hierarchyRecords.map(record => record.id);
      const shiftConfigurationHierarchyRecords = await shiftConfigurationHierarchies.findAll({
        where: { hierarchy_id: hierarchyIdsFromNames },
        attributes: ['shift_config_id'],
      });
      shiftConfigIds = shiftConfigurationHierarchyRecords.map(record => record.shift_config_id);
      searchFilters.id = { [Op.in]: shiftConfigIds };
    }

    if (shift_type_name) {
      const shiftTypeRecords = await ShiftType.findAll({
        where: { shift_type_name: { [Op.like]: `%${shift_type_name}%` } },
        attributes: ['id'],
      });
      const shiftTypeIds = shiftTypeRecords.map(record => record.id);
      const shiftTypeConfigRecords = await shiftTypeConfiguration.findAll({
        where: { shift_type_id: shiftTypeIds },
        attributes: ['shift_config_id'],
      });
      const configIdsByShiftType = shiftTypeConfigRecords.map(record => record.shift_config_id);
      if (shiftConfigIds.length > 0) {
        searchFilters.id = { [Op.in]: shiftConfigIds.filter(id => configIdsByShiftType.includes(id)) };
      } else {
        searchFilters.id = { [Op.in]: configIdsByShiftType };
      }
    }

    const { count, rows: shiftConfigData } = await ShiftConfiguration.findAndCountAll({
      where: searchFilters,
      limit: pageSize,
      offset,
      order: [["updated_on", "DESC"]]
    });

    if (shiftConfigData.length > 0) {
      const shiftConfigIds = shiftConfigData.map(config => config.id);
      const hierarchyRecords = await shiftConfigurationHierarchies.findAll({
        where: { shift_config_id: shiftConfigIds },
        attributes: ['shift_config_id', 'hierarchy_id'],
      });
      const hierarchyIds = hierarchyRecords.map(record => record.hierarchy_id);
      const hierarchiesList = await hierarchies.findAll({
        where: { id: hierarchyIds },
        attributes: ['id', 'name'],
      });

      const shiftTypeRecords = await shiftTypeConfiguration.findAll({
        where: { shift_config_id: shiftConfigIds },
        attributes: ['shift_config_id', 'shift_type_id'],
      });

      const shiftTypeIds = shiftTypeRecords.map(record => record.shift_type_id);

      const shiftTypesList = await ShiftType.findAll({
        where: { id: shiftTypeIds },
        attributes: ['id', 'shift_type_name', 'created_on'],
      });

      const shiftConfigsWithDetails = await Promise.all(
        shiftConfigIds.map(async (shiftConfigId) => {
          const shiftTypesForConfig = shiftTypeRecords
            .filter(record => record.shift_config_id === shiftConfigId)
            .map(record => shiftTypesList.find(shiftType => shiftType.id === record.shift_type_id));

          const hierarchyConfig = hierarchyRecords
            .filter(record => record.shift_config_id === shiftConfigId)
            .map(record => hierarchiesList.find(hierarchy => hierarchy.id === record.hierarchy_id));

          return {
            ...shiftConfigData.find(config => config.id === shiftConfigId)?.toJSON(),
            hierarchies: hierarchyConfig,
            shift_types: shiftTypesForConfig,
          };
        })
      );

      reply.status(200).send({
        status_code: 200,
        page: pageNumber,
        limit: pageSize,
        total_records: count,
        shiftConfigurations: shiftConfigsWithDetails,
        message: 'Shift configurations retrieved successfully',
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        shiftConfigurations: [],
        message: 'Shift configurations not found',
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal server error',
      trace_id: traceId,
    });
  }
};




export async function getShiftConfigurationById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { id, program_id } = request.params as { id: string; program_id: string };
    const item = await ShiftConfiguration.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      },
    });

    if (!item) {
      return reply.status(200).send({
        status_code: 200,
        shiftConfiguration: {},
        message: 'Shift Configuration not found.',
        trace_id: traceId,
      });
    }

    const shiftConfigId = item.id;

    const hierarchyRecords = await shiftConfigurationHierarchies.findAll({
      where: { shift_config_id: shiftConfigId },
      attributes: ['hierarchy_id'],
    });
    const hierarchyIds = hierarchyRecords.map((record) => record.hierarchy_id);

    const hierarchiesList = await hierarchies.findAll({
      where: { id: hierarchyIds },
      attributes: ['id', 'name'],
    });

    const shiftTypeRecords = await shiftTypeConfiguration.findAll({
      where: { shift_config_id: shiftConfigId },
      attributes: ['shift_type_id','shift_type_time','time_duration'],
    });


     const shiftTypeIds = shiftTypeRecords.map((record) => record.shift_type_id);

    let shiftTypesList: any[] = [];

    if (shiftTypeIds.length > 0) {
      const shiftTypeMeta = await ShiftType.findAll({
        where: { id: shiftTypeIds },
        attributes: ['id', 'shift_type_name', 'created_on'],
      });

      shiftTypesList = shiftTypeMeta.map((meta) => {
        const matchingConfig = shiftTypeRecords.find(
          (cfg) => cfg.shift_type_id === meta.id
        );

        return {
          id: meta.id,
          shift_type_name: meta.shift_type_name,
          created_on: meta.created_on,
          time_duration: matchingConfig?.time_duration || null,
          shift_type_time: matchingConfig?.shift_type_time || [],
        };
      });
    }

    return reply.status(200).send({
      status_code: 200,
      message: " Shift Configuration found.",
      trace_id: traceId,
      shiftConfiguration: {
        ...item.toJSON(),
        hierarchies: hierarchiesList,
        shift_types: shiftTypesList,
      },
    });
  } catch (error) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: 'Internal server error',
    });
  }
}

export async function createShiftConfiguration(request: FastifyRequest, reply: FastifyReply) {
  const transaction = await sequelize.transaction();
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub;
  try {
    const shiftTypeData = request.body as ShiftConfigurationAttributes;
    const { hierarchy_ids, shift_type, name, ...rest } = shiftTypeData;
    const existingShiftConfig = await ShiftConfiguration.findOne({
      where: { name, program_id: shiftTypeData.program_id },
    });

    if (existingShiftConfig) {
      await transaction.rollback();
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: `Shift configuration with the name ${name} already exists`,
      });
    }

    if (Array.isArray(hierarchy_ids) && hierarchy_ids.length > 0) {
      const existingConfigurations = await sequelize.query(sameShiftConfiguration, {
        replacements: {
          program_id: shiftTypeData.program_id,
          hierarchies: shiftTypeData.hierarchy_ids || []
        },
        type: QueryTypes.SELECT,
        transaction
      });

      if (existingConfigurations.length > 0) {
        await transaction.rollback();  
        return reply.status(409).send({
          status_code: 409,
          message: 'Shift configurations with the same hierarchy already exist.',
          trace_id: traceId,
        });
      }
    }

    const shiftType = await ShiftConfiguration.create({
      name, ...rest, created_by: userId,
      updated_by: userId,
    }, { transaction });

    if (Array.isArray(hierarchy_ids)) {
      const hierarchyPromises = hierarchy_ids.map((hierarchy_id: any) => {
        return shiftConfigurationHierarchies.create({
          shift_config_id: shiftType.id,
          hierarchy_id,
        }, { transaction });
      });
      await Promise.all(hierarchyPromises);
    }

    if (Array.isArray(shift_type)) {
      for (const item of shift_type) {
        const shiftTime = Array.isArray(item.shift_type_time)
          ? item.shift_type_time.map((t: { shift_start_time: any; shift_end_time: any; }) => ({
            shift_start_time: t.shift_start_time,
            shift_end_time: t.shift_end_time,
          }))
          : [];

        await shiftTypeConfiguration.create({
          shift_config_id: shiftType.id,
          program_id: shiftType.program_id,
          shift_type_id: item.shift_type_id,
          shift_type_time: shiftTime,
          time_duration: item.time_duration ?? null
        }, { transaction });
      }
    }

    await transaction.commit();
    reply.status(201).send({
      status_code: 201,
      id: shiftType.id,
      message: 'Shift configuration created successfully',
      trace_id: traceId,
    });

  } catch (error) {
    await transaction.rollback();
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: (error instanceof Error) ? error.message : 'An unknown error occurred'
    });
  }
}

export async function updateShiftConfiguration(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as { id: string; program_id: string };
  const shiftTypeData = request.body as ShiftConfigurationAttributes;
  const { hierarchy_ids, shift_type, ...rest } = shiftTypeData;
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub;
  try {
    const shiftType = await ShiftConfiguration.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      },
    });

    if (!shiftType) {
      return reply.status(404).send({
        status_code: 404,
        message: 'Shift configuration not found.',
        trace_id: traceId,
      });
    }

    const existingShiftTypeConfigWithSameName = await ShiftConfiguration.findOne({
      where: {
        name: sequelize.where(sequelize.fn('lower', sequelize.col('name')), sequelize.fn('lower', shiftTypeData.name)),
        id: { [Op.ne]: id },
        program_id,
        is_deleted: false,
      },
    });

    if (existingShiftTypeConfigWithSameName) {
      return reply.status(400).send({
        status_code: 400,
        message: `Shift configuration with the name ${shiftTypeData.name} already exists.`,
        trace_id: traceId,
      });
    }

    await shiftType.update(
      { ...rest, updated_on: Date.now() },
      { where: { updated_by: userId } }
    );

    if (Array.isArray(hierarchy_ids)) {
      const existingHierarchies = await shiftConfigurationHierarchies.findAll({
        where: { shift_config_id: id },
        attributes: ['hierarchy_id'],
      });

      const existingHierarchyIds = existingHierarchies.map((h) => h.hierarchy_id);
      const hierarchiesToAdd = hierarchy_ids.filter((id) => !existingHierarchyIds.includes(id));
      const hierarchiesToRemove = existingHierarchyIds.filter((id) => !hierarchy_ids.includes(id));

      if (hierarchiesToRemove.length > 0) {
        await shiftConfigurationHierarchies.destroy({
          where: {
            shift_config_id: id,
            hierarchy_id: hierarchiesToRemove,
          },
        });
      }

      if (hierarchiesToAdd.length > 0) {
        const newHierarchies = hierarchiesToAdd.map((hierarchy_id) => ({
          shift_config_id: id,
          hierarchy_id,
        }));
        await shiftConfigurationHierarchies.bulkCreate(newHierarchies);
      }
    }

    if (Array.isArray(shift_type)) {
      const existingShiftTypes = await shiftTypeConfiguration.findAll({
        where: { shift_config_id: id },
        attributes: ['shift_type_id'],
      });

      const existingShiftTypeIds = existingShiftTypes.map((st) => st.shift_type_id);
      const incomingShiftTypeIds = shift_type.map((st) => st.shift_type_id);

      const shiftTypesToAdd = incomingShiftTypeIds.filter((sid) => !existingShiftTypeIds.includes(sid));
      const shiftTypesToRemove = existingShiftTypeIds.filter((sid) => !incomingShiftTypeIds.includes(sid));
      const shiftTypesToUpdate = incomingShiftTypeIds.filter((sid) => existingShiftTypeIds.includes(sid));

      if (shiftTypesToRemove.length > 0) {
        await shiftTypeConfiguration.destroy({
          where: {
            shift_config_id: id,
            shift_type_id: shiftTypesToRemove,
          },
        });
      }

      if (shiftTypesToAdd.length > 0) {
        const newShiftTypes = shift_type
          .filter(st => shiftTypesToAdd.includes(st.shift_type_id))
          .map((st) => ({
            shift_config_id: id,
            program_id: shiftType.program_id,
            shift_type_id: st.shift_type_id,
            shift_type_time: st.shift_type_time,
            time_duration: st.time_duration,
          }));
        await shiftTypeConfiguration.bulkCreate(newShiftTypes);
      }
      if (shiftTypesToUpdate.length > 0) {
        const updatePromises = shift_type
          .filter(st => shiftTypesToUpdate.includes(st.shift_type_id))
          .map(st =>
            shiftTypeConfiguration.update(
              {
                shift_type_time: st.shift_type_time,
                time_duration: st.time_duration,
              },
              {
                where: {
                  shift_config_id: id,
                  shift_type_id: st.shift_type_id,
                },
              }
            )
          );

        await Promise.all(updatePromises);
      }

    }


    reply.status(200).send({
      status_code: 200,
      message: 'Shift configuration updated successfully.',
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal server error',
      trace_id: traceId,
    });
  }
}



export async function deleteShiftConfiguration(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as { id: string, program_id: string };
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub;
  try {
    const shiftConfiguration = await ShiftConfiguration.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      },
    });
    if (shiftConfiguration) {
      await shiftConfiguration.update({ is_deleted: true, is_enabled: false, updated_by: userId });
      reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: 'Shift configuration deleted successfully.',
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'Shift configuration not found.',
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal server error"
    });
  }
}

export const getFilteredShiftConfiguration = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };
  const { name, is_enabled, updated_on, hierarchy_names, shift_type_name, page = 1, limit = 10 } = request.body as { name?: string; is_enabled?: boolean | string; updated_on?: string[]; hierarchy_names?: string; shift_type_name?: string; page?: number; limit?: number };

  if (!program_id) {
    return reply.status(400).send({
      status_code: 400,
      message: 'Program ID is required',
      trace_id: traceId,
    });
  }

  const pageNumber = Number(page);
  const pageSize = Number(limit);

  if (isNaN(pageNumber) || pageNumber < 1) {
    return reply.status(400).send({
      status_code: 400,
      message: 'Invalid page number',
      trace_id: traceId,
    });
  }

  if (isNaN(pageSize) || pageSize < 1) {
    return reply.status(400).send({
      status_code: 400,
      message: 'Invalid limit',
      trace_id: traceId,
    });
  }

  const offset = (pageNumber - 1) * pageSize;

  try {
    const searchFilters: any = { program_id };

    if (name) {
      searchFilters.name = { [Op.like]: `%${name}%` };
    }

    if (is_enabled !== undefined) {
      searchFilters.is_enabled = is_enabled === 'true' || is_enabled === true;
    }

    if (Array.isArray(updated_on) && updated_on.length === 2) {
      const [startTimestamp, endTimestamp] = updated_on.map(ts => parseInt(ts, 10));
      searchFilters.updated_on = { [Op.between]: [startTimestamp, endTimestamp] };
    }

    let shiftConfigIds: string[] = [];
    if (hierarchy_names) {
      const hierarchyRecords = await hierarchies.findAll({
        where: { name: { [Op.like]: `%${hierarchy_names}%` } },
        attributes: ['id'],
      });
      const hierarchyIds = hierarchyRecords.map(record => record.id);
      const shiftConfigurationHierarchyRecords = await shiftConfigurationHierarchies.findAll({
        where: { hierarchy_id: hierarchyIds },
        attributes: ['shift_config_id'],
      });
      shiftConfigIds = shiftConfigurationHierarchyRecords.map(record => record.shift_config_id);
      searchFilters.id = { [Op.in]: shiftConfigIds };
    }

    if (shift_type_name) {
      const shiftTypeRecords = await ShiftType.findAll({
        where: { shift_type_name: { [Op.like]: `%${shift_type_name}%` } },
        attributes: ['id'],
      });
      const shiftTypeIds = shiftTypeRecords.map(record => record.id);
      const shiftTypeConfigRecords = await shiftTypeConfiguration.findAll({
        where: { shift_type_id: shiftTypeIds },
        attributes: ['shift_config_id'],
      });
      const configIdsByShiftType = shiftTypeConfigRecords.map(record => record.shift_config_id);
      if (shiftConfigIds.length > 0) {
        searchFilters.id = { [Op.in]: shiftConfigIds.filter(id => configIdsByShiftType.includes(id)) };
      } else {
        searchFilters.id = { [Op.in]: configIdsByShiftType };
      }
    }

    const { count, rows: shiftConfigData } = await ShiftConfiguration.findAndCountAll({
      where: searchFilters,
      limit: pageSize,
      offset,
      order: [["updated_on", "DESC"]],
    });

    if (shiftConfigData.length > 0) {
      const shiftConfigIds = shiftConfigData.map(config => config.id);
      const hierarchyRecords = await shiftConfigurationHierarchies.findAll({
        where: { shift_config_id: shiftConfigIds },
        attributes: ['shift_config_id', 'hierarchy_id'],
      });
      const hierarchyIds = hierarchyRecords.map(record => record.hierarchy_id);
      const hierarchiesList = await hierarchies.findAll({
        where: { id: hierarchyIds },
        attributes: ['id', 'name'],
      });

      const shiftTypeRecords = await shiftTypeConfiguration.findAll({
        where: { shift_config_id: shiftConfigIds },
        attributes: ['shift_config_id', 'shift_type_id'],
      });

      const shiftTypeIds = shiftTypeRecords.map(record => record.shift_type_id);

      const shiftTypesList = await ShiftType.findAll({
        where: { id: shiftTypeIds },
        attributes: ['id', 'shift_type_name', 'created_on'],
      });

      const shiftConfigsWithDetails = await Promise.all(
        shiftConfigIds.map(async (shiftConfigId) => {
          const shiftTypesForConfig = shiftTypeRecords
            .filter(record => record.shift_config_id === shiftConfigId)
            .map(record => shiftTypesList.find(shiftType => shiftType.id === record.shift_type_id));

          const hierarchyConfig = hierarchyRecords
            .filter(record => record.shift_config_id === shiftConfigId)
            .map(record => hierarchiesList.find(hierarchy => hierarchy.id === record.hierarchy_id));

          return {
            ...shiftConfigData.find(config => config.id === shiftConfigId)?.toJSON(),
            hierarchies: hierarchyConfig,
            shift_types: shiftTypesForConfig,
          };
        })
      );

      return reply.status(200).send({
        status_code: 200,
        page: pageNumber,
        limit: pageSize,
        total_records: count,
        shiftConfigurations: shiftConfigsWithDetails,
        message: 'Shift configurations retrieved successfully',
        trace_id: traceId,
      });
    } else {
      return reply.status(200).send({
        status_code: 200,
        shiftConfigurations: [],
        message: 'Shift configurations not found',
        trace_id: traceId,
      });
    }
  } catch (error) {
    return reply.status(500).send({
      status_code: 500,
      message: 'Internal server error',
      trace_id: traceId,
    });
  }
};
