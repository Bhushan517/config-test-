import { FastifyRequest, FastifyReply } from 'fastify';
import OnboardingConfigurationModel from '../models/onboarding-configuration.model';
import { OnboardingConfigurationInterface } from '../interfaces/onboarding-configuration.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';
import { sequelize } from '../config/instance';
import { decodeToken } from '../middlewares/verifyToken';


export async function createOnboardingConfiguration(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const configuration = request.body as OnboardingConfigurationInterface;
  const { name } = request.body as { name: string};
  const { program_id } = request.params as { program_id: string };
  const traceId = generateCustomUUID();
  try {
  const user=request?.user
  const userId = user?.sub;
    const existingConfigurationWithSameName = await OnboardingConfigurationModel.findOne({
      where: {
        name,
        program_id
      },
    });

    if (existingConfigurationWithSameName) {
      return reply.status(400).send({
        status_code: 400,
        message: "Invalid Name Field, Name Must Be Unique.",
        trace_id:traceId,
      });
    }

    const item = await OnboardingConfigurationModel.create({ ...configuration,program_id,created_by:userId,updated_by:userId });
    reply.status(201).send({
      status_code: 201,
      onboarding_configuration: item.id,
      trace_id:traceId,
      message:"Onboarding configuration created successfully !"
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      trace_id:traceId,
      message: 'Internal Server Error',
      error:error.message
    });
  }
}

export const getOnboardingConfiguration = async (
  request: FastifyRequest<{ Querystring: OnboardingConfigurationInterface }>,
  reply: FastifyReply
) => {
  const { program_id } = request.params as { program_id: string };
  const traceId = generateCustomUUID();
  const query: any = request.query;
  const page = parseInt(query.page ?? "1");
  const limit = parseInt(query.limit ?? "10");

  try {
    const offset = (page - 1) * limit;
    const hierarchyIds = query.hierarchy_id ? query.hierarchy_id.split(',') : [];
    const jobTemplateIds = query.job_template_id ? query.job_template_id.split(',') : [];
    const jobTypeIds = query.job_type ? query.job_type.split(',') : [];
    const conditions = [];

    if (hierarchyIds.length > 0) {
      conditions.push({
        hierarchy_id: {
          [Op.or]: hierarchyIds.map((id: string) =>
            sequelize.where(
              sequelize.fn('JSON_CONTAINS', sequelize.col('hierarchy_id'), JSON.stringify(id)),
              true
            )
          ),
        },
      });
    }
    
    if (jobTemplateIds.length > 0) {
      conditions.push({
        job_template_id: {
          [Op.or]: jobTemplateIds.map((id: string) =>
            sequelize.where(
              sequelize.fn('JSON_CONTAINS', sequelize.col('job_template_id'), JSON.stringify(id)),
              true
            )
          ),
        },
      });
    }
    
    if (jobTypeIds.length > 0) {
      conditions.push({
        job_type: {
          [Op.or]: jobTypeIds.map((id: string) =>
            sequelize.where(
              sequelize.fn('JSON_CONTAINS', sequelize.col('job_type'), JSON.stringify(id)),
              true
            )
          ),
        },
      });
    }
    const whereCondition: any = {
      is_deleted: false,
      program_id,
      [Op.and]: conditions,
    };
    if (query.name) {
      whereCondition.name = { [Op.like]: `%${query.name}%` };
    }
    if (query.is_enabled !== undefined) {
      whereCondition.is_enabled = query.is_enabled === 'true' || query.is_enabled === true;
    }
    if (query.is_all_job_type !== undefined) {
      whereCondition.is_all_job_type = query.is_all_job_type === 'true' || query.is_all_job_type === true;
    }
    if (query.is_all_job_template !== undefined) {
      whereCondition.is_all_job_template = query.is_all_job_template === 'true' || query.is_all_job_template === true;
    }
    if (query.is_all_hierarchy !== undefined) {
      whereCondition.is_all_hierarchy = query.is_all_hierarchy === 'true' || query.is_all_hierarchy === true;
    }
    if (query.is_all_checklist !== undefined) {
      whereCondition.is_all_checklist = query.is_all_checklist === 'true' || query.is_all_checklist === true;
    }
    if (query.updated_on) {
      const dateRange = query.updated_on.split(',');
      if (dateRange.length === 2) {
        const startDate = parseFloat(dateRange[0].trim());
        const endDate = parseFloat(dateRange[1].trim());
        whereCondition.updated_on = { [Op.between]: [startDate, endDate] };
      }
    }
    const { rows: onboarding_configuration, count } =
      await OnboardingConfigurationModel.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [['updated_on', 'DESC']],
      });
    
    if (onboarding_configuration.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: 'No onboarding configuration found',
        onboarding_configuration: [],
      });
    }

    reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: 'Onboarding configuration retrieved successfully',
      items_per_page: limit,
      current_page: page,
      total_records: count,
      onboarding_configuration,
    });
    
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: error.message,
    });
  }
};


export async function getOnboardingConfigurationById(
  request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id, program_id } = request.params;
    const item = await OnboardingConfigurationModel.findOne({
      where: { id, program_id, is_deleted: false }
    });
    if (item) {
      reply.status(200).send({
        status_code: 200,
        message:"Get Onbording Configuration successfully",
        onboarding_configuration: item,
        trace_id:traceId,
      });
    } else {
      reply.status(200).send({
        status_code:200,
        message: 'labour category not found',
        onboarding_configuration: [],
        trace_id:traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while fetching',
      trace_id:traceId,
    });
  }
}

export async function updateOnboardingConfiguration(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params as { id: string };
    const labour_categories = request.body as OnboardingConfigurationInterface;
    const { name, program_id } = request.body as { name: string, program_id: string };

    const user=request?.user
    const userId = user?.sub;

    const existingIndustryWithSameName = await OnboardingConfigurationModel.findOne({
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
        trace_id:traceId,
      });
    }

    const [numRowsUpdated] = await OnboardingConfigurationModel.update(
      { ...labour_categories, updated_on: Date.now(),updated_by:userId },
      { where: { id, program_id } }
    );

    if (numRowsUpdated > 0) {
      reply.status(200).send({
        status_code: 200,
        labour_category_id: id,
        trace_id:traceId,
      });
    } else {
      reply.status(400).send({ message: 'labour categories not found' , trace_id:traceId});
    }
  } catch (error) {
    reply.status(500).send({
      status_ode: 500,
      message: 'An error occurred while updating',
      trace_id:traceId,
    });
  }
}

export async function deleteOnboardingConfiguration(
  request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id, program_id } = request.params;
    const user=request?.user
    const userId = user?.sub;
    const [numRowsDeleted] = await OnboardingConfigurationModel.update({
      is_deleted: true,
      is_enabled: false,
      updated_on: Date.now(),
      updated_by:userId
    },
      { where: { id, program_id } }
    );

    if (numRowsDeleted > 0) {
      reply.status(200).send({
        status_code: 200,
        labour_category_id: id,
        trace_id:traceId,
        message:"Onboarding configuration deleted successfully !"
      });
    } else {
      reply.status(400).send({ status_code:400,message: 'Onboarding configuration not found', trace_id:traceId });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while deleting',
      trace_id:traceId,
    });
  }
}


