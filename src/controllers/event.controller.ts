import { FastifyRequest, FastifyReply } from 'fastify';
import Event from '../models/event.model';
import EventInterface from '../interfaces/event.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { baseSearch } from '../utility/baseService';
import Schema from '../models/schema.model';
import { Op } from 'sequelize';

export async function getAllEvents(request: FastifyRequest, reply: FastifyReply) {
  const searchFields = ['name', 'is_enabled', 'module_id', 'program_id', 'type'];
  const responseFields = ['id', 'name', 'slug', 'type', 'is_enabled', 'module_id'];
  return baseSearch(request, reply, Event, searchFields, responseFields);
}

export async function getEvents(
  request: FastifyRequest<{ Params: EventInterface, Querystring: EventInterface }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const params = request.params;
    const query = request.query as Partial<EventInterface> & { page?: string; limit?: string };

    const page = parseInt(query.page ?? "1");
    const limit = parseInt(query.limit ?? "10");
    const offset = (page - 1) * limit;
    query.page && delete query.page;
    query.limit && delete query.limit;

    const searchConditions: any = {};
    if (query.name) {
      searchConditions.name = { [Op.like]: `%${query.name}%` };
    }
    if (query.is_enabled) {
      query.is_enabled = query.is_enabled !== "false";
    }
    if (query.module_id) {
      searchConditions.module_id = query.module_id;
    }
    if (query.type) {
      searchConditions.type = query.type;
    }
    const { rows: event, count } = await Event.findAndCountAll({
      where: { ...query, ...searchConditions, is_deleted: false, module_id: params.module_id },
      attributes: { exclude: ["ref_id", "module_id"] },
      limit: limit,
      order: [["created_on", "DESC"]],
      offset: offset,
    });
    if (event.length === 0) {
      return reply.status(200).send({
        message: "Events Not Found",
        events: []
      });
    }
    reply.status(200).send({
      statusCode: 200,
      message:"Event get successfully",
      items_per_page: limit,
      total_records: count,
      events: event,
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      statusCode: 500,
      message: "Internal Server Error",
      error: error,
      trace_id: traceId,
    });
  }
}

export async function getEventById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { id, module_id } = request.params as { id: string, module_id: string };
    const item = await Event.findOne({
      where: {
        id,
        module_id,
        is_deleted: false,
      },
    });
    if (item) {
      reply.status(200).send({
        status_code: 200,
        message:"Event get data successfully",
        trace_id: traceId,
        event: item
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        event: [],
        message: 'Event not found.',
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error
    });
  }
}

export async function createEvent(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const event = request.body as EventInterface;
    const { module_id } = event;

    if (!module_id) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: 'module_id id is required.',
      });
    }

    const eventData = await Event.create({ ...event, module_id });

    reply.status(201).send({
      status_code: 201,
      trace_id: traceId,
      message: 'Event created successfully.',
      event: {
        id: eventData?.id,
      },
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error,
    });
  }
}

export async function updateEvent(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { id, module_id } = request.params as { id: string, module_id: string };
    const data = request.body as EventInterface;

    const eventData = await Event.findOne({
      where: { id, module_id, is_deleted: false },
    });

    if (!eventData) {
      return reply.status(200).send({
        trace_id: traceId,
        message: 'Event data not found.',
        event: [],
      });
    }
    await eventData.update(data);
    reply.status(201).send({
      status_code: 201,
      message: 'Event updated successfully.',
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      message: 'Internal Server Error',
      trace_id: traceId,
    });
  }
}

export async function deleteEvent(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { id, module_id } = request.params as { id: string, module_id: string };
    const eventData = await Event.findOne({
      where: { id, module_id, is_deleted: false },
    });
    if (!eventData) {
      return reply.status(200).send({ status_code:200,message: 'Event data not found.' });
    }
    await eventData.update({ is_enabled: false, is_deleted: true });
    reply.status(204).send({
      status_code: 204,
      trace_id: traceId,
      message: 'Event Deleted Successfully.'
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error
    });
  }
}

export async function getEventSchemaById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { module_id, event_id } = request.params as { module_id: string, event_id: string };

    const event = await Event.findOne({
      where: {
        module_id: module_id,
        id: event_id,
        is_deleted: false,
      },
      attributes: ['id', 'name', 'slug']
    });

    if (event) {
      const schemas = await Schema.findAll({
        where: {
          event_id: event.id,
        },
      });

      const fieldConfigs = schemas.map(schema => schema.toJSON());

      reply.status(200).send({
        status_code: 200,
        message:"Event schema get successfully",
        trace_id: traceId,
        id: event.id,
        name: event.name,
        slug: event.slug,
        field_config: fieldConfigs,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        id: null,
        name: null,
        slug: null,
        field_config: [],
        message: 'Event not found.',
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error
    });
  }
}
