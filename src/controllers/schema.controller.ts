import { FastifyRequest, FastifyReply } from 'fastify';
import SchemaModel from '../models/schema.model';
import { SchemaData } from '../interfaces/schema.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';

export const createSchema = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {

        const SchemaDataPayload = request.body as Omit<SchemaData, '_id'>;

        const SchemaData: any = await SchemaModel.create({ ...SchemaDataPayload });
        reply.status(201).send({
            status_code: 201,
            message: 'Schema created successfully',
            schema: {
                id: SchemaData?.id,
                name: SchemaData?.name,
            },
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'Error While Creating Schema.', error, trace_id: traceId });
    }
};

export const updateSchema = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const SchemaData = request.body as SchemaData;
    const traceId=generateCustomUUID();
    try {
        const data = await SchemaModel.findOne({
            where: { id, is_deleted: false }
        });
        if (data) {
            await data.update(SchemaData);
            reply.status(201).send({
                status_code: 201,
                schema_id: id,
                trace_id: traceId,
                message: 'Schema updated successfully.',
            });
        } else {
            reply.status(200).send({status_code:200, message: 'Schema Data Not Found.',trace_id:traceId });
        }
    } catch (error) {
        reply.status(500).send({status_code:500, message: ' An Error Occurred While Updating The Schema.', error, trace_id: traceId});
    }
}

export const deleteSchema = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const data = await SchemaModel.findOne({
            where: { id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({status_code:200, message: 'Schema Data Not Found',trace_id:traceId });
        }

        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            schema_id: id,
            trace_id: traceId,
            message: 'Schema Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'Error Deleting Schema', error, trace_id: traceId});
    }
}

export async function getAllSchema(
    request: FastifyRequest<{ Params: SchemaData, Querystring: SchemaData }>,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {

        const query = request.query as any;

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
            searchConditions.is_enabled = query.is_enabled;
        }
        if (query.module_id) {
            searchConditions.module_id = query.module_id;
        }
        if (query.event_id) {
            searchConditions.event_id = query.event_id;
        }
        if (query.is_enabled) {
            searchConditions.is_enabled = query.is_enabled;
        }
        const { rows: schema, count } = await SchemaModel.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });
        if (schema.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Schema not found",
                schema: [],
                trace_id:traceId
            });
        }
        reply.status(200).send({
            status_code: 200,
            message: "Schema found",
            items_per_page: limit,
            total_records: count,
            schema: schema,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error: error,
            trace_id: traceId,
        });
    }
}

export async function getAllSchemas(
    request: FastifyRequest<{ Params: SchemaData, Querystring: SchemaData }>,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {
        const query = request.query as any;

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
            searchConditions.is_enabled = query.is_enabled;
        }
        if (query.module_id) {
            searchConditions.module_id = query.module_id;
        }
        if (query.event_id) {
            searchConditions.event_id = query.event_id;
        }
        if (query.is_enabled) {
            searchConditions.is_enabled = query.is_enabled;
        }
        const { rows: schema, count } = await SchemaModel.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });
        if (schema.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Schema not found",
                schema: [],
                trace_id: traceId,
            });
        }
        reply.status(200).send({
            status_code: 200,
            message: "Schemas found",
            items_per_page: limit,
            total_records: count,
            schema: schema,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error: error,
            trace_id: traceId,
        });
    }
}

export async function getSchemaById(request: FastifyRequest, reply: FastifyReply) {
    const traceId=generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const item = await SchemaModel.findOne({
            where: { id }
        });
        if (item) {
            reply.status(200).send({
                status_code: 200,
                message: "Schema found successfully",    
                schema: item,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({status_code:200, message: 'Schema not found', schema: [],trace_id:traceId });
        }
    } catch (error) {
        reply.status(500).send({status_code:200, message: 'An error occurred while fetching schema.', error,trace_id:traceId });
    }
}
