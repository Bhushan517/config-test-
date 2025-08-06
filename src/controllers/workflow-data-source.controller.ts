import { FastifyRequest, FastifyReply } from 'fastify';
import WorkflowDataSource from '../models/workflow-data-source.model';
import {WorkflowDataSourceData} from '../interfaces/workflow-data-source.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';

export const createWorkflowDataSource = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId=generateCustomUUID();
    try {
        const WorkflowDataSourcePayload = request.body as Omit<WorkflowDataSourceData, '_id'>;
        const WorkflowDataSourceData: any = await WorkflowDataSource.create({ ...WorkflowDataSourcePayload });
        reply.status(201).send({
            status_code: 201,
            message: 'Workflow Data Source created successfully',
            id: WorkflowDataSourceData?.id,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error while creating workflow data source.',
            error: (error as any).message,
            trace_id:traceId,
        });
    }
};

export const updateWorkflowDataSource = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const WorkflowDataSourceData = request.body as WorkflowDataSourceData;
    const traceId=generateCustomUUID();
    try {
        const data = await WorkflowDataSource.findOne({
            where: { id, is_deleted: false },
        });
        if (!data) {
            return reply.status(200).send({status_code:200, message: 'Workflow data source not found.',trace_id:traceId});
        }
        const UpdatedWorkflowInstance = await data.update(WorkflowDataSourceData);

        if (UpdatedWorkflowInstance) {
            reply.send({ success: true, message: 'Workflow data source updated successfully.',trace_id:traceId });
        }
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'An error occurred while updating the workflow data source', error: (error as any).message, trace_id:traceId});
    }
}

export const deleteWorkflowDataSource= async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId=generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const data = await WorkflowDataSource.findOne({
            where: { id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({status_code:200, message: 'Workflow data source not found.',trace_id:traceId });
        }
        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            id: id,
            trace_id:traceId,
            message: 'Workflow data source deleted successfully!'
        });
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'Error deleting workflow data source', error: (error as any).message, trace_id:traceId });
    }
}

export async function getAllWorkflowDataSource(
    request: FastifyRequest<{ Params: WorkflowDataSourceData, Querystring: WorkflowDataSourceData }>,
    reply: FastifyReply
) {
  const traceId=generateCustomUUID();
    try {
        const query = request.query as WorkflowDataSourceData | any;

        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;

        const searchConditions: any = {};
        if (query.name) {
            searchConditions.name = { [Op.like]: `%${query.name}%` };
        }
        
        const { rows: workflowInstance, count } = await WorkflowDataSource.findAndCountAll({
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
                data_source: []
            });
        }

        reply.status(200).send({
            status_code: 200,
            message: "Workflow data source retrieved successfully",
            items_per_page: limit,
            total_records: count,
            data_source: workflowInstance,
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

export async function getWorkflowDataSourceById(request: FastifyRequest, reply: FastifyReply) {
  const traceId=generateCustomUUID();
    try {
        const { id } = request.params as { id: string }
        const item = await WorkflowDataSource.findOne({
            where: { id }
        });
        if (item) {
            reply.status(200).send({
                status_code: 200,
                message: "Workflow data source retrieved successfully",
                data_source: item,
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({status_code:200, message: 'Workflow data source not found',trace_id:traceId, data_source: [] });
        }
    } catch (error) {
        reply.status(500).send({status_code:500, message: 'An error occurred while fetching workflow instance',trace_id:traceId, error: (error as any).message, });
    }
}
