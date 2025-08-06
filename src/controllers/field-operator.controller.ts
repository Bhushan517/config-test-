import { FastifyRequest, FastifyReply } from 'fastify';
import FieldOperatorModel from '../models/field-operator.model';
import { FieldOperatorData } from '../interfaces/field-operator.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';
import { decodeToken } from '../middlewares/verifyToken';

export const createFieldOperator = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const user=request?.user
    const userId = user?.sub;
    try {
        const FieldOperatorPayload = request.body as Omit<FieldOperatorData, '_id'>;
        const FieldOperator: any = await FieldOperatorModel.create({ ...FieldOperatorPayload,created_by: userId, updated_by: userId, });
        reply.status(201).send({
            statusCode: 201,
            field_operator_id: FieldOperator.id,
            message: 'Field operator created successfully',
            trace_id:traceId,
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal server error',
            trace_id:traceId,
        });
    }
};

export const updateFieldOperator = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { id } = request.params as { id: string };
    const fieldOperator = request.body as FieldOperatorData;
    const user=request?.user
    const userId=user?.sub;
    try {
        const data = await FieldOperatorModel.findOne({
            where: {
                id, is_deleted: false
            }
        });
        if (data) {
            await data.update(fieldOperator,{
                where:{created_by: userId, updated_by: userId,}});
            reply.status(201).send({
                statusCode: 201,
                field_operator_id: id,
                message: 'Field operator data updated successfully.',
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({
                statusCode: 200,
                message: 'Field operator not found.',
                trace_id:traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal server error',
            trace_id:traceId,
        });
    }
}

export const deleteFieldOperator = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
     const user=request?.user
    const userId=user?.sub;
    try {
        const { id } = request.params as { id: string };
        const data = await FieldOperatorModel.findOne({
            where: { id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({
                statusCode: 200,
                message: 'Field operator not found',
                trace_id:traceId,
            });
        }

        await data.update({ is_enabled: false, is_deleted: true,created_by: userId,
            updated_by: userId, });
        reply.status(200).send({
            statusCode: 200,
            field_operator_id: id,
            trace_id:traceId,
            message: 'Field operator data deleted successfully'
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal server error',
            trace_id:traceId,
        });
    }
}

export async function getAllFieldOperator(
    request: FastifyRequest<{ Params: FieldOperatorData, Querystring: FieldOperatorData }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const query: any = request.query;

        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;

        const searchConditions: any = {};
        if (query.sign) {
            searchConditions.sign = { [Op.like]: `%${query.sign}%` };
        }
        if (query.eval_text) {
            searchConditions.eval_text = { [Op.like]: `%${query.eval_text}%` };
        }
        if (query.is_enabled) {
            searchConditions.is_enabled = query.is_enabled !== "false";
        }

        const { rows: fieldOperator, count } = await FieldOperatorModel.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false },
            attributes: {
                exclude: ["is_enabled", "created_on", "updated_on", "created_by", "updated_by", "is_deleted"]
            },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });
        if (fieldOperator.length === 0) {
            return reply.status(200).send({
                statusCode: 200,
                message: "Field operator not found",
                field_operator: [],
                trace_id:traceId,
            });
        }

        reply.status(200).send({
            statusCode: 200,
            message:"Field operator get successfully",
            items_per_page: limit,
            total_records: count,
            field_operators: fieldOperator,
            trace_id:traceId,
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: "Internal server error",
            trace_id:traceId,
        });
    }
}

export async function getFieldOperatorById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const item = await FieldOperatorModel.findOne({
            where: { id }
        });
        if (item) {
            reply.status(200).send({
                statusCode: 200,
                field_operator: item,
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({
                statusCode: 200,
                message: 'Field operator not found',
                field_operator: [],
                trace_id:traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal server error',
            trace_id:traceId,
        });
    }
}
