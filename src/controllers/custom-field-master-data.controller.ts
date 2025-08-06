import { FastifyRequest, FastifyReply } from 'fastify';
import customFieldMaterData from '../models/custom-field-master-data.model'
import { CustomFieldmasterDataInterface } from '../interfaces/custom-field-master-data.interface'
import generateCustomUUID from '../utility/genrateTraceId';

export const saveCustomFieldsHierarchie = async (
  request: FastifyRequest<{}>,
  reply: FastifyReply
) => {
  const traceId = generateCustomUUID();
  const { ...customFieldData } = request.body as CustomFieldmasterDataInterface;

  try {

    const item: any = await customFieldMaterData.create({
      ...customFieldData
    });

    reply.status(201).send({
      status_code: 201,
      customfield_data: {
        id: item.id,
      },
      message: 'Custom field masterData created successfully',
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
    const customfiedData = await customFieldMaterData.findOne({
      where: { id, program_id: program_id },
      attributes: ['id', 'customField_id', 'program_id', 'is_enabled', 'hierarchie_id'],
    });

    if (customfiedData) {
      reply.status(200).send({
        status_code: 200,
        customField: customfiedData,
        message: 'Custom Fields masterData Get Successfully',
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'Custom Fields masterData Type Not Found',
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
  request: FastifyRequest<{ Params: { id: string; program_id: string }; Body: CustomFieldmasterDataInterface }>,
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
    const [updatedCount] = await customFieldMaterData.update(updates, {
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
        message: 'Custom Fields masterData not found', customField: [],
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error: Failed to update Custom Fields masterData',
      trace_id: traceId,
    });
  }
};

export const deleteCustomField = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  const { id } = request.params;
  const traceId = generateCustomUUID();
  try {
    const customFieldItem = await customFieldMaterData.findByPk(id);
    if (customFieldItem) {
      await customFieldItem.update({
        is_enabled: false,
        is_deleted: true,
      });

      reply.status(204).send({
        status_code: 204,
        message: 'custom Field masterData Deleted Successfully',
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
export const saveCustomFieldsMasterData = async (custom_field_id: string, master_data_id: string) => {
  try {
    const customFieldHierarchieData = await customFieldMaterData.create({
      custom_field_id,
      master_data_id,
    });
    return customFieldHierarchieData;
  } catch (error) {
    console.error('Error during custom field hierarchie creation:', error);
    throw error;
  }
};


