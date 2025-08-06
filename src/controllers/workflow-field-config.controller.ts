import { FastifyRequest, FastifyReply } from 'fastify';
import WorkFlowFieldConfig from '../models/workflow-field-config.model';
import {WorkflowFieldConfigAttributes} from '../interfaces/workflow-field-config.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';

export const createWorkflowFieldConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {
        const workflowFieldConfigPayload = request.body as Omit<WorkflowFieldConfigAttributes, '_id'>;
        const WorkflowFieldConfigAttributes: any = await WorkFlowFieldConfig.create({ ...workflowFieldConfigPayload });
        reply.status(201).send({
            status_code: 201,
            message: 'Workflow Field Config created successfully',
            id: WorkflowFieldConfigAttributes?.id,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error while creating workflow field config.',
            error: (error as any).message,
 
            trace_id:traceId,
        });
    }
};

export const updateWorkflowFieldConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const WorkflowFieldConfigAttributes = request.body as WorkflowFieldConfigAttributes;
    const traceId=generateCustomUUID();
    try {
        const data = await WorkFlowFieldConfig.findOne({
            where: { id, is_deleted: false },
        });
        if (!data) {
            return reply.status(200).send({status_code:200, message: 'Workflow field config not found.',trace_id:traceId});
        }
        const UpdatedWorkflowInstance = await data.update(WorkflowFieldConfigAttributes);

        if (UpdatedWorkflowInstance) {
            reply.send({ success: true, message: 'Workflow field config updated successfully.',trace_id:traceId });
        }
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'An error occurred while updating the workflow field config',error: (error as any).message, trace_id:traceId});
    }
}

export const deleteWorkflowFieldConfig= async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId=generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const data = await WorkFlowFieldConfig.findOne({
            where: { id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({status_code:200, message: 'Workflow field config not found.',trace_id:traceId });
        }
        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            id: id,
            trace_id:traceId,
            message: 'Workflow field config deleted successfully!'
        });
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'Error deleting workflow field config', error: (error as any).message, trace_id:traceId });
    }
}

export async function getAllWorkflowFieldConfig(
    request: FastifyRequest<{ Params: WorkflowFieldConfigAttributes, Querystring: WorkflowFieldConfigAttributes }>,
    reply: FastifyReply
) {
  const traceId=generateCustomUUID();
    try {
        const query = request.query as WorkflowFieldConfigAttributes | any;

        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;

        const searchConditions: any = {};
        if (query.name) {
            searchConditions.name = { [Op.like]: `%${query.name}%` };
        }
        
        const { rows: workflowInstance, count } = await WorkFlowFieldConfig.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false},
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });

        if (workflowInstance.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Workflow instance not found",
                trace_id:traceId,
                field_config: []
            });
        }

        reply.status(200).send({
            status_code: 200,
            message: "Workflow field config retrieved successfully",
            items_per_page: limit,
            total_records: count,
            field_config: workflowInstance,
            trace_id:traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal server error",
            error: (error as any).message,
            trace_id:traceId,
        });
    }
}

export async function getWorkflowFieldConfigById(request: FastifyRequest, reply: FastifyReply) {
  const traceId=generateCustomUUID();
    try {
        const { id } = request.params as { id: string }
        const item = await WorkFlowFieldConfig.findOne({
            where: { id }
        });
        if (item) {
            reply.status(200).send({
                status_code: 200,
                message: "Workflow field config retrieved successfully",
                field_config: item,
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({status_code:200, message: 'Workflow field config not found',trace_id:traceId, field_config: [] });
        }
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'An error occurred while fetching workflow instance',trace_id:traceId, error: (error as any).message, });
    }
}
