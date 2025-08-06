import { FastifyRequest, FastifyReply } from 'fastify';
import customFieldHierarchie from '../models/custom-field-hierarchie.model';
import { CustomFieldHierarchieInterface } from '../interfaces/custom-field-hierarchie.interface';
import { baseSearch } from '../utility/baseService';
import generateCustomUUID from '../utility/genrateTraceId';
import CustomField from '../models/custom-fields.model';

export const saveCustomFieldsHierarchie = async (
  request: FastifyRequest<{}>,
  reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  const { ...customFieldData } = request.body as CustomFieldHierarchieInterface;

  try {

    const item: any = await customFieldHierarchie.create({
      ...customFieldData
    });

    reply.status(201).send({
      status_code: 201,
      customfield_data: {
        id: item.id,
      },
      message: 'Custom field hierarchie created successfully',
      trace_id: traceId,
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: error.message
    });
  }
};

export const getCustomFieldById = async (request: FastifyRequest<{ Params: { id: string; program_id: string } }>, reply: FastifyReply) => {
  const { id, program_id } = request.params;
  const traceId = generateCustomUUID();

  if (!program_id) {
    reply.status(400).send({
      status_code: 400,
      message: 'Program ID is required',
      trace_id: traceId,
    });
    return;
  }

  try {
    const customfiedData = await customFieldHierarchie.findOne({
      where: { id, program_id: program_id },
      attributes: ['id', 'customField_id', 'program_id', 'is_enabled', 'hierarchie_id'],
    });

    if (customfiedData) {
      reply.status(200).send({
        status_code: 200,
        customField: customfiedData,
        message: 'Custom Fields Hierarchie Get Successfully',
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'Custom Fields hierarchie Type Not Found',
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: (error as Error).message,
    });
  }
};

export const updateCustomFieldById = async (
  request: FastifyRequest<{ Params: { id: string; program_id: string }; Body: CustomFieldHierarchieInterface }>,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const { id, program_id } = request.params;
  const updates = request.body;

  if (!program_id) {
    reply.status(400).send({
      status_code: 400,
      message: 'Program ID is required',
      trace_id: traceId,
    });
    return;
  }

  try {
    const [updatedCount] = await customFieldHierarchie.update(updates, {
      where: { id, program_id: program_id },
    });

    if (updatedCount > 0) {
      reply.status(201).send({
        status_code: 201,
        message: "Custom field hierarchie updated successfully.",
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'Custom Fields hierarchie not found', customField: [],
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error: Failed to update Custom Fields',
      trace_id: traceId,
    });
  }
};

export const deleteCustomField = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  const { id } = request.params;
  const traceId = generateCustomUUID();
  try {
    const customFieldItem = await customFieldHierarchie.findByPk(id);
    if (customFieldItem) {
      await customFieldItem.update({
        is_enabled: false,
        is_deleted: true,
      });

      reply.status(204).send({
        status_code: 204,
        message: 'custom Field hierarchie Deleted Successfully',
        trace_id: traceId,
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'custom Field Not Found',
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: error
    });
  }
};

export async function searchCustomFields(request: FastifyRequest<{ Params: { program_id: string } }>, reply: FastifyReply) {
  const { program_id } = request.params;
  const customField = await customFieldHierarchie.findAll({
    where: { program_id: program_id }
  });

  if (customField.length === 0) {
    return reply.status(404).send({
      status_code: 404,
      message: 'No Custom field hierarchie found for the given program',
      customFieldHierarchie: []
    });
  }
  const searchFields = ['hierarchie_id', 'customField_id', 'is_enabled'];
  const responseFields = ['id', 'hierarchie_id', 'program_id', 'is_enabled', 'customField_id', 'created_on'];
  return baseSearch(request, reply, customFieldHierarchie, searchFields, responseFields);
}

export const saveCustomFieldsHierarchies = async (custom_field_id: string, hierarchy_id: string, program_id: string) => {
  try {
    const customFieldHierarchieData = await customFieldHierarchie.create({
      custom_field_id,
      hierarchy_id,
      program_id,
    });
    return customFieldHierarchieData;
  } catch (error) {
    console.error('Error during custom field hierarchie creation:', error);
    throw error;
  }
};

export const getCustomFieldsByHierarchyIds = async (
  request: FastifyRequest<{
    Params: { program_id: string },
    Querystring: { hierarchy_ids?: string; module_name?: string; is_status?: boolean };
  }>,
  reply: FastifyReply
) => {
  const { program_id } = request.params;
  const { hierarchy_ids, module_name, is_status } = request.query;
  const traceId = generateCustomUUID();

  try {
    const hierarchyIdsArray = hierarchy_ids
      ? Array.from(new Set(hierarchy_ids.split(',').map(id => id.trim()).filter(Boolean)))
      : [];
    const customFieldsResult: any[] = [];

    if (module_name) {
      const customFields = await CustomField.findAll({
        where: { program_id, module_name, is_deleted: false, is_enabled: true },
      });

      if (!customFields.length) {
        return reply.status(200).send({
          status_code: 200,
          message: `No Custom fields found for module name: ${module_name}`,
          trace_id: traceId,
          custom_fields: [],
          is_status: false,
        });
      }

      const customFieldHierarchies = await customFieldHierarchie.findAll({
        where: {
          program_id,
          ...(hierarchyIdsArray.length > 0 ? { hierarchy_id: hierarchyIdsArray } : {}),
        },
      });

      if (!customFieldHierarchies.length) {
        return reply.status(404).send({
          status_code: 404,
          message: `No hierarchy found for program_id: ${program_id}`,
          trace_id: traceId,
          custom_fields: [],
        });
      }

      customFields.forEach(field => {
        customFieldsResult.push({
          custid: field.id,
          program_id: field.program_id,
          custname: field.name,
          field_type: field.field_type,
          label: field.label,
          slug: field.slug,
          placeholder: field.placeholder,
          meta_data: field.meta_data,
          is_all_work_location: field.is_all_work_location,
          is_all_hierarchy: field.is_all_hierarchy,
          supporting_text: field.supporting_text,
          description: field.description,
          is_required: field.is_required,
          is_readonly: field.is_readonly,
          is_enabled: field.is_enabled,
          is_linked: field.is_linked,
          is_deleted: field.is_deleted,
          created_on: field.created_on,
          updated_on: field.updated_on,
          module_id: field.module_id,
          module_name: field.module_name,
          can_view: field.can_view,
          can_edit: field.can_edit,
          job_type: field.job_type,
          linked_modules: field.linked_modules,
        });
      });
    }

    if (hierarchyIdsArray.length > 0) {
      for (const hierarchyId of hierarchyIdsArray) {
        const customFieldHierarchies = await customFieldHierarchie.findAll({
          where: { hierarchy_id: hierarchyId, program_id },
        });

        if (customFieldHierarchies.length > 0) {
          const customFieldIds = Array.from(
            new Set(customFieldHierarchies.map(field => field.custom_field_id))
          );

          const customFields = await CustomField.findAll({
            where: { id: customFieldIds, program_id, is_deleted: false, is_enabled: true },
          });

          customFields.forEach(field => {
            customFieldsResult.push({
              custid: field.id,
              program_id: field.program_id,
              custname: field.name,
              field_type: field.field_type,
              label: field.label,
              slug: field.slug,
              placeholder: field.placeholder,
              meta_data: field.meta_data,
              is_all_work_location: field.is_all_work_location,
              is_all_hierarchy: field.is_all_hierarchy,
              supporting_text: field.supporting_text,
              description: field.description,
              is_required: field.is_required,
              is_readonly: field.is_readonly,
              is_enabled: field.is_enabled,
              is_linked: field.is_linked,
              is_deleted: field.is_deleted,
              created_on: field.created_on,
              updated_on: field.updated_on,
              module_id: field.module_id,
              module_name: field.module_name,
              can_view: field.can_view,
              can_edit: field.can_edit,
              job_type: field.job_type,
              linked_modules: field.linked_modules,
            });
          });
        }
      }
    }

    const response: Record<string, any> = {
      status_code: 200,
      trace_id: traceId,
      message: 'Custom fields retrieved successfully',
      program_id,
      total_record: customFieldsResult.length,
      custom_fields: customFieldsResult,
    };

    if (is_status) {
      response.is_status = is_status;
    }

    return reply.status(200).send(response);

  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while fetching custom fields.',
      trace_id: traceId,
      error: error.message,
    });
  }
};