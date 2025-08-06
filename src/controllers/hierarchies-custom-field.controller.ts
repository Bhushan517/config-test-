import { FastifyReply, FastifyRequest } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import HierarchyCustomFieldModel from '../models/hierarchies-custom-field.model'; // assuming this is the path of your model
import { HierarchyCustomFieldInterface } from '../interfaces/hierarchies-custom-field.interface'; // assuming interface is defined

export async function createHierarchyCustomField(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const hierarchyCustomField = request.body as HierarchyCustomFieldInterface;

    const customFieldLocation = await HierarchyCustomFieldModel.create({
      ...hierarchyCustomField,
    });

    reply.status(201).send({
      status_code: 201,
      message: 'Custom field created successfully',
      custom_field_location_id: customFieldLocation?.id,
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code:500,
      message: 'An error occurred while creating custom field',
      error: (error as Error).message,
    });
  }
}
export async function getHierarchyCustomFieldById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params;
    const hierarchy = await HierarchyCustomFieldModel.findByPk(id, {

    });
    if (hierarchy) {
      reply.status(200).send({
        status_code: 200,
        message:"Hierarchy customField get successfully",
        trace_id: traceId,
        hierarchies: hierarchy
      });
    } else {
      reply.status(200).send({ status_code:200,message: 'Hierarchy customField not found', hierarchies: [] });
    }
  } catch (error) {
    reply.status(500).send({
      status_code:500,
      message: 'An error occurred while fetching Hierarchy by ID',
      error: error,
    });
  }
}


export const updateHierarchyCustomFieldById = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { program_id, id } = request.params as { program_id: string, id: string };
  const traceId = generateCustomUUID();
  try {
    const [updatedCount] = await HierarchyCustomFieldModel.update(request.body as HierarchyCustomFieldInterface, { where: { program_id, id } });
    if (updatedCount > 0) {
      reply.status(201).send({
        status_code: 201,
        message: 'HierarchyCustomField updated successfully.',
        id,
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'HierarchyCustomField not found.',
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code:500,
      message: 'Internal Server error',
      trace_id: traceId,
      error
    });
  }
};


export async function deleteHierarchyCustomFieldById(
  request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID()
  try {
    const { program_id, id } = request.params;
    const hierarchyCustomField = await HierarchyCustomFieldModel.findOne({ where: { program_id, id } });
    if (hierarchyCustomField) {
      reply.status(204).send({
        status_code: 204,
        message: 'hierarchyCustomField deleted successfully.',
        trace_id: traceId,
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'hierarchyCustomField not found.'
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code:500,
      message: 'An error occurred while deleting hierarchyCustomField.',
      trace_id: traceId,
      error: error,
    });
  }
}