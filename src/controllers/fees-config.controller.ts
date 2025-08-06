
import feesConfiguration from '../models/fees-config.model';
import { FeesConfigurationInterface } from '../interfaces/fees-config.interface';
import { FastifyReply, FastifyRequest } from 'fastify';
import { baseSearch, BaseService } from '../utility/baseService';
import generateCustomUUID from '../utility/genrateTraceId';
import Hierarchy from '../models/hierarchies.model';
import { decodeToken } from '../middlewares/verifyToken';
import { Op, Sequelize } from 'sequelize';
import IndustriesModel from '../models/labour-category.model';
import { ProgramVendor } from '../models/program-vendor.model';
import FeesConfigRepository from '../repositories/fees-config.repository';
import GlobalRepository from '../repositories/global.repository';


const baseService = new BaseService(feesConfiguration);

export async function createFeesConfiguration(request: FastifyRequest, reply: FastifyReply) {
  const feesConfig = request.body as FeesConfigurationInterface;
  const traceId = generateCustomUUID()
  const { program_id } = request.params as { program_id: string };

  const user = request.user;

  if (!user) {
    return reply.status(400).send({ status_code: 400, message: 'user is requried.' });
  }
  const userId = user?.user_id;

  try {

    const existingConfigurations = await FeesConfigRepository.getFeesConfig(program_id, feesConfig.hierarchy_levels, feesConfig.labor_category, feesConfig.vendors);

    if (existingConfigurations.length > 0) {
      return reply.status(409).send({
        status_code: 409,
        message: 'Fees configurations already exist.',
        trace_id: traceId,
      });
    }

    const fees: any = await feesConfiguration.create({ ...feesConfig, program_id, created_by: userId });

    reply.status(201).send({
      status_code: 201,
      message: "fess configration created succesfully",
      fees_config: fees,
      trace_id: traceId
    });

  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while creating fees configuration',
      error
    });
  }
}

export async function getFeesConfigurationById(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const fees = await feesConfiguration.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      },
    });

    if (fees) {
      const hierarchyLevels = fees.hierarchy_levels || [];
      const laborCategoryIds = fees.labor_category || [];
      const vendorIds = fees.vendors || [];

      const getHierarchies = async (hierarchyIds: string[]) => {
        const hierarchies = await Hierarchy.findAll({
          where: {
            id: hierarchyIds,
          },
        });

        return hierarchies.map((hierarchy: any) => ({
          id: hierarchy.id,
          name: hierarchy.name,
          parent_hierarchy_id: hierarchy.parent_hierarchy_id,
        }));
      };

      const hierarchyData = await getHierarchies(hierarchyLevels);
      const laborCategories = await IndustriesModel.findAll({
        where: {
          id: laborCategoryIds,
        },
        attributes: ['id', 'name'],
      });
      const vendors = await ProgramVendor.findAll({
        where: {
          id: vendorIds
        },
        attributes: ['id', 'vendor_name', 'display_name'],
      });

      reply.status(200).send({
        status_code: 200,
        message: "Fees configuration retrieved successfully",
        fees: {
          ...fees.dataValues,
          hierarchy_levels: hierarchyData,
          labor_category: laborCategories.map((category: any) => ({
            id: category.id,
            name: category.name,
          })),
          vendors: vendors.map((vendor: any) => ({
            id: vendor.id,
            name: vendor.display_name,
          })),
        },
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Fees configuration data not found",
        fees_config: [],
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching fees configuration",
      error,
    });
  }
}


export async function updateFeesConfigurationById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const { id, program_id } = request.params as { id: string, program_id: string };
  const updates = request.body as Partial<FeesConfigurationInterface>;

  const user = request?.user
  const userId = user?.sub;
  try {
    const feesConfigData = await feesConfiguration.findByPk(id);

    if (!feesConfigData) {
      return reply.status(200).send({ message: 'Fees configuration data not found' });
    }

    const [feesConfig] = await feesConfiguration.update({
      ...updates,
      updated_on: Date.now(),
      updated_by: userId,
    }, {
      where: {
        id, program_id
      },
    });

    return reply.status(201).send({
      status_code: 201,
      message: 'Fees configuration updated successfully',
      id: feesConfigData.id,
      fees_config: feesConfig,
      trace_id: traceId,
    });
  } catch (error) {
    console.error('Error updating fees configuration', error);
    return reply.status(500).send({ status_code: 500, message: 'Internal Server Error', error });
  }
}


export async function deleteFeesConfigurationById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const user = request?.user
  const userId = user?.sub
  try {
    const { id } = request.params as { id: string };
    const [feesConfig] = await feesConfiguration.update(
      {
        is_deleted: true,
        is_enabled: false,
        updated_on: Date.now(),
        created_by: userId,
        updated_by: userId,
      },
      { where: { id } }
    );
    if (feesConfig > 0) {
      reply.status(200).send({
        status_code: 200,
        message: "Fees configuration deleted successfully",
        feesConfig: feesConfig,
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({ status_code: 200, message: 'Fees configuration not found' });
    }
  } catch (error) {
    console.error('Error deleting fees configuration:', error);
    reply.status(500).send({ status_code: 500, message: 'An error occurred while deleting fees configuration', error });
  }
}

export async function getAllFeesConfigByProgramId(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const searchFields = ['program_id', 'is_enabled', 'title', 'source_model', 'labor_category', 'hierarchy_levels', 'vendors', 'updated_on'];
  const responseFields = ['id', 'title', 'labor_category', 'hierarchy_levels', 'vendors', 'source_model', 'is_enabled',
    'is_deleted', 'program_id', 'created_on', 'updated_on', 'ref_id',];
  return baseSearch(request, reply, feesConfiguration, searchFields, responseFields);
}

export async function advancedSearchFeesConfiguration(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const requestBody = request.body as any;
    const filters = requestBody.filters || requestBody; 
    const paginationOverride = requestBody.pagination || { 
      page: requestBody.page || 1, 
      limit: requestBody.limit || 10 
    };

    const user = request?.user;
    const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);

    // if (updated_on && Array.isArray(updated_on) && updated_on.length > 0) {
    //   const startDate = new Date(updated_on[0]);
    //   const updatedOnStart = startDate.setHours(0, 0, 0, 0);

    //   let updatedOnEnd;
    //   if (updated_on.length === 1 || updated_on[1] === 0) {
    //     updatedOnEnd = new Date(updated_on[0]).setHours(23, 59, 59, 999);
    //   } else {
    //     updatedOnEnd = new Date(updated_on[1]).setHours(23, 59, 59, 999);
    //   }

    //   filters.updated_on = [updatedOnStart, updatedOnEnd];
    // }

    const result = await FeesConfigRepository.feesAdvancedFilter(
      request,
      program_id,
      paginationOverride,
      mspHierarchyIds,
      filters
    );

    if (result?.count > 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "Data search successfully",
        total_records: result.count,
        items: result.rows,
      });
    } else {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "No records found",
        total_records: 0,
        items: [],
      });
    }
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

export async function getFeesConfig(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_levels, vendors, labor_category, source_model, is_enabled } = request.query as { hierarchy_levels: string, vendors: string, labor_category: string, source_model: string, is_enabled: string };
    const hierarchyLevelsArray = Array.isArray(hierarchy_levels) ? hierarchy_levels : (hierarchy_levels ?? '').split(',');
    
    const whereConditions: any = {
      program_id,
      is_enabled: is_enabled ? is_enabled === "true" : undefined,
      [Op.and]: [
        {
          [Op.or]: [
            { is_all_hierarchy_associated: 1 },
            Sequelize.where(
              Sequelize.fn('JSON_CONTAINS', Sequelize.col('hierarchy_levels'), JSON.stringify(hierarchyLevelsArray)),
              true
            )
          ]
        },
        {
      [Op.or]: [
        { is_all_labor_category: true },
        Sequelize.where(
          Sequelize.fn('JSON_CONTAINS', Sequelize.col('labor_category'), JSON.stringify(labor_category)),
          true
        )
      ]
    },
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.fn('JSON_UNQUOTE', Sequelize.col('source_model'))),
          { [Op.like]: `%${source_model.toLowerCase()}%` }
        )
      ]
    };

    if (vendors) {
      whereConditions[Op.or] = [
        Sequelize.where(
          Sequelize.fn('JSON_CONTAINS', Sequelize.col('vendors'), JSON.stringify(vendors)),
          true
        ),
        Sequelize.where(
          Sequelize.fn('JSON_LENGTH', Sequelize.col('vendors')),
          0
        )
      ];
    }

    if (whereConditions.is_enabled === undefined) {
      delete whereConditions.is_enabled;
    }

    const data = await feesConfiguration.findOne({
      where: whereConditions,
      order: [['created_on', 'DESC']]
    });

    if (!data) {
      reply.status(404).send({
        status_code: 404,
        message: "No matching record found",
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Fees config retrieved successfully",
        fees: [data],
        trace_id: traceId
      });
    }
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: error.message
    });
  }
}
