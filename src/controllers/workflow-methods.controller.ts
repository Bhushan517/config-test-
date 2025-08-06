import { FastifyRequest, FastifyReply } from 'fastify';
import WorkflowMethod from '../models/workflow-methods.model';
import { WorkflowMethodData } from '../interfaces/workflow-methods.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op } from 'sequelize';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Module } from '../models/module.model';
import Event from '../models/event.model';
import Workflow from '../models/workflow.model';
import JobWorkFlowModel from '../models/job-workflow.model';

export const createWorkflowMethod = async (request: FastifyRequest, reply: FastifyReply) => {
    const WorkflowMethodDataPayload = request.body as Omit<WorkflowMethodData, '_id'>;
    const traceId = generateCustomUUID();

    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating workflow method",
            status: "success",
            level: 'info',
            action: request.method,
            url: request.url,
            is_deleted: false
        },
        WorkflowMethod
    );

    try {
        const WorkflowMethodData: any = await WorkflowMethod.create({ ...WorkflowMethodDataPayload });
        reply.status(201).send({
            status_code: 201,
            message: 'Workflow Method created successfully',
            workflow_method: {
                id: WorkflowMethodData?.id,
                name: WorkflowMethodData?.name,
            },
            trace_id: traceId
        });

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "created workflow method",
                status: "success",
                description: `Created workflow method successfully: ${WorkflowMethodData?.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                is_deleted: false
            },
            WorkflowMethod
        );
    } catch (error) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "created workflow method",
                status: "error",
                description: `Error creating workflow method.`,
                level: 'error',
                action: request.method,
                url: request.url,
                is_deleted: false
            },
            WorkflowMethod
        );

        reply.status(500).send({ status_code: 500, message: 'Error While Creating Workflow Method.', error, trace_id: traceId });
    }
};

export const updateWorkflowMethod = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const WorkflowMethodData = request.body as WorkflowMethodData;
    const traceId = generateCustomUUID();
    try {
        const data = await WorkflowMethod.findOne({
            where: { id, is_deleted: false }
        });
        if (data) {
            await data.update(WorkflowMethodData);
            reply.status(201).send({
                status_code: 201,
                workflow_method_id: id,
                trace_id: traceId,
                message: 'Workflow Method Updated Successfully.',
            });
        } else {
            reply.status(200).send({ status_code: 200, message: 'Workflow Method Data Not Found.', trace_id: traceId });
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: ' An Error Occurred While Updating The Workflow Method.', error, trace_id: traceId });
    }
}

export const deleteWorkflowMethod = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();

    try {
        const { id, } = request.params as { id: string };
        const data = await WorkflowMethod.findOne({
            where: { id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({ status_code: 200, message: 'Workflow Method Data Not Found' });
        }

        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            Workflow_method_id: id,
            trace_id: traceId,
            message: 'Workflow Method Deleted Successfully'
        });
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: 'Error Deleting Workflow Method Data', error, trace_id: traceId });
    }
}

export async function getAllWorkflowMethods(
    request: FastifyRequest<{ Params: WorkflowMethodData, Querystring: WorkflowMethodData }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();

    try {
        const query = request.query as WorkflowMethodData | any;

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
        const { rows: workflow_method, count } = await WorkflowMethod.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });
        if (workflow_method.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Workflow Method Not Found",
                workflow: [],
                trace_id: traceId
            });
        }
        reply.status(200).send({
            status_code: 200,
            message: "Workflow Method Retrieved Successfully",
            items_per_page: limit,
            total_records: count,
            workflow_method: workflow_method,
            trace_id: traceId,
        });
    } catch (error) {
        console.log(error);

        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error: error,
            trace_id: traceId,
        });
    }
}

export async function getWorkflowMethods(
    request: FastifyRequest<{ Params: WorkflowMethodData, Querystring: WorkflowMethodData }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const query = request.query as WorkflowMethodData | any;

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
        const { rows: workflow_method, count } = await WorkflowMethod.findAndCountAll({
            where: { ...query, ...searchConditions, is_deleted: false },
            attributes: { exclude: ["program_id"] },
            limit: limit,
            order: [["name", "ASC"]],
            offset: offset,
        });
        if (workflow_method.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Workflow Method Not Found",
                workflow: [],
                trace_id: traceId,
            });
        }
        reply.status(200).send({
            status_code: 200,
            message: "Workflow Method Found",
            items_per_page: limit,
            total_records: count,
            workflow_method: workflow_method,
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

export async function getWorkflowMethodById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const item = await WorkflowMethod.findOne({
            where: { id, program_id }
        });
        if (item) {
            reply.status(200).send({
                status_code: 200,
                message: "Workflow Method Found",
                workflow_method: item,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: 'Workflow Method Data Not Found', workflow: [], trace_id: traceId });
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: 'An Error Occurred While Fetching Workflow Method Data.', error, trace_id: traceId });
    }
}


export async function getWorkflowMethod(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { module, workflow_trigger_id } = request.query as { module: string, workflow_trigger_id?: string };
        const moduleLower = module.toLowerCase();

        if (moduleLower === 'job') {
            return await handleJobModule(workflow_trigger_id, reply, traceId, moduleLower);
        }
        else if (moduleLower === 'offer') {
            return await handleOfferModule(workflow_trigger_id, reply, traceId, moduleLower);
        }
        else if (moduleLower === 'assignment' || moduleLower === 'assignments') {
            return await handleAssignmentModule(workflow_trigger_id, reply, traceId, moduleLower);
        }
        
        else if (moduleLower === 'timesheet') {
            return await handleTimesheetModule(workflow_trigger_id, reply, traceId);
        }
        else if (module === 'submit_candidate_rehire_check') {
            return await handleCandidateRehireCheckModule(workflow_trigger_id, reply, traceId);
        } else if (module === 'sow') {
            return await handleSowModule(workflow_trigger_id, reply, traceId, moduleLower);
        }
        else {
            return await handleOtherModules(workflow_trigger_id , module, reply, traceId);
        }
    } catch (error) {
        console.log(error);
        return reply.status(500).send({
            status_code: 500,
            message: 'An Error Occurred While Fetching Workflow Method.',
            error,
            trace_id: traceId
        });
    }
}

async function findModuleBySlug(slug: string) {
    const moduleData = await Module.findOne({ where: { slug: slug, is_workflow: true } });
    return moduleData?.dataValues.id || "";
}

async function findEvent(moduleId: string, slug: string) {
    if (!moduleId || !slug) return null;
    
    const event = await Event.findOne({
        where: { module_id: moduleId, slug, is_enabled: true }
    });
    return event?.dataValues?.id || null;
}

async function findWorkflowMethods(moduleId: string, eventIds: (string | null)[]) {
    return await WorkflowMethod.findAll({
        where: {
            module_id: moduleId,
            [Op.or]: eventIds.filter(id => id !== null).map(id => ({ event_id: id }))
        }
    });
}

function findMethod(items: any[], eventId: string | null, methodName: string) {
    return items.find(
        i => i.dataValues.event_id === eventId && 
             i.dataValues.name?.trim().toLowerCase() === methodName
    );
}

async function getWorkflows(workflowTriggerId: string | undefined, options?: { isUpdated?: boolean }) {
    const where: any = {
        workflow_trigger_id: workflowTriggerId,
        is_deleted: false,
        is_enabled: true
    };
    
    if (options && options.isUpdated !== undefined) {
        where.is_updated = options.isUpdated;
    }
    
    return await JobWorkFlowModel.findAll({ where });
}

function sortWorkflowMethods(responses: any[], sortByPending = false, workflows: any[] = [], moduleLower: string = "") {
    return responses
        .map((response) => {
            const matchedWorkflow = workflows.find(
                (w) =>
                    response.method_ids?.includes(w.dataValues.method_id)
            );
            
            response.is_workflow = !!matchedWorkflow;
            response.workflow_id = (moduleLower === "assignment" || moduleLower === "job" || moduleLower === "sow" || moduleLower === "offer" )
                ? null
                : matchedWorkflow?.dataValues?.id ?? null;
            response.workflow_status = matchedWorkflow?.dataValues?.status ?? null;
            return response;
        })
        .sort((a, b) => {
            const aStatusIsPending = a.is_workflow ?? false;  
            const bStatusIsPending = b.is_workflow ?? false;  
            if (sortByPending) {
                if (aStatusIsPending && !bStatusIsPending) return 1;  
                if (!aStatusIsPending && bStatusIsPending) return -1;
            }

            const aIsReview =
                a?.name?.trim().toLowerCase() === "review";
            const bIsReview =
                b?.name?.trim().toLowerCase() === "review";

            const aIsApproval =
                a?.name?.trim().toLowerCase() === "approval";
            const bIsApproval =
                b?.name?.trim().toLowerCase() === "approval";

            if (aIsReview && !bIsReview) return -1; 
            if (!aIsReview && bIsReview) return 1;

            if (aIsApproval && !bIsApproval) return 1; 
            if (!aIsApproval && bIsApproval) return -1;

            return 0; 
        });
}

  
  

// Handle job module logic
async function handleJobModule(workflowTriggerId: string | undefined, reply: FastifyReply, traceId: string, moduleLower: string) {
    const moduleId = await findModuleBySlug("job");

    const eventId1 = await findEvent(moduleId, "create_job");
    const eventId2 = await findEvent(moduleId, "update_job");

    const items = await findWorkflowMethods(moduleId, [eventId1, eventId2]);

    const createReviewMethod = findMethod(items, eventId1, "review");
    const updateReviewMethod = findMethod(items, eventId2, "review");
    const createApprovalMethod = findMethod(items, eventId1, "approval");
    const updateApprovalMethod = findMethod(items, eventId2, "approval");

    // Dynamically build response methods
    const response: any[] = [];

    if (createApprovalMethod || updateApprovalMethod) {
        const method_ids = [
            createApprovalMethod?.dataValues?.id,
            updateApprovalMethod?.dataValues?.id
        ].filter(Boolean);

        const baseData = createApprovalMethod?.dataValues || updateApprovalMethod?.dataValues;

        response.push({
            ...baseData,
            method_ids
        });
    }

    if (createReviewMethod || updateReviewMethod) {
        const method_ids = [
            createReviewMethod?.dataValues?.id,
            updateReviewMethod?.dataValues?.id
        ].filter(Boolean);

        const baseData = createReviewMethod?.dataValues || updateReviewMethod?.dataValues;

        response.push({
            ...baseData,
            method_ids
        });
    }
    // If no methods found, return early
    if (!response.length) {
        return reply.status(400).send({
            status_code: 400,
            message: "No workflow methods found"
        });
    }

    const workflows = await getWorkflows(workflowTriggerId);

    if (!workflows.length) {
        return reply.status(400).send({
            status_code: 400,
            message: "No workflows found for the given trigger ID"
        });
    }

    const workflowMethodIds = workflows.map((workflow: any) => workflow.method_id);
    const responses = response.filter(i => workflowMethodIds.includes(i.id));
    
    if (!responses.length) {
        return reply.status(400).send({
            status_code: 400,
            message: "No matching workflow methods found for trigger ID"
        });
    }

    const sortedResponse = sortWorkflowMethods(responses, false, workflows, moduleLower);

    return reply.status(200).send({
        status_code: 200,
        message: "Workflow methods fetched successfully",
        workflow_method: sortedResponse,
    });
}


// Handle sow module
async function handleSowModule(workflowTriggerId: string | undefined, reply: FastifyReply, traceId: string, moduleLower: any) {
    const moduleId = await findModuleBySlug("sow");
    console.log('Module id is nooww', moduleId)
    const eventId1 = await findEvent(moduleId, "create_sow");
    const eventId2 = await findEvent(moduleId, "update_sow");
    const eventId3 = await findEvent(moduleId, "submit_material_expense");
    const eventId4 = await findEvent(moduleId, "submit_payment_request")
    const items = await findWorkflowMethods(moduleId, [eventId1, eventId2, eventId3, eventId4]);
    const createApprovalMethod = findMethod(items, eventId1, "approval");
    const updateApprovalMethod = findMethod(items, eventId2, "approval");
    const submitExpenseMethod = findMethod(items, eventId3, "approval");
    const submitPaymentMethod = findMethod(items, eventId4, "approval");

    // Dynamically build response methods
    const response: any[] = [];

    if (createApprovalMethod || updateApprovalMethod || submitExpenseMethod || submitPaymentMethod) {
        const method_ids = [
            createApprovalMethod?.dataValues?.id,
            updateApprovalMethod?.dataValues?.id,
            submitExpenseMethod?.dataValues?.id,
            submitPaymentMethod?.dataValues?.id
        ].filter(Boolean);

        const baseData = createApprovalMethod?.dataValues || updateApprovalMethod?.dataValues || submitExpenseMethod?.dataValues || submitPaymentMethod.dataValues;

        response.push({
            ...baseData,
            method_ids
        });
    }
    // If no methods found, return early
    if (!response.length) {
        return reply.status(400).send({
            status_code: 400,
            message: "No workflow methods found"
        });
    }

    const workflows = await getWorkflows(workflowTriggerId);

    if (!workflows.length) {
        return reply.status(400).send({
            status_code: 400,
            message: "No workflows found for the given trigger ID"
        });
    }

    const workflowMethodIds = workflows.map((workflow: any) => workflow.method_id);

    const responses = response.filter(i => {
        return i?.method_ids?.some((id: string) => workflowMethodIds?.includes(id));
    });
    
    if (!responses.length) {
        return reply.status(400).send({
            status_code: 400,
            message: "No matching workflow methods found for trigger ID"
        });
    }

    const sortedResponse = sortWorkflowMethods(responses, false, workflows, moduleLower);

    return reply.status(200).send({
        status_code: 200,
        message: "Workflow methods fetched successfully",
        workflow_method: sortedResponse,
    });
}


// Handle offer module logic
async function handleOfferModule(workflowTriggerId: string | undefined, reply: FastifyReply, traceId: string, moduleLower: string) {
    const moduleId = await findModuleBySlug("offer");
    const eventId1 = await findEvent(moduleId, "create_offer");
    const eventId2 = await findEvent(moduleId, "counter_offer");

    const items = await findWorkflowMethods(moduleId, [eventId1, eventId2]);

    const createReviewMethod = findMethod(items, eventId1, "review");
    const createApprovalMethod = findMethod(items, eventId1, "approval");
    const counterReviewMethod = findMethod(items, eventId2, "review");
    const counterApprovalMethod = findMethod(items, eventId2, "approval");

    const response = [];

    if (createApprovalMethod) {
        response.push({
            ...createApprovalMethod.dataValues,
            method_ids: [createApprovalMethod.dataValues.id]
        });
    }
    
    if (createReviewMethod) {
        response.push({
            ...createReviewMethod.dataValues,
            method_ids: [createReviewMethod.dataValues.id]
        });
    }
    
    if (counterApprovalMethod) {
        response.push({
            ...counterApprovalMethod.dataValues,
            method_ids: [counterApprovalMethod.dataValues.id]
        });
    }
    
    if (counterReviewMethod) {
        response.push({
            ...counterReviewMethod.dataValues,
            method_ids: [counterReviewMethod.dataValues.id]
        });
    }
    

    if (response.length === 0) {
        return reply.status(400).send({
            status_code: 400,
            message: "Required workflow methods not found",
            trace_id: traceId
        });
    }

    const workflows = await getWorkflows(workflowTriggerId);

    if (!workflows.length) {
        return reply.status(400).send({
            status_code: 400,
            message: "No workflows found for the given trigger ID",
            trace_id: traceId
        });
    }

    const workflowMethodIds = workflows.map((workflow: any) => workflow.method_id);
    const responses = response.filter(i => {
        return i.method_ids.some((id: string) => workflowMethodIds.includes(id));
    });

    const sortedResponse = sortWorkflowMethods(responses, true, workflows, moduleLower);

    return reply.status(200).send({
        status_code: 200,
        message: "Workflow methods fetched successfully",
        workflow_method: sortedResponse,
        trace_id: traceId
    });
}

// Handle assignment module logic
async function handleAssignmentModule(workflowTriggerId: string | undefined, reply: FastifyReply, traceId: string, moduleLower: string) {
    const moduleId = await findModuleBySlug("assignment");
    
    const eventId1 = await findEvent(moduleId, "create_assignment");
    const eventId2 = await findEvent(moduleId, "update_assignment");
    const eventId3 = await findEvent(moduleId, "assignment_budget_adjustment");
    
    const items = await findWorkflowMethods(moduleId, [eventId1, eventId2, eventId3]);
    
    const createApprovalMethod = findMethod(items, eventId1, "approval");
    const updateApprovalMethod = findMethod(items, eventId2, "approval");
    const budgetAdjustmentApprovalMethod = findMethod(items, eventId3, "approval");
    const workflows = await getWorkflows(workflowTriggerId);
    if (!workflows.length) {
        return reply.status(400).send({
            status_code: 400,
            message: "No workflows found for the given trigger ID",
            trace_id: traceId,
        });
    }
    if (createApprovalMethod && updateApprovalMethod && budgetAdjustmentApprovalMethod) {
        const response = [
            {
                ...createApprovalMethod.dataValues,
                method_ids: [
                    createApprovalMethod.dataValues.id,
                    updateApprovalMethod.dataValues.id,
                    budgetAdjustmentApprovalMethod.dataValues.id
                ]
            }
        ];
        
        const sortedResponse = sortWorkflowMethods(response, false, workflows, moduleLower);
        console.log("sortedResponse is the ", sortedResponse);
        
        return reply.status(200).send({
            status_code: 200,
            message: "Workflow methods fetched successfully",
            workflow_method: sortedResponse,
        });
    } else {
        return reply.status(400).send({
            status_code: 400,
            message: "Required workflow methods not found"
        });
    }
}

// Handle timesheet module logic
async function handleTimesheetModule(workflowTriggerId: string | undefined, reply: FastifyReply, traceId: string) {
    const moduleId = await findModuleBySlug("timesheet");

    const eventId = await findEvent(moduleId, "submit_timesheet");
    const items = await findWorkflowMethods(moduleId, [eventId]);
    const submitApprovalMethod = findMethod(items, eventId, "approval");
    const workflows = await getWorkflows(workflowTriggerId);
    if (!workflows.length) {
        return reply.status(400).send({
            status_code: 400,
            message: "No workflows found for the given trigger ID",
            trace_id: traceId,
        });
    }

    if (submitApprovalMethod) {
        const response = [
            {
                ...submitApprovalMethod.dataValues,
                method_ids: [submitApprovalMethod.dataValues.id]
            }
        ];

        const sortedResponse = sortWorkflowMethods(response, false, workflows);
        return reply.status(200).send({
            status_code: 200,
            message: "Workflow methods fetched successfully",
            workflow_method: sortedResponse,
        });
    } else {
        return reply.status(400).send({
            status_code: 400,
            message: "Required workflow methods not found"
        });
    }
}

// Handle candidate rehire check module logic
async function handleCandidateRehireCheckModule(workflowTriggerId: string | undefined, reply: FastifyReply, traceId: string) {
    const moduleId = await findModuleBySlug("submission");
    
    const eventId1 = await findEvent(moduleId, "submit_candidate_rehire_check");
    // const eventId2 = await findEvent(moduleId, "submit_candidate_shortlist");
    
    const item = await findWorkflowMethods(moduleId, [eventId1]);
    
    const rehireReviewMethod = findMethod(item, eventId1, "review");
    // const shortlistReviewMethod = findMethod(item, eventId2, "review");
    const rehireApprovalMethod = findMethod(item, eventId1, "approval");
    
    let response: { [key: string]: any }[] = [];
    
    if (rehireReviewMethod && rehireApprovalMethod) {
        response = [
            { ...rehireApprovalMethod.dataValues },
            {
                ...rehireReviewMethod.dataValues,
                method_ids: [
                    rehireReviewMethod.dataValues.id,
                    // shortlistReviewMethod.dataValues.id
                ],
            },
        ];
    } else if (rehireReviewMethod || rehireApprovalMethod) {
        response = [
            { ...rehireReviewMethod?.dataValues || rehireApprovalMethod?.dataValues,
                method_ids: [
                    rehireReviewMethod.dataValues.id,
                    // shortlistReviewMethod.dataValues.id
                ]
             }
        ];
    }
    
    const workflows = await getWorkflows(workflowTriggerId);
    
    if (!workflows.length) {
        return reply.status(400).send({
            status_code: 400,
            message: "No workflows found for the given trigger ID",
            trace_id: traceId,
        });
    }
    
    const workflowMethodIds = workflows.map((workflow) => workflow.method_id);
    const responses = response.filter((i) => workflowMethodIds.includes(i.id));
    
    const sortedResponse = sortWorkflowMethods(responses, false, workflows);
    
    return reply.status(200).send({
        status_code: 200,
        message: "Workflow methods fetched successfully",
        workflow_method: sortedResponse,
        trace_id: traceId,
    });
}

// Handle other modules logic
async function handleOtherModules(workflowTriggerId: string | undefined, module: string, reply: FastifyReply, traceId: string) {
    const moduleId = await findModuleBySlug(module === 'submit_candidate_shortlist' ? "submission" : "candidates");

    let eventId: string | undefined;

    if (module === 'submit_candidate_shortlist') {
        eventId = await findEvent(moduleId, "submit_candidate_shortlist");
    } else if (module === 'candidate') {
        eventId = await findEvent(moduleId, "locum_name_clear");
    }

    if (!eventId) {
        return reply.status(400).send({
            status_code: 400,
            message: `No event found for module: ${module}`,
            trace_id: traceId,
        });
    }

    const item = await findWorkflowMethods(moduleId, [eventId]);
    const reviewMethod = findMethod(item, eventId, "review");
    let response: { [key: string]: any }[] = [];
    if (reviewMethod) {
        response = [
            { ...reviewMethod.dataValues,
                method_ids: [reviewMethod.dataValues.id]
             }
        ];
    } else if (item && item.length > 0) {
        response = item.map((i) => ({ ...i.dataValues ,   method_ids: [
            i.dataValues.id
        ] }));
    }
    const workflows = await getWorkflows(workflowTriggerId);
    if (!workflows.length) {
        return reply.status(400).send({
            status_code: 400,
            message: "No workflows found for the given trigger ID",
            trace_id: traceId,
        });
    }
    const workflowMethodIds = workflows.map((workflow) => workflow.method_id);
    const responses = response.filter((i) => workflowMethodIds.includes(i.id));
    const sortedResponse = sortWorkflowMethods(responses, false, workflows);
    return reply.status(200).send({
        status_code: 200,
        message: "Workflow methods fetched successfully",
        workflow_method: sortedResponse,
        trace_id: traceId,
    });
}