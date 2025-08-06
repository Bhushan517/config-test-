import { FastifyRequest, FastifyReply } from 'fastify';
import TimeZone from '../models/time-zone.model';
import generateCustomUUID from "../utility/genrateTraceId"
import { Op } from 'sequelize';
export const getAllTimeZones = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name, code } = request.query as { name?: string; code?: string };

  const whereConditions: any = {};
  const traceId = generateCustomUUID();
  if (name) {
    whereConditions.name = { [Op.like]: `%${name}%` };
  }

  if (code) {
    whereConditions.code = { [Op.like]: `%${code}%` };
  }
  const timeZones = await TimeZone.findAll({ where: whereConditions });
  if (timeZones.length === 0) {
    return reply.status(200).send({ status_code: 200, message: "TimeZones not found", timeZones: [], trace_id: traceId });
  }
  reply.status(200).send({
    status_code: 200,
    message: "TimeZones found",
    data: timeZones,
    trace_id: traceId
  })
};

export const bulkUploadTimeZone = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  try {
    const timeZoneData = request.body as any[];
    const createdTimeZone = await TimeZone.bulkCreate(timeZoneData);
    reply.status(201).send({
      status_code: 201,
      data: createdTimeZone,
      message: 'time_zone Created successfully',
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Failed to create time_zone',
      trace_id: traceId,
      error: error,
    });
  }
};

export const getTimeZoneById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const timeZone = await TimeZone.findByPk(id);
  const traceId = generateCustomUUID();
  if (timeZone) {
    reply.status(200).send({
      status_code:200,
      timeZone,
      message:" timezone found successfully",
      trace_id: traceId
    });
  } else {
    reply.status(200).send({ status_code: 200, message: 'Time zone not found', timeZone: [],trace_id:traceId });
  }
};

export const createTimeZone = async (request: FastifyRequest, reply: FastifyReply) => {
  const { code, name, offset, utc_offset, region, num } = request.body as {
    code: string;
    name: string;
    offset: number;
    utc_offset: string;
    region: string;
    num: string;
  };
  const traceId = generateCustomUUID();
  try {
    const newTimeZone = await TimeZone.create({
      code,
      name,
      offset,
      utc_offset,
      region,
      num
    });
    reply.status(201).send({
      status_code: 201,
      message: " time_zone Created successfully",
      newTimeZone,
      trace_id: traceId
    });
  } catch (error) {
    reply.status(500).send({ status_code: 500, error: 'Internal Server Error',trace_id:traceId });
  }
};

export const updateTimeZone = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const { code, name, offset, utcOffset, region, num } = request.body as {
    code?: string;
    name?: string;
    offset?: number;
    utcOffset?: string;
    region?: string;
    num?: string;
  };
  const traceId = generateCustomUUID();
  const timeZone = await TimeZone.findByPk(id);
  if (timeZone) {
    await timeZone.update({
      code,
      name,
      offset,
      utcOffset,
      region,
      num
    });
    reply.status(200).send({
      status_code: 200,
      message: "time_zone Updated successfully",
      timeZone,
      trace_id: traceId
    });
  } else {
    reply.status(200).send({ status_code: 200, message: 'Time zone not found' ,trace_id:traceId});
  }
};

export const deleteTimeZone = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const timeZone = await TimeZone.findByPk(id);
  const traceId = generateCustomUUID();
  if (timeZone) {
    await timeZone.destroy();
    reply.status(204).send({
      status_code: 204,
      message: "Time zone deleted successfully",
      trace_id: traceId
    });
  } else {
    reply.status(200).send({ status_code: 200, message: 'Time zone not found', trace_id: traceId });
  }
};