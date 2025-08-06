
import customFieldLocation from '../models/custom-field-location.model';
import { CustomFieldLocationInterface } from '../interfaces/custom-field-location-interface';
import { FastifyReply, FastifyRequest } from 'fastify';
import { baseSearch } from '../utility/baseService'
import generateCustomUUID from '../utility/genrateTraceId';
import { decodeToken } from '../middlewares/verifyToken';
import logger from '../plugins/logger-plugin'

export async function createCustomFieldLocation(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const traceId = generateCustomUUID();
  logger.info({ traceId, message: 'createCustomFieldLocation function initiated' });
  const user=request?.user
  const userId = user?.sub;
  logger.info({ traceId, userId, message: 'Token decoded successfully' });
  const { program_id } = request.body as { program_id: string };
  logger.info({ traceId, userId, program_id, message: 'Processing request body' });

  try {
    const custom_Field_Location = request.body as CustomFieldLocationInterface;
    logger.debug({ traceId, data: custom_Field_Location, message: 'Custom Field Location data received' });
    const custom_field_loc: any = await customFieldLocation.create({ ...custom_Field_Location });
    logger.info({ traceId, userId, customFieldLocationId: custom_field_loc?.id, message: 'Custom field location created successfully' });


    reply.status(201).send({
      status_code: 201,
      message: "custom field location created succesfully",
      fees_config: custom_field_loc?.id,
      trace_id: traceId,
    });
  } catch (error) {
    logger.error({ traceId, message: 'Error creating custom field location', error });

    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while creating custom field location',
      error
    });
  }
}

export async function getCustomFieldLocationById(
  request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id, program_id } = request.params;
    const custom_Field_Location = await customFieldLocation.findOne({
      where: {
        id,
        program_id,
        is_deleted: false,
      },
      attributes: ['id', 'program_id', 'custom_field_id', 'location_id', 'is_enabled',
        'is_deleted', 'created_on', 'updated_on']
    });
    if (custom_Field_Location) {
      logger.info({ traceId, message: 'Custom field location found', data: custom_Field_Location });
      reply.status(201).send({
        status_code: 201,
        message: "custom field location get succesfully",
        custom_Field_Locations: custom_Field_Location,
        trace_id: traceId,
      });
    } else {
      logger.warn({ traceId, message: 'Custom field location data not found' });

      reply.status(200).send({
        status_code: 200,
        message: 'custom field location data not found',
        fees_config: [],
        trace_id: traceId,
      });
    }
  } catch (error) {
    logger.error({ traceId, message: 'Error fetching custom field location', error });
    reply.status(500).send({ status_code: 500, message: 'An error occurred while fetching custom field location', error });
  }
}

export async function updateCustomFieldLocationById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  logger.info({ traceId, message: 'Starting updateCustomFieldLocationById', params: request.params, body: request.body });
  const { id, program_id } = request.params as { id: string, program_id: string };
  const updates = request.body as Partial<CustomFieldLocationInterface>;
  try {
    const [custom_field_loc] = await customFieldLocation.update(updates, {
      where: { id, program_id }
    });

    if (custom_field_loc === 0) {
      return reply.status(200).send({ status_code: 200, message: 'custom field location not found', custom_field_loc: [] });
    }


    logger.info({ traceId, message: 'Custom field location updated successfully', id });
    return reply.status(201).send({
      status_code: 201,
      message: 'custom field location updated successfully',
      custom_Field_Locations: id,
      trace_id: traceId,
    });
  } catch (error) {
    logger.error({ traceId, message: 'Error updating custom field location', error });
    return reply.status(500).send({ status_code: 500, message: 'Internal Server Error', trace_id: generateCustomUUID(), error });
  }
}

export async function deleteCustomFieldLocationById(
  request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  logger.info({ traceId, message: 'Starting deleteCustomFieldLocationById', params: request.params });
  try {
    const { id, program_id } = request.params;
    const [custom_Field_Location] = await customFieldLocation.update(
      {
        is_deleted: true,
        is_enabled: false,
        updated_on: Date.now(),
      },
      { where: { id, program_id } }
    );
    if (custom_Field_Location > 0) {
      logger.info({ traceId, message: 'Custom field location deleted successfully', data: custom_Field_Location });
      reply.status(200).send({
        status_code: 200,
        message: "custom field location deleted successfully",
        custom_Field_Locations: custom_Field_Location,
        trace_id: traceId,
      });
    } else {
      logger.warn({ traceId, message: 'Custom field location not found for deletion' });
      reply.status(200).send({ status_code: 200, message: 'custom field location not found', trace_id: generateCustomUUID(), custom_Field_Location: [] });
    }
  } catch (error) {
    logger.error({ traceId, message: 'Error deleting custom field location', error });
    reply.status(500).send({ status_code: 500, message: 'Internal Serever Error' });
  }
}

export async function getAllCustomFieldLocation(request: FastifyRequest, reply: FastifyReply) {
  logger.info({ message: 'Starting getAllCustomFieldLocation', params: request.query });
  const searchFields = ['custom_field_id', 'location_id'];
  const responseFields = ['id', 'program_id', 'custom_field_id', 'location_id', 'is_enabled',
    'is_deleted', 'created_on', 'updated_on',];
  return baseSearch(request, reply, customFieldLocation, searchFields, responseFields);
}

export async function createCustomFieldLocations(custom_field_id: string, work_location_id: string, program_id: string) {
  const traceId = generateCustomUUID();

  try {
    logger.info({ traceId, message: 'Starting createCustomFieldLocations', custom_field_id, work_location_id, program_id });

    const customFieldLocationData = await customFieldLocation.create({
      custom_field_id,
      work_location_id,
      program_id
    });
    logger.info({ traceId, message: 'Custom field location created successfully', data: customFieldLocationData });
    return customFieldLocationData;
  } catch (error) {
    logger.error({ traceId, message: 'Error during custom field location creation', error });
    console.error('Error during custom field location creation:', error);
    throw error;
  }
}