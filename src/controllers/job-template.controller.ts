import { FastifyRequest, FastifyReply } from "fastify";
import jobTemplateModel from "../models/job-template.model";
import {
  JobTemplateInterface,
  JobMasterDataInterface,
  JobTempRateTypeInterface,
  JobTemplateQualificationInterface,
  JobTemplateDistSchedule,
  GetJobTemplatesQuery,
  JobTemplate
} from "../interfaces/job-template.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import jobTemplateQualificationModel from "../models/job-template-qualification.model";
import jobTemplateHierarchyModel from "../models/job-template-hierarchie.model";
import { Op, QueryTypes, Transaction } from "sequelize";
import jobTemplateCustomFieldModel from "../models/job-template-custom-field.model";
import JobTempletRepository from "../hooks/job-template-query"
import { sequelize } from "../config/instance";
import { decodeToken } from "../middlewares/verifyToken";
import { getHierarchieListView, getHierarchieWithChildren } from "../utility/queries";
import JobMasterDataModel from "../models/job-master-data.model";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import htmlEscape from "html-escape";



const jobTempletRepositories = new JobTempletRepository();
import { pipeline } from 'stream/promises';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { convertFileToHTML } from '../utility/fileConverter';
import { Readable } from 'node:stream';
import Hierarchies from "../models/hierarchies.model";
import JobCategoryModel from "../models/job-category.model";
import vendorLabourCategoriesModel from "../models/vendor-labour-categories.model";
import IndustriesModel from "../models/labour-category.model";
import Checklist from "../models/checklist.model";
import GlobalRepository from "../repositories/global.repository";
import { getCustomsField } from "../utility/get-custom-field";
import { getMasterData } from "../utility/get-master-data";

interface Metadata {
  program_id: string;
  job_template_id: string;
  signed_url: string;
}

const supportedMimeTypes = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const getAllJobTemplates = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { program_id } = request.params as { program_id: string };
  const traceId = generateCustomUUID();

  try {
    const {
      id,
      job_id,
      is_enabled,
      template_name,
      labour_category,
      is_shift_rate,
      primary_hierarchy,
      category,
      page = 1,
      limit = 10,
    } = request.query as GetJobTemplatesQuery;

    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
    const offset = (pageNumber - 1) * limitNumber;
    const user = request?.user
    const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);

    const dynamicConditions: string[] = [];
    const replacements: any = { program_id, limit: limitNumber, offset };
    if (mspHierarchyIds && mspHierarchyIds.length > 0) {
      dynamicConditions.push(`
        (job_templates.is_all_hierarchy_associated = 1 OR job_templates.id IN (
          SELECT job_temp_id
          FROM job_template_hierarchies
          WHERE hierarchy IN (:mspHierarchyIds)
          AND is_deleted = false
        ))
      `);
      replacements.mspHierarchyIds = mspHierarchyIds;
    }
    if (id) {
      dynamicConditions.push(`job_templates.id = :id`);
      replacements.id = id;
    }
    if (job_id) {
      dynamicConditions.push(`job_templates.job_id = :job_id`);
      replacements.job_id = job_id;
    }
    if (is_enabled !== undefined) {
      dynamicConditions.push(`job_templates.is_enabled = :is_enabled`);
      replacements.is_enabled = is_enabled.toString() !== "false";
    }
    if (template_name) {
      dynamicConditions.push(`job_templates.template_name LIKE :template_name`);
      replacements.template_name = `%${template_name}%`;
    }
    if (category) {
      dynamicConditions.push(`job_category.title LIKE :category`);
      replacements.category = `%${category}%`;
    }
    if (labour_category) {
      dynamicConditions.push(`labour_category.id LIKE :labour_category`);
      replacements.labour_category = `%${labour_category}%`;
    }
    if (primary_hierarchy) {
      dynamicConditions.push(`job_templates.primary_hierarchy = :primary_hierarchy`);
      replacements.primary_hierarchy = primary_hierarchy;
    }
    if (is_shift_rate !== undefined) {
      dynamicConditions.push(`job_templates.is_shift_rate = :is_shift_rate`);
      replacements.is_shift_rate = is_shift_rate.toString() !== "false";
    }

    const dynamicConditionsString =
      dynamicConditions.length > 0
        ? `AND ${dynamicConditions.join(" AND ")}`
        : "";

    const jobTemplates = await jobTempletRepositories.getAllJobTemplets(
      program_id,
      dynamicConditionsString,
      replacements,
      limitNumber,
      offset
    ) as any[];

    const totalCount = jobTemplates.length > 0 ? jobTemplates[0].total_count : 0;
    const totalPages = Math.ceil(totalCount / limitNumber);

    reply.status(200).send({
      statusCode: 200,
      trace_id: traceId,
      job_templates: jobTemplates,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total_pages: totalPages,
        total_count: totalCount,
      },
    });
  } catch (error: any) {
    reply.status(500).send({
      message: "An error occurred while fetching job templates.",
      trace_id: traceId,
      error: error.message,
    });
  }
};

export async function getJobTemplateById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { program_id, id } = request.params as { program_id: string; id: string };

    const [jobTemplate] = await jobTempletRepositories.getJobTempletById(program_id, id);

    if (!jobTemplate) {
      reply.status(200).send({
        message: "Job Template data not found.",
        trace_id: traceId,
        job_templates: [],
        job_template: null,
      });
      return;
    }
    const transformBooleanFields = (obj: any) => {
      const booleanFields = [
        "is_submission_exceed_max_bill_rate",
        "allow_express_offer",
        "is_qualification_enabled",
        "is_description_editable",
        "is_onboarding_checklist",
        "is_automatic_distribution",
        "is_distribute_final_approval",
        "is_expense_allowed_editable",
        "is_expense_allowed",
        "is_resume_mandatory",
        "allow_user_description",
        "is_checklist_enable",
        "is_deleted",
        "is_enabled",
        "is_background_check",
        "is_tiered_distribute_submit",
        "is_manual_distribute_submit",
        "is_review_configured_or_submit",
        "is_shift_rate",
        "is_description_required",
        "is_description_upload_required",
        "is_country_mandatory",
        "is_address_mandatory",
        "default_expense_value",
        "allow_pre_identified_candidate",
        "resume_mandatory",
        "job_submitted_count",
        "ot_exempt"
      ];
      booleanFields.forEach((field) => {
        if (field in obj) {
          obj[field] = Boolean(obj[field]);
        }
      });
      return obj;
    };

    const transformedJobTemplate = transformBooleanFields(jobTemplate);
    const [customFieldsResult] = await sequelize.query(
      getCustomsField(transformedJobTemplate.id, 'job_template_custom_field', 'job_temp_id', 'custom_field_id'),
      {
        replacements: { id: transformedJobTemplate.id },
        type: QueryTypes.SELECT,
      }
    ) as any;
    const customFields = customFieldsResult?.custom_fields
      .map((field: any) => ({
        ...field,
        value: parseValue(field.value),
      }))

    const [masterDataResult] = await sequelize.query(
      getMasterData('job_template_master_data', 'job_temp_id', 'foundation_data_type_id', 'foundation_data_id', true),
      {
        replacements: { id: transformedJobTemplate.id },
        type: QueryTypes.SELECT,
      }
    ) as any;

    reply.status(200).send({
      statusCode: 200,
      message: "Job template fetched successfully",
      job_template: {
        ...transformedJobTemplate,
        job_template_custom_fields: customFields,
        job_master_data: masterDataResult.master_data
      },
      trace_id: traceId,
    });
  } catch (error: any) {
    reply.status(500).send({
      message: "An error occurred while fetching job template data.",
      error: error.message,
      trace_id: traceId,
    });
  }
}

function parseValue(value: string | null): any {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return parsed;
  } catch {
    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    return value;
  }
}


export async function createJobTemplate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const user = request?.user
  const userId = user?.sub;
  let transaction: Transaction | null = null;

  try {
    const jobTemplateData = request.body as JobTemplateInterface;
    const jobMasterData = request.body as JobMasterDataInterface;
    const jobRateType = request.body as JobTempRateTypeInterface;
    const jobDistSchedule = request.body as JobTemplateDistSchedule;
    const jobQualification = request.body as JobTemplateQualificationInterface;
    const jobTempCustomField = request.body as jobTemplateCustomFieldModel;

    const { program_id } = request.params as { program_id: string };
    transaction = await sequelize.transaction();
    const program = await jobTempletRepositories.programQuery(program_id)

    if (!program || program.length === 0) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: 'Program with this ID does not exist.',
      });
    }

    const existingTemplate = await jobTemplateModel.findOne({
      where: { template_name: jobTemplateData.template_name, program_id },
      transaction,
    });

    if (existingTemplate) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: 'Job template with this name already exists.',
      });
    }

    const jobTemplate = await jobTemplateModel.create(
      {
        ...jobTemplateData,
        program_id,
        created_by: userId,
        updated_by: userId,
      },
      { transaction }
    );

    if (Array.isArray(jobTemplateData.hierarchy)) {
      for (const hierarchyId of jobTemplateData.hierarchy) {
        await jobTemplateHierarchyModel.create(
          {
            job_temp_id: jobTemplate.id,
            hierarchy: hierarchyId,
            program_id: jobTemplate.program_id,
          },
          { transaction }
        );
      }
    }

    if (Array.isArray(jobTempCustomField.custom_fields)) {
      const customFieldPromises = jobTempCustomField.custom_fields.map(
        (field: { id: string; value: string }) =>
          jobTemplateCustomFieldModel.create(
            {
              custom_field_id: field.id,
              value: field.value,
              program_id,
              job_temp_id: jobTemplate.id,
            },
            { transaction }
          )
      );
      await Promise.all(customFieldPromises);
    }

    if (Array.isArray(jobQualification.qualification_types)) {
      const qualificationPromises = jobQualification.qualification_types.map(
        (qualification: {
          qualification_type_id: any;
          is_required: any;
          name: any;
          code: any;
          qualifications: any;
        }) =>
          jobTemplateQualificationModel.create(
            {
              qualification_type_id: qualification.qualification_type_id,
              is_required: qualification.is_required,
              name: qualification.name,
              code: qualification.code,
              qualifications: qualification.qualifications,
              program_id,
              job_temp_id: jobTemplate.id,
            },
            { transaction }
          )
      );
      await Promise.all(qualificationPromises);
    }

    if (Array.isArray(jobMasterData.foundational_data)) {
      const foundationalDataPromises = jobMasterData.foundational_data.flatMap(
        (dataItem: {
          foundation_data_type_id: string;
          is_read_only: boolean;
          foundation_data_id: any[];
        }) =>
          JobMasterDataModel.create(
            {
              job_temp_id: jobTemplate.id,
              program_id,
              foundation_data_type_id: dataItem.foundation_data_type_id,
              foundation_data_id: dataItem.foundation_data_id,
              is_read_only: dataItem.is_read_only,
            },
            { transaction }
          )

      );
      await Promise.all(foundationalDataPromises);
    }


    await transaction.commit();

    reply.status(201).send({
      status_code: 201,
      trace_id: traceId,
      message: 'Job template created successfully.',
      id: jobTemplate.id,
    });
  } catch (error: any) {
    if (transaction) {
      await transaction.rollback();
    }
    console.log('Error: ', error, 'trace_id:', traceId);
    reply.status(500).send({
      message: 'Internal Server error.',
      error: error.message,
      trace_id: traceId,
    });
  }
}

export async function updateJobTemplate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const user = request?.user
  const userId = user?.sub;
  try {
    const { program_id, id } = request.params as {
      program_id: string;
      id: string;
    };
    const jobTemplateData = request.body as JobTemplateInterface;
    const jobMasterData = request.body as JobMasterDataInterface;
    const jobRateType = request.body as JobTempRateTypeInterface;
    const jobDistSchedule = request.body as JobTemplateDistSchedule;
    const jobQualification = request.body as JobTemplateQualificationInterface;
    const jobTempCustomField = request.body as jobTemplateCustomFieldModel;

    const jobTemplate = await jobTemplateModel.findOne({
      where: { program_id, id },
    });

    if (!jobTemplate) {
      reply.status(200).send({
        status_code: 200,
        message: "Job Template not found.",
        job_tamplate: [],
        trace_id: traceId,
      });
      return;
    }
    const { template_name, category, level, ...rest } = jobTemplateData;
    const updateData = {
      ...rest,
      updated_on: BigInt(Date.now()),
      updated_by: userId,
      category,
      template_name,
      level

    }
    await jobTemplate.update(updateData);

    if (jobTemplateData.hierarchy && Array.isArray(jobTemplateData.hierarchy)) {
      const incomingHierarchyIds = jobTemplateData.hierarchy.filter(Boolean);
      const existingHierarchyRecords = await jobTemplateHierarchyModel.findAll({
        where: {
          job_temp_id: jobTemplate.id,
          program_id: jobTemplate.program_id,
        },
      });

      const existingHierarchyIds = existingHierarchyRecords.map((record) => record.hierarchy);
      for (const hierarchyId of incomingHierarchyIds) {
        const existingRecord = existingHierarchyRecords.find((record) => record.hierarchy === hierarchyId);

        if (!existingRecord) {
          await jobTemplateHierarchyModel.create({
            job_temp_id: jobTemplate.id,
            hierarchy: hierarchyId,
            program_id: jobTemplate.program_id,
          });
        }
      }
      const idsToDelete = existingHierarchyIds.filter((id) => !incomingHierarchyIds.includes(id));

      if (idsToDelete.length > 0) {
        await jobTemplateHierarchyModel.destroy({
          where: {
            job_temp_id: jobTemplate.id,
            program_id: jobTemplate.program_id,
            hierarchy: idsToDelete,
          },
        });
      }
    }

    if (jobTempCustomField?.custom_fields) {
      const incomingIds = jobTempCustomField.custom_fields.map((custom_field: { id: any; }) => custom_field.id).filter(Boolean);
      for (const custom_field of jobTempCustomField.custom_fields) {
        const { id, value } = custom_field;
        const existingRecord = await jobTemplateCustomFieldModel.findOne({
          where: {
            program_id: jobTemplate.program_id,
            job_temp_id: jobTemplate.id,
            custom_field_id: id,
          },
        });

        if (existingRecord) {
          await existingRecord.update({ custom_field, value });
        } else {
          await jobTemplateCustomFieldModel.create({
            custom_field_id: id,
            value,
            program_id: jobTemplate.program_id,
            job_temp_id: jobTemplate.id,
          });
        }
      }
      const existingCustomFields = await jobTemplateCustomFieldModel.findAll({
        where: {
          program_id: jobTemplate.program_id,
          job_temp_id: jobTemplate.id,
        },
      });
      const existingIds = existingCustomFields.map((field) => field.custom_field_id);
      const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));
      if (idsToDelete.length > 0) {
        await jobTemplateCustomFieldModel.destroy({
          where: {
            program_id: jobTemplate.program_id,
            job_temp_id: jobTemplate.id,
            custom_field_id: idsToDelete,
          },
        });
      }
    }

    if (jobQualification?.qualification_types) {
      const incomingIds = jobQualification.qualification_types
        .map((qualification_type: { qualification_type_id: any; }) => qualification_type.qualification_type_id)
        .filter(Boolean);

      for (const qualification_type of jobQualification.qualification_types) {
        const { qualification_type_id, ...qualificationData } = qualification_type;

        const existingRecord = await jobTemplateQualificationModel.findOne({
          where: {
            program_id,
            job_temp_id: id,
            qualification_type_id,
          },
        });

        if (existingRecord) {
          await existingRecord.update(qualificationData);
        } else {
          await jobTemplateQualificationModel.create({
            qualification_type_id,
            ...qualificationData,
            program_id,
            job_temp_id: id,
          });
        }
      }

      const existingQualifications = await jobTemplateQualificationModel.findAll({
        where: {
          program_id,
          job_temp_id: id,
        },
      });
      const existingIds = existingQualifications.map((q) => q.qualification_type_id);
      const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));
      if (idsToDelete.length > 0) {
        await jobTemplateQualificationModel.destroy({
          where: {
            program_id,
            job_temp_id: id,
            qualification_type_id: idsToDelete,
          },
        });
      }
    }

    const foundational_data = jobMasterData.foundational_data;
    if (foundational_data && Array.isArray(foundational_data)) {
      await JobMasterDataModel.destroy({
        where: { job_temp_id: id },
      });

      for (const data of foundational_data) {
        const { foundation_data_type_id, foundation_data_id, is_read_only } = data;
        if (!foundation_data_type_id || !foundation_data_id) continue;

        await JobMasterDataModel.create({
          program_id,
          job_temp_id: id,
          foundation_data_type_id,
          foundation_data_id,
          is_read_only,
        });
      }
    }

    reply.status(200).send({
      status_code: 200,
      message: "Job template updated successfully.",
      id,
      trace_id: traceId,
    });
  } catch (error) {
    console.error(error);
    reply.status(500).send({
      message: "Internal Server Error.",
      error: (error as any).message,
      trace_id: traceId,
    });
  }
}

export async function deleteJobTemplate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { program_id, id } = request.params as {
      id: string;
      program_id: string;
    };
    const jobtemplate_data = await jobTemplateModel.findOne({
      where: { program_id, id },
    });
    if (jobtemplate_data) {
      await jobTemplateModel.update(
        { is_deleted: true, is_enabled: false },
        { where: { program_id, id } }
      );
      reply.status(204).send({
        status_code: 204,
        message: "Job template deleted successfully.",
        trace_id: traceId,
      });
    } else {
      reply.status(204).send({
        status_code: 204,
        message: "Job template not found.",
        trace_id: traceId,
        job_template: [],
      });
    }
  } catch (error) {
    reply.status(500).send({
      message: "An error occurred while deleting job.",
      trace_id: traceId,
      error: error,
    });
  }
}

export async function getJobTemplatesByHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const user = request?.user;

  try {
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_ids, filter_by_hierarchy } = request.body as {
      hierarchy_ids?: string[];
      filter_by_hierarchy?: boolean;
    };
    const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);
    if (filter_by_hierarchy && (!hierarchy_ids || hierarchy_ids.length === 0)) {
      return reply.status(400).send({
        status_code: 400,
        message: "Hierarchy filtering is enabled, but no hierarchy_ids provided.",
        trace_id: traceId,
      });
    }

    const data = await jobTempletRepositories.getJobTemplateByHierarchies(
      program_id,
      hierarchy_ids,
      filter_by_hierarchy,
      mspHierarchyIds
    );

    return reply.status(200).send({
      status_code: 200,
      job_templates: data,
      trace_id: traceId,
    });
  } catch (error) {
    console.error("Error fetching job templates:", error);
    return reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching job templates.",
      trace_id: traceId,
    });
  }
}


export async function getAllJobTemplateHierarchyById(request: FastifyRequest, reply: FastifyReply) {
  const trace_id = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_ids, job_type, is_enabled, is_shift_rate } = request.query as { hierarchy_ids: string; job_type: string; is_enabled: string, is_shift_rate?: string; };
    const hierarchyIdsArray = hierarchy_ids ? hierarchy_ids.split(",") : [];
    const isEnabledBool = is_enabled !== undefined ? is_enabled === "true" : undefined;
    const isShiftRate = is_shift_rate !== undefined ? is_shift_rate === "true" : undefined

    const user = request?.user
    const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);
    const data = await jobTempletRepositories.getJobTempletByHierarchies(
      program_id,
      hierarchyIdsArray,
      job_type,
      isEnabledBool,
      isShiftRate,
      mspHierarchyIds
    );
    console.log("datat", data)
    reply.status(200).send({
      status_code: 200,
      job_templates: data,
      trace_id: trace_id,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching job templates.",
      trace_id: trace_id,
    });
  }
}

export async function getMostUsedJobTemplates(request: FastifyRequest, reply: FastifyReply) {
  const trace_id = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_ids, job_type, limit, offset, is_enabled, is_shift_rate } = request.query as { hierarchy_ids: string; job_type: string; limit: number; offset: number; is_enabled: string, is_shift_rate?: string };
    const user = request?.user
    const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);
    const hierarchyIdsArray = hierarchy_ids ? hierarchy_ids.split(",") : [];
    const isEnabledBool = is_enabled !== undefined ? is_enabled === "true" : undefined;
    const isShiftRate = is_shift_rate !== undefined ? is_shift_rate === "true" : undefined
    const data = await jobTempletRepositories.getMostUsedJobTemplatesByProgram(
      program_id,
      hierarchyIdsArray,
      job_type,
      limit,
      offset,
      isEnabledBool,
      isShiftRate,
      mspHierarchyIds
    );

    reply.status(200).send({
      status_code: 200,
      job_templates: data,
      trace_id: trace_id,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching job templates.",
      trace_id: trace_id,
    });
  }
}

export async function getAllJobTempletsByHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const {
      hierarchy,
      labour_category,
      job_type,
      name,
      qualification,
      limit,
      offset,
      labour_category_id,
      is_enabled,
      is_shift_rate,
      hierarchy_ids
    } = request.query as {
      hierarchy?: string;
      labour_category?: string;
      job_type?: string;
      name?: string;
      qualification?: string;
      limit?: number;
      offset?: number;
      labour_category_id?: string;
      is_enabled?: string;
      is_shift_rate?: string;
      hierarchy_ids?: string
    };

    const user = request?.user
    const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);
    const hierarchyIdsArray = hierarchy?.split(",") || [];
    const JobType = job_type?.split(",") || [];
    const laborCategoryIdsArray = labour_category?.split(",") || [];
    const qualificationIdsArray = qualification?.split(",") || [];
    const isEnabledBool = is_enabled !== undefined ? is_enabled === "true" : undefined
    const isShiftRate = is_shift_rate !== undefined ? is_shift_rate === "true" : undefined
    const isHierarchyIdsArray = hierarchy_ids?.split(",") || [];
    const data = await jobTempletRepositories.getAllJobTemplateByHierarchy(
      program_id,
      hierarchyIdsArray,
      laborCategoryIdsArray,
      qualificationIdsArray,
      limit,
      offset,
      JobType,
      name,
      labour_category_id,
      isEnabledBool,
      isShiftRate,
      isHierarchyIdsArray,
      mspHierarchyIds
    );
    if (!data || data.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "No job templates found",
        job_templates: [],
        trace_id: traceId,
      });
    }
    const uniqueJobTemplates = data.map((jobTemplate: any) => {
      const uniqueHierarchies = Array.from(
        new Set(jobTemplate.hierarchy.map((h: any) => JSON.stringify(h)))
      ).map((h: any) => JSON.parse(h));

      return {
        ...jobTemplate,
        hierarchy: uniqueHierarchies,
      };
    });

    reply.status(200).send({
      status_code: 200,
      message: "Job template fetched successfully",
      job_templates: uniqueJobTemplates,
      trace_id: traceId,
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching job templates hierarchies.",
      trace_id: traceId,
      error: error.message,
    });
  }
}

export async function findJobTemplatesByHierarchyIds(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };
  const { hierarchy_ids } = request.body as { hierarchy_ids: string[] };
  try {
    if (
      !Array.isArray(hierarchy_ids) ||
      hierarchy_ids.length === 0 ||
      !hierarchy_ids.every((id) => typeof id === "string" && id.trim() !== "")
    ) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: "hierarchy_ids must be a not empty.",
      });
    }

    const allHierarchyTemplates = await jobTemplateModel.findAll({
      where: {
        program_id,
        is_all_hierarchy_associated: 1,
        is_enabled: 1
      },
      attributes: ["program_id", "id", "job_id", "is_enabled", "template_name"],
    });

    const jobTemplateHierarchies = await jobTemplateHierarchyModel.findAll({
      where: {
        hierarchy: {
          [Op.in]: hierarchy_ids,
        },
      },
      attributes: ["job_temp_id", "hierarchy"],
    });

    const hierarchyMap = jobTemplateHierarchies.reduce(
      (acc, record) => {
        if (!acc[record.job_temp_id]) {
          acc[record.job_temp_id] = new Set();
        }
        acc[record.job_temp_id].add(record.hierarchy);
        return acc;
      },
      {} as Record<string, Set<string>>
    );

    const matchingJobTemplateIds = Object.keys(hierarchyMap).filter(
      (jobTempId) =>
        hierarchy_ids.every((id) => hierarchyMap[jobTempId].has(id))
    );

    const allMatchingIds = [
      ...allHierarchyTemplates.map(t => t.id.toString()),
      ...matchingJobTemplateIds
    ];

    if (allMatchingIds.length === 0) {
      return reply.status(404).send({
        status_code: 404,
        trace_id: traceId,
        message:
          "No job templates found that match all provided hierarchy IDs.",
      });
    }

    const jobTemplates = await jobTemplateModel.findAll({
      where: {
        id: {
          [Op.in]: allMatchingIds,
        },
        program_id,
      },
      attributes: ["program_id", "id", "job_id", "is_enabled", "template_name", "is_all_hierarchy_associated"],
    });

    const jobTemplatesWithHierarchies = jobTemplates.map((template) => ({
      ...template.toJSON(),
      jobTemplateHierarchies: template.is_all_hierarchy_associated === 1
        ? ['All Hierarchies']
        : Array.from(hierarchyMap[template.id] || []),
    }));

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      record_count: jobTemplatesWithHierarchies.length,
      job_templates: jobTemplatesWithHierarchies,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server error.",
    });
  }
}

export async function findJobTemplatesByLabourCategories(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const { labour_category } = request.query as { labour_category: string };
  const traceId = generateCustomUUID();
  try {
    if (!labour_category) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: "Provide labour category in query !",
      });
    }
    const jobTemplates = await jobTemplateModel.findAll({
      where: {
        labour_category: labour_category,
        program_id: program_id
      },
      attributes: ["template_name", "id"]
    });

    if (jobTemplates.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "No matching data found for the provided labour category.",
        job_templates: []

      });
    }
    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "Matching job templates find successfully !",
      record_count: jobTemplates.length,
      job_templates: jobTemplates,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server error.",
      error: error.message
    });
  }
}

export async function getCommonHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { job_manager_id, job_template_id, sow_template_id, msp_id, master_data_type_id, hierarchy_name } = request.query as {
      job_manager_id: string;
      job_template_id?: string;
      sow_template_id?: string;
      msp_id?: string;
      master_data_type_id?: string;
      hierarchy_name?: string;
    };
    const { program_id } = request.params as { program_id: string };

    let templateHierarchyIds: string[] = [];
    let sowTemplateHierarchyIds: string[] = [];
    let mspHierarchyIds: string[] = [];
    let managerHierarchyIds: string[] = [];
    let MasterDataHierarchyIds: string[] = [];
    let defaultHierarchyId: string | null = null;

    if (job_manager_id) {
      const managerResult = await jobTempletRepositories.managerQuery(job_manager_id, program_id);
      managerHierarchyIds = managerResult.hierarchies;
      defaultHierarchyId = managerResult.defaultHierarchyId;
    }

    if (job_template_id) {
      const templateData = await jobTempletRepositories.templateQuery(job_template_id);
      templateHierarchyIds = templateData.map((row) => row.hierarchy);
    }

    if (sow_template_id) {
      const sowTemplateData = await jobTempletRepositories.sowTemplateQuery(sow_template_id);
      sowTemplateHierarchyIds = sowTemplateData.map((row) => row.hierarchy_id);
    }

    if (msp_id) {
      mspHierarchyIds = await jobTempletRepositories.mspHierarchies(msp_id, program_id);
    }

    if (master_data_type_id) {
      const masterData = await jobTempletRepositories.masterDataQuery(master_data_type_id, program_id);
      MasterDataHierarchyIds = masterData.map((row) => row.hierarchy_id);
    }

    let hierarchyGroups: string[][] = [];

    if (managerHierarchyIds.length > 0) hierarchyGroups.push(managerHierarchyIds);
    if (templateHierarchyIds.length > 0) hierarchyGroups.push(templateHierarchyIds);
    if (sowTemplateHierarchyIds.length > 0) hierarchyGroups.push(sowTemplateHierarchyIds);
    if (mspHierarchyIds.length > 0) hierarchyGroups.push(mspHierarchyIds);
    if (MasterDataHierarchyIds.length > 0) hierarchyGroups.push(MasterDataHierarchyIds);

    let commonHierarchyIds = hierarchyGroups.length > 0
      ? hierarchyGroups.reduce((a, b) => a.filter(id => b.includes(id)), hierarchyGroups[0])
      : [];

    if (commonHierarchyIds.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        common_hierarchies: [],
        trace_id: traceId,
      });
    }

    const hierarchiesWithChildren = await sequelize.query(getHierarchieWithChildren, {
      replacements: { program_id },
      type: QueryTypes.SELECT
    });

    const buildHierarchy = (data: any, parentId = null) => {
      return data
        .filter((item: any) => item.parent_hierarchy_id === parentId)
        .map((item: any) => {
          const isAssociated = commonHierarchyIds.includes(item.id);
          const isDefault = item.id === defaultHierarchyId;
          const children = buildHierarchy(data, item.id);

          if (isAssociated || children.length > 0) {
            return {
              ...item,
              is_associated: isAssociated,
              is_default: isDefault,
              is_root_hierarchy: item.parent_hierarchy_id === null,
              hierarchies: children
            };
          }

          return null;
        })
        .filter(Boolean);
    };

    let nestedHierarchy = buildHierarchy(hierarchiesWithChildren);

    if (hierarchy_name) {
      const searchLower = hierarchy_name.toLowerCase().trim();

      const findAndBuildPath = (hierarchies: any[]): any[] => {
        for (const hierarchy of hierarchies) {
          const nameMatches = hierarchy.name.toLowerCase().includes(searchLower);

          if (nameMatches) {
            return [{
              ...hierarchy,
              hierarchies: hierarchy.hierarchies || []
            }];
          }

          if (hierarchy.hierarchies && hierarchy.hierarchies.length > 0) {
            const childResult = findAndBuildPath(hierarchy.hierarchies);
            if (childResult.length > 0) {
              return [{
                ...hierarchy,
                hierarchies: childResult
              }];
            }
          }
        }

        return [];
      };

      const matchingResult = findAndBuildPath(nestedHierarchy);
      nestedHierarchy = matchingResult;
    }

    reply.status(200).send({
      status_code: 200,
      message: "Common hierarchies fetched successfully.",
      trace_id: traceId,
      common_hierarchies: nestedHierarchy,
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "An error occurred while fetching common hierarchies.",
      error: error.message
    });
  }
}

function webReadableStreamToNodeStream(webStream: ReadableStream<Uint8Array>): NodeJS.ReadableStream {
  const reader = webStream.getReader();
  return new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) {
        this.push(null);
      } else {
        this.push(Buffer.from(value));
      }
    }
  });
}

export async function uploadFile(
  req: FastifyRequest<{
    Body: {
      job_template_id: string;
      signed_url: string;
    };
    Params: { program_id: string; }
  }>,
  reply: FastifyReply
) {
  const { job_template_id, signed_url } = req.body;
  const { program_id } = req.params;

  if (!signed_url || typeof signed_url !== 'string') {
    return reply.status(400).send({ status: 'error', message: 'Missing or invalid signed_url' });
  }

  let filePath: string | undefined;

  try {
    const response = await fetch(signed_url);
    if (!response.ok) {
      return reply.status(400).send({
        status: 'error',
        message: 'Failed to fetch file from signed_url',
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!supportedMimeTypes.includes(contentType)) {
      return reply.status(400).send({
        status: 'error',
        message: `Unsupported file type: ${contentType}`,
      });
    }

    const tempDir = path.join(__dirname, '..', 'uploads');
    const tempFile = `${randomUUID()}.upload`;
    filePath = path.join(tempDir, tempFile);
    await fs.mkdir(tempDir, { recursive: true });

    const fileStream = createWriteStream(filePath);
    const webStream = response.body;
    if (!webStream) {
      return reply.status(400).send({ status: 'error', message: 'Empty response body' });
    }

    const nodeStream = webReadableStreamToNodeStream(webStream as ReadableStream<Uint8Array>);
    await pipeline(nodeStream, fileStream);

    const htmlContent = await convertFileToHTML(filePath, contentType);

    if (job_template_id) {
      await jobTemplateModel.update(
        { description_url: signed_url },
        { where: { id: job_template_id, program_id } }
      );
    }

    return reply.send({
      status: 'success',
      message: 'File processed successfully',
      data: {
        upload_url: signed_url,
        html_content: htmlContent,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    return reply.status(500).send({ status: 'error', message: 'Failed to process file' });
  } finally {
    if (filePath) {
      await fs.unlink(filePath).catch(() => { });
    }
  }
}

export const advanceFilterJobTemplates = async (request: FastifyRequest, reply: FastifyReply) => {
  const { program_id } = request.params as { program_id: string };
  const traceId = generateCustomUUID();

  try {
    const {
      id,
      job_id,
      is_enabled,
      template_name,
      labour_category,
      labour_category_ids,
      is_shift_rate,
      primary_hierarchy,
      job_template_id,
      hierarchy_ids,
      category,
      requested_from,
      page = 1,
      limit = 10,
    } = request.body as GetJobTemplatesQuery & {
      hierarchy_ids?: string[];
      labour_category_ids?: string[];
      job_template_id?: any;
      requested_from?: string;
    };
    const user = request?.user
    const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);
    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
    const offset = (pageNumber - 1) * limitNumber;

    const dynamicConditions: string[] = [];
    const replacements: any = { program_id, limit: limitNumber, offset };

    if (mspHierarchyIds && mspHierarchyIds.length > 0) {
      dynamicConditions.push(`
        (job_templates.is_all_hierarchy_associated = 1 OR job_templates.id IN (
          SELECT job_temp_id
          FROM job_template_hierarchies
          WHERE hierarchy IN (:mspHierarchyIds)
          AND is_deleted = false
        ))
      `);
      replacements.mspHierarchyIds = mspHierarchyIds;
    }

    if (id) {
      dynamicConditions.push(`job_templates.id = :id`);
      replacements.id = id;
    }

    if (job_id) {
      dynamicConditions.push(`job_templates.job_id LIKE :job_id`);
      replacements.job_id = `%${job_id}%`;
    }

    if (is_enabled !== undefined) {
      dynamicConditions.push(`job_templates.is_enabled = :is_enabled`);
      replacements.is_enabled = is_enabled.toString() !== "false";
    }

    if (template_name) {
      dynamicConditions.push(`job_templates.template_name LIKE :template_name`);
      replacements.template_name = `%${template_name}%`;
    }

    if (category) {
      dynamicConditions.push(`job_category.title LIKE :category`);
      replacements.category = `%${category}%`;
    }

    if (labour_category) {
      dynamicConditions.push(`labour_category.id LIKE :labour_category`);
      replacements.labour_category = `%${labour_category}%`;
    }

    if (primary_hierarchy) {
      dynamicConditions.push(`job_templates.primary_hierarchy = :primary_hierarchy`);
      replacements.primary_hierarchy = primary_hierarchy;
    }

    if (is_shift_rate !== undefined) {
      dynamicConditions.push(`job_templates.is_shift_rate = :is_shift_rate`);
      replacements.is_shift_rate = is_shift_rate.toString() !== "false";
    }

    if (job_template_id && job_template_id.length > 0) {
      dynamicConditions.push(`job_templates.id IN (:job_template_id)`);
      replacements.job_template_id = job_template_id;
    }

    if (labour_category_ids && labour_category_ids.length > 0) {
      dynamicConditions.push(`job_templates.labour_category IN (:labour_category_ids)`);
      replacements.labour_category_ids = labour_category_ids;
    }

    if (hierarchy_ids && hierarchy_ids.length > 0) {
      dynamicConditions.push(`
        (job_templates.is_all_hierarchy_associated = 1 OR job_templates.id IN (
        SELECT job_temp_id
        FROM job_template_hierarchies
        WHERE hierarchy IN (:hierarchy_ids)
        AND is_deleted = false
      ))
    `);
      replacements.hierarchy_ids = hierarchy_ids;
    }

    if (requested_from && job_template_id < 1) {
      reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "job templet not found.",
        job_templates: []
      })
    }

    const dynamicConditionsString =
      dynamicConditions.length > 0 ? `AND ${dynamicConditions.join(" AND ")}` : "";

    const jobTemplates = await jobTempletRepositories.getAllJobTemplets(
      program_id,
      dynamicConditionsString,
      replacements,
      limitNumber,
      offset
    ) as any[];

    const enrichedJobTemplates = await Promise.all(
      jobTemplates.map(async (template) => {
        const [customFieldsResult] = await sequelize.query(
          getCustomsField(template.id, 'job_template_custom_field', 'job_temp_id', 'custom_field_id'),
          {
            replacements: { id: template.id },
            type: QueryTypes.SELECT,
          }
        ) as any;

        const customFields = customFieldsResult?.custom_fields?.map((field: any) => ({
          ...field,
          value: parseValue(field.value),
        })) || [];

        return {
          ...template,
          custom_fields: customFields,
        };
      })
    );

    const totalCount = jobTemplates.length > 0 ? jobTemplates[0].total_count : 0;
    const totalPages = Math.ceil(totalCount / limitNumber);

    return reply.status(200).send({
      statusCode: 200,
      trace_id: traceId,
      job_templates: enrichedJobTemplates,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total_pages: totalPages,
        total_count: totalCount,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({
      message: "An error occurred while fetching job templates.",
      trace_id: traceId,
      error: error.message,
    });
  }
};

export async function uploadJobTemplateFile(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        status_code: 400,
        message: "No file uploaded.",
        trace_id: traceId,
      });
    }

    const htmlContent = await extractFileContent(data);

    return reply.status(200).send({
      status_code: 200,
      message: "File uploaded and converted successfully",
      trace_id: traceId,
      data: htmlContent,
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: "File upload failed",
      trace_id: traceId,
      error: error.message,
    });
  }
}

export async function extractFileContent(file: any): Promise<string> {
  const buffer = await file.toBuffer();
  const mimetype = file.mimetype;

  if (mimetype === "application/pdf") {
    const data = await pdfParse(buffer);
    return `<div>${htmlEscape(data.text)}</div>`;
  }

  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword"
  ) {
    const result = await mammoth.convertToHtml({ buffer });
    return result.value;
  }

  if (mimetype === "text/plain") {
    const text = buffer.toString("utf-8");
    return `<pre>${htmlEscape(text)}</pre>`;
  }

  throw new Error("Unsupported file type");
}

export const bulkUploadJobTemplates = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();

  try {
    const { program_id } = request.params as { program_id: string };
    const jobTemplates = request.body as any[];

    if (!Array.isArray(jobTemplates) || jobTemplates.length === 0) {
      return reply.status(400).send({
        status_code: 400,
        message: "No job templates provided.",
        trace_id: traceId,
      });
    }

    const primaryHierarchyPairs = jobTemplates
      .map(t => ({
        name: t.primary_hierarchy?.trim(),
        code: t.primary_hierarchy_code?.trim()
      }))
      .filter(t => t.name && t.code);

    const [categoryRecords, labourCategoryRecords, hierarchyRecords, checklistrecord] = await Promise.all([
      JobCategoryModel.findAll({
        where: {
          title: {
            [Op.in]: jobTemplates.map(t => t.category?.trim()).filter(Boolean)
          }
        }
      }),
      IndustriesModel.findAll({
        where: {
          name: {
            [Op.in]: jobTemplates.map(t => t.labour_category?.trim()).filter(Boolean)
          }
        }
      }),
      Hierarchies.findAll({
        where: {
          [Op.and]: [
            { name: { [Op.in]: primaryHierarchyPairs.map(p => p.name) } },
            { code: { [Op.in]: primaryHierarchyPairs.map(p => p.code) } }
          ]
        }
      }),
      Checklist.findAll({
        where: {
          name: {
            [Op.in]: jobTemplates.map(t => t.checklist_entity_id?.trim()).filter(Boolean)
          }
        }
      })
    ]);

    const hierarchyMap = new Map(
      hierarchyRecords.map(h => [`${h.name.trim()}|${h.code.trim()}`, h.id])
    );
    const categoryMap = new Map(
      categoryRecords.map(c => [c.title.trim(), c.id])
    );
    const labourCategoryMap = new Map(
      labourCategoryRecords.map(l => [l.name.trim(), l.id])
    );
    const checklistMap = new Map(
      checklistrecord.map(c => [c.name.trim(), c.id])
    );

    const templateConditions = jobTemplates.map(template => ({
      template_name: template.template_name,
      program_id,
    }));

    const existingTemplates = await jobTemplateModel.findAll({
      where: { [Op.or]: templateConditions }
    });

    const existingSet = new Set(existingTemplates.map(tpl => `${tpl.template_name}|${tpl.program_id}`));

    const newTemplates = [];

    for (const tpl of jobTemplates) {
      if (existingSet.has(`${tpl.template_name}|${program_id}`)) continue;

      const primaryKey = `${tpl.primary_hierarchy?.trim()}|${tpl.primary_hierarchy_code?.trim()}`;

      const templateData = {
        ...tpl,
        program_id,
        primary_hierarchy: hierarchyMap.get(primaryKey) ?? null,
        category: categoryMap.get(tpl.category?.trim()) ?? null,
        labour_category: labourCategoryMap.get(tpl.labour_category?.trim()) ?? null,
        checklist_entity_id: checklistMap.get(tpl.checklist_entity_id?.trim()) ?? null,
        is_manual_distribute_submit: true,
        is_distribute_final_approval: true,
        is_all_hierarchy_associate: true


      };

      const createdTemplate = await jobTemplateModel.create(templateData, {
        validate: true,
        individualHooks: true,
      });

      newTemplates.push(createdTemplate);
    }

    return reply.status(201).send({
      status_code: 201,
      message: "Job templates created successfully.",
      trace_id: traceId,
    });

  } catch (error: any) {
    console.error(`trace_id: ${traceId} - Error:`, error);
    return reply.status(500).send({
      status_code: 500,
      message: "Failed to create job templates.",
      trace_id: traceId,
      error: error.message,
    });
  }
};

export async function getListHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { manager_id, msp_id, } = request.query as {
      manager_id: string;
      msp_id?: string;
    };
    const { program_id } = request.params as { program_id: string };

    let mspHierarchyIds: string[] = [];
    let managerHierarchyIds: string[] = [];
    let defaultHierarchyId: string | null = null;

    if (manager_id) {
      const managerResult = await jobTempletRepositories.managerQuery(manager_id, program_id);
      managerHierarchyIds = managerResult.hierarchies;
      defaultHierarchyId = managerResult.defaultHierarchyId;
    }

    if (msp_id) {
      mspHierarchyIds = await jobTempletRepositories.mspHierarchies(msp_id, program_id);
    }

    let hierarchyGroups: string[][] = [];

    if (managerHierarchyIds.length > 0) hierarchyGroups.push(managerHierarchyIds);
    if (mspHierarchyIds.length > 0) hierarchyGroups.push(mspHierarchyIds);

    let commonHierarchyIds = hierarchyGroups.length > 0
      ? hierarchyGroups.reduce((a, b) => a.filter(id => b.includes(id)), hierarchyGroups[0])
      : [];

    if (commonHierarchyIds.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        common_hierarchies: [],
        trace_id: traceId,
      });
    }

    const getHierarchieList = await sequelize.query(getHierarchieListView, {
      replacements: { commonHierarchyIds },
      type: QueryTypes.SELECT
    });

    reply.status(200).send({
      status_code: 200,
      message: "Common hierarchies fetched successfully.",
      trace_id: traceId,
      common_hierarchies: getHierarchieList,
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "An error occurred while fetching common hierarchies.",
      error: error.message
    });
  }
}

export async function getAllJobTemplate(request: FastifyRequest, reply: FastifyReply) {
  const trace_id = generateCustomUUID();

  try {
    const { program_id } = request.params as { program_id: string };
    const { labour_category } = request.query as { labour_category?: string };

    const jobTemplates: JobTemplate[] = await jobTemplateModel.findAll({
      attributes: ['id', 'template_name'],
      where: {
        program_id,
        ...(labour_category && { labour_category })
      },
      raw: true
    });

    if (!jobTemplates || jobTemplates.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "No job templates found.",
        job_templates: [],
        trace_id,
      });
    }

    reply.status(200).send({
      status_code: 200,
      message: "Job templates fetched successfully.",
      job_templates: jobTemplates,
      trace_id,
    });

  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: error.message,
      trace_id,
    });
  }
}