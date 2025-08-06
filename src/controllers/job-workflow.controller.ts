import { FastifyRequest, FastifyReply } from 'fastify';
import JobWorkFlowModel from '../models/job-workflow.model';
import generateCustomUUID from '../utility/genrateTraceId';
import { JobWorkFlow, Recipient, Users, Workflow } from '../interfaces/job-workflow.interface';
import { sequelize } from '../config/instance';
import { Op, QueryTypes } from 'sequelize';
import WorkflowStatusHistory from '../models/workflow-status-history.model';
import { Module } from '../models/module.model';
import Event from '../models/event.model';
import { decodeToken } from '../middlewares/verifyToken';
import { logger } from '../utility/loggerService';
import { NotificationDataPayload } from "../interfaces/noifications-data-payload.interface";
import { EmailRecipient } from "../interfaces/email-recipient";
import { sendNotification } from '../utility/notificationService';
import { FetchUsersBasedOnHierarchy, formatCurrencyAmount, formatDatesByHierarchy, getAssignmentDetails, getJobDetails, getOfferDetails, getProgramVendorsEmail, getReasonById, getSubmissionData, getWorkflowDetails, isVendorRequired } from "../utility/notification-helper";
import sendNotificationModel from '../models/send-notifications-log.model';
import axios from 'axios';
import { databaseConfig } from '../config/db';
import { NotificationEventCode } from '../utility/notification-event-code';
import WorkflowTriggeredLevel from '../models/workflow-triggering-level-model';
import WorkflowTriggeredRecipientType from '../models/workflow-triggered-recipient-type.model';
import { createJobHistory, getUpdatedJobStatus } from '../utility/job-history';

const AUTH_BASE_URL = databaseConfig.config.auth_url;
let SOURCE_BASE_URL = databaseConfig.config.sourcing_url
let TEAI_BASE_URL = databaseConfig.config.teai_url
let SOW_BASE_URL = databaseConfig.config.sow_url
let ui_base_url = databaseConfig.config.ui_base_url;

export const createJobWorkFlow = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    const workflow = request.body as JobWorkFlow;
    const traceId = generateCustomUUID();
    const { program_id } = request.params;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ message: "Unauthorized - Invalid token" });
    }
    const userId = user?.sub;

    const workflowData = {
        ...workflow,
        program_id,
        created_by: userId,
        updated_by: userId,
    };

    logger({
        trace_id: traceId,
        actor: { user_name: user?.preferred_username, user_id: userId },
        data: request.body,
        eventname: "creating job workflow",
        status: "in_progress",
        description: `Creating job workflow for program ID: ${program_id}`,
        level: "info",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
    }, JobWorkFlowModel);

    try {
        const createdWorkflow = await JobWorkFlowModel.create(workflowData);

        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: request.body,
            eventname: "created job workflow",
            status: "success",
            description: `Created job workflow for program ID: ${program_id} successfully: ${createdWorkflow.id}`,
            level: "success",
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false,
        }, JobWorkFlowModel);

        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            id: createdWorkflow.id,
            message: 'Workflow created successfully.',
        });
    } catch (error) {
        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: request.body,
            eventname: "creating job workflow",
            status: "error",
            description: `Error creating job workflow for program ID: ${program_id}`,
            level: "error",
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false,
        }, JobWorkFlowModel);
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while creating job workflow.',
            trace_id: traceId,
            error: (error as any).message,
        });
    }
};


export const getAllJobWorkFlow = async (
    request: FastifyRequest<{
        Querystring: { page?: number; limit?: number; workflow_id?: string; method_id?: string; event_id?: string, module: string, job_id: string, module_id?: string },
        Params: { program_id: string }
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params;

    const { page = 1, limit = 10, workflow_id, method_id, event_id, module, job_id, module_id } = request.query;
    const offset = (page - 1) * limit;

    try {
        const whereCondition: any = {
            program_id,
            is_deleted: false,
            ...(workflow_id && { workflow_id }),
            ...(method_id && { method_id }),
            ...(event_id && { event_id }),
            ...(module && { module: module_id }),
            ...(job_id && { job_id }),

        };

        const { rows: workflows, count } = await JobWorkFlowModel.findAndCountAll({
            where: whereCondition,
            limit,
            offset,
        });

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Job workflow fetched successfully.',
            total: count,
            page,
            limit,
            job_workflow: workflows,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to fetch job workflow',
            trace_id: traceId,
            error,
        });
    }
};


export const getJobWorkFlowById = async (
    request: FastifyRequest<{ Params: { program_id: string; id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;

    try {
        const workflow = await JobWorkFlowModel.findAll({
            where: {
                id,
                program_id,
                is_deleted: false,
            }
        });

        if (!workflow) {
            return reply.status(400).send({
                status_code: 400,
                trace_id: traceId,
                message: 'Workflow data not found.',
                job_workflow: [],
            });
        }

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            job_workflow: workflow,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error.',
            trace_id: traceId,
        });
    }
};

async function findMatchingUsers(levels: any, userId: string) {
    const match_user: any = [];

    (levels || []).forEach((level: any) => {
        const placementOrder = level.placement_order;

        (level.recipient_types || []).forEach((recipient: any) => {
            if (recipient.status === 'pending') {
                const metaValues = Object.values(recipient.meta_data || {});
                if (metaValues.includes(userId)) {
                    match_user.push({
                        user_id: userId,
                        placement_order: placementOrder
                    });
                }
            }
        });
    });

    return match_user;
}

async function handleBypassForUser(levels: any[], userId: string) {
    const matchedUsers = await findMatchingUsers(levels, userId);
    for (const { user_id, placement_order } of matchedUsers) {
        const level = levels.find(l => l.placement_order === placement_order);
        if (!level || !level.recipient_types) continue;

        for (const recipient of level.recipient_types) {
            const metaValues = Object.values(recipient.meta_data || {});
            if (metaValues.includes(user_id) && recipient.status === 'pending') {
                if (recipient.behaviour?.toLowerCase() === 'any') {
                    for (const r of level.recipient_types) {
                        const metaValues = Object.values(r.meta_data || {});
                        if (metaValues.includes(user_id)) {
                            r.status = 'bypassed';
                        }else {
                            r.status = 'Not needed';
                        }
                    }
                    break;
                } else {
                    recipient.status = 'bypassed';
                }
            }
        }
    }

    for (const level of levels) {
        if (!level.recipient_types || level.recipient_types.length === 0) {
            level.status = 'completed';
            continue;
        }

        const behaviorOfLevel = level.recipient_types[0]?.behaviour?.toLowerCase();

        if (behaviorOfLevel === 'any' && level.status === 'pending') {
            const anyBypassed = level.recipient_types.some(
                (r: any) => r.status === 'bypassed'
            );
            level.status = anyBypassed ? 'bypassed' : level.status;
        } else if (level.status === 'pending') {
            const allBypassed = level.recipient_types.every(
                (r: any) => r.status === 'bypassed'
            );

            const allBypassedOrApproved = level.recipient_types.every(
                (r: any) => r.status === 'bypassed' || r.status === 'approved'
            );

            if (allBypassed) {
                level.status = 'bypassed';
            } else if (allBypassedOrApproved) {
                level.status = 'completed';
            }
        }
        else {
            level.status = level.status
        }
    }
    
    return levels;
}

export const updateWorkflowStatus = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body:
        | { placement_order: number; new_status: string; user_id?: string; notes?: string; behavior?: string, job_id?: string, hierarchy_ids?: any[], is_admin_override?: boolean }
        | { placement_order: number; new_status: string; user_id?: string; notes?: string; behavior?: string, job_id?: string, hierarchy_ids?: any[], is_admin_override?: boolean }[];

    }>,
    reply: FastifyReply
) => {

    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub
    const { program_id, id } = request.params;
    let updates = request.body as any;
    const job_id = Array.isArray(updates) ? updates[0]?.job_id : updates.job_id;

    // Convert to array if not already
    if (!Array.isArray(updates)) {
        updates = [updates];
    }

    // Validate input parameters
    if (!program_id || !id || updates?.length === 0) {
        return reply.status(400).send({
            status_code: 400,
            message: "Invalid request: program_id, id, and at least one update are required.",
            trace_id: traceId,
        });
    }

    // Function to check if user is active
    const isUserActive = async (userId: string) => {
        if (!userId) return false;
        
        try {
            const userQuery = `
        SELECT  status FROM user WHERE user_id = :userId AND LOWER(status) = 'active';`;
            const user: any = await sequelize.query(userQuery, {
                replacements: { userId },
                type: QueryTypes.SELECT,
            });
            console.log('user status check:', user);
            return user && user?.[0]?.status?.toLowerCase() === 'active';
        } catch (error) {
            console.error('Error checking user active status:', error);
            return true; // Default to active if there's an error to prevent automatic approvals
        }
    };
    
    // Function to get user IDs from all recipients in a level
    const getUserIdsFromLevel = (level: any) => {
        const userIds: string[] = [];
        
        if (level && level.recipient_types) {
            level.recipient_types?.forEach((recipient: any) => {
                let userId = recipient?.replaced_by;
                if (!userId && recipient?.meta_data) {
                    const metaValues = Object.values(recipient?.meta_data);
                    const potentialId = metaValues.find((val: any) => typeof val === 'string');
                    if (potentialId) userId = potentialId as string;
                }
                
                if (userId) userIds.push(userId);
            });
        }
        
        return userIds;
    };
    
    // Function to check all users' active status for a level
    const checkAllUsersActiveStatus = async (level: any) => {
        const userIds = getUserIdsFromLevel(level);
        const activeStatus: Record<string, boolean> = {};
        
        // Get active status for all users in parallel
        await Promise.all(userIds.map(async (userId) => {
            activeStatus[userId] = await isUserActive(userId);
        }));
        
        return activeStatus;
    };

    try {
        const userResult = await getUsersStatus(sequelize, userId, program_id);
        let userData = userResult[0] as any
        let impersonator_id: any
        if (user.impersonator) {
            impersonator_id = user?.impersonator.id || null
        }
        const workflow: any = await JobWorkFlowModel.findOne({ where: { id, program_id } });
   

        if (!workflow) {
            return reply.status(404).send({
                status_code: 404,
                message: "Workflow data not found!",
                trace_id: traceId,
            });
        }

        const workflowTriggerId = workflow?.dataValues?.workflow_trigger_id;
        const oldAssignmentData = workflowTriggerId
        ? await getAssignmentDetails(workflowTriggerId, program_id, token)
        : null;
        const oldAmount = oldAssignmentData?.data?.finance?.gross_allocated_budget || 0;

        // let managerData: any = await getManagerDetails(program_id, id)
        let levels = workflow.levels || [];
        let updatedLevels = false;

        // Check active status only for pending levels
        const allLevelsActiveStatus: Record<number, Record<string, boolean>> = {};
        
        // First, collect active status for all users in pending levels only
        await Promise.all(levels.filter((level:any) => level.status === 'pending').map(async (level: any) => {
            const levelOrder = level?.placement_order || 0;
            allLevelsActiveStatus[levelOrder] = await checkAllUsersActiveStatus(level);
            console.log(`Active status for pending level ${levelOrder}:`, allLevelsActiveStatus[levelOrder]);
        }));

        for (const { placement_order, new_status, user_id, notes, behavior, job_id, hierarchy_ids, is_admin_override } of updates) {
            let levelFound = false;

            levels = await Promise.all( 
                levels.map(async (level: any) => {
                    // Skip inactive user checks for non-pending levels
                    if (level.status !== 'pending' && level.placement_order !== placement_order) {
                        return level;
                    }
                    
                    const levelOrder = level?.placement_order || 0;
                    const levelActiveStatus = allLevelsActiveStatus[levelOrder] || {};

                    if (level?.placement_order === placement_order) {
                        levelFound = true;
                        updatedLevels = true;

                        const updatedRecipientTypes = await Promise.all(
                            level.recipient_types.map(async (recipient: any) => {
                                const userId = recipient?.replaced_by || 
                                    (recipient?.meta_data ? Object.values(recipient?.meta_data).find((id: any) => typeof id === 'string') : null);
                                
                                // Check if user is inactive - use precomputed active status
                                let userActive = true;
                                if (userId && levelActiveStatus[userId] !== undefined) {
                                    userActive = levelActiveStatus[userId];
                                } else if (userId) {
                                    // Fallback if not in precomputed map
                                    userActive = await isUserActive(userId);
                                }
                                
                                // Check for inactive users with pending status
                                if (!userActive && recipient.status === 'pending') {
                                    // Create history record for auto-approval
                                    const history = await WorkflowStatusHistory.create({
                                        job_workflow_id: id,
                                        placement_order,
                                        new_status: "approved",
                                        program_id,
                                        notes: "Auto-approved: User is inactive",
                                        created_on: Date.now(),
                                        user_id: userId,
                                    });
                                    
                                    return {
                                        ...recipient,
                                        status: "approved",
                                        status_id: history.dataValues?.id,
                                        status_by: userId,
                                        impersonate_by: impersonator_id,
                                        updated_on: Date.now(),
                                        actor_first_name: userData?.first_name,
                                        actor_last_name: userData?.last_name,
                                        actor_by_avatar: userData?.avatar,
                                        is_admin_override: is_admin_override,
                                        auto_approved: true,
                                        notes: "Auto-approved: User is inactive"
                                    };
                                }

                                // Check user type - Fixed comparison operator
                                const isSuperUser = user?.userType === "super_user";

                                if (!isSuperUser && behavior?.toLowerCase() === "any".toLowerCase() && level.placement_order === placement_order) {
                                    // Check if the recipient's user_id matches any value in meta_data
                                    const matchesUser = recipient?.replaced_by
                                            ? user_id === recipient?.replaced_by
                                            : Object.values(recipient?.meta_data).includes(user_id);
                                    if (matchesUser) {
                                        const history = await WorkflowStatusHistory.create({
                                            job_workflow_id: id,
                                            placement_order,
                                            new_status: "approved", // Force "approved" for the matching user
                                            program_id,
                                            notes: notes || "",
                                            created_on: Date.now(),
                                            user_id: userId, // Store the current user who is making the decision
                                        });

                                        return {
                                            ...recipient,
                                            status: "approved",
                                            status_by: userId,
                                            impersonate_by: impersonator_id,
                                            updated_on: Date.now(),
                                            status_id: history.dataValues?.id,
                                            actor_first_name: userData?.first_name,
                                            actor_last_name: userData?.last_name,
                                            actor_by_avatar: userData?.avatar,
                                            is_admin_override: is_admin_override,
                                            by: `${userData?.first_name} ${userData?.last_name}`,
                                            notes: notes || "",
                                        };
                                    } else {
                                        // For non-matching users, mark as "Not needed" without creating history
                                        return {
                                            ...recipient,
                                            status: "Not needed",
                                            status_by: userId, // Track who triggered this change
                                            impersonate_by: impersonator_id,
                                            updated_on: Date.now(),
                                        };
                                    }
                                } else if (isSuperUser) {
                                    if (behavior?.toLowerCase() === "any" && level.placement_order === placement_order) {
                                        // Check if the recipient's user_id matches any value in meta_data
                                        const matchesUser = recipient?.replaced_by
                                            ? user_id === recipient?.replaced_by
                                            : Object.values(recipient?.meta_data).includes(user_id);
                                        const history = await WorkflowStatusHistory.create({
                                            job_workflow_id: id,
                                            placement_order,
                                            new_status,
                                            program_id,
                                            notes: notes || "",
                                            created_on: Date.now(),
                                            user_id: user_id,
                                        });
                                        return {
                                            ...recipient,
                                            status: "approved",
                                            impersonate_by: impersonator_id,
                                            updated_on: Date.now(),
                                            status_id: history.dataValues?.id,
                                            actor_first_name: userData?.first_name,
                                            actor_last_name: userData?.last_name,
                                            actor_by_avatar: userData?.avatar,
                                            is_admin_override: is_admin_override,
                                            notes: notes || "",
                                        };
                                    }
                                }

                                // Check if user is not a "super_user" and proceed with matching
                                if (!isSuperUser) {
                                    if (user_id) {
                                        // If the recipient has a `replaced_by` field, match `user_id` directly
                                        if (recipient?.replaced_by && recipient?.replaced_by === user_id) {
                                            const history = await WorkflowStatusHistory.create({
                                                job_workflow_id: id,
                                                placement_order,
                                                new_status,
                                                program_id,
                                                notes: notes || "",
                                                created_on: Date.now(),
                                                user_id: user_id,
                                            });
                                            return {
                                                ...recipient,
                                                status: new_status,
                                                status_id: history?.dataValues.id,
                                                imporsonate_by: impersonator_id,
                                                actor_first_name: userData?.first_name,
                                                actor_last_name: userData?.last_name,
                                                actor_by_avatar: userData?.avatar,
                                                is_admin_override:is_admin_override,
                                                updated_on: Date.now(),
                                                notes: notes || "",
                                            };
                                        }

                                        // If the recipient does not have `replaced_by`, check `meta_data`
                                        if (!recipient.replaced_by && recipient?.meta_data) {
                                            const matchesUser = recipient?.replaced_by
                                                    ? user_id === recipient?.replaced_by
                                                    : Object.values(recipient?.meta_data).includes(user_id);
                                            if (matchesUser) {
                                                const history = await WorkflowStatusHistory.create({
                                                    job_workflow_id: id,
                                                    placement_order,
                                                    new_status,
                                                    program_id,
                                                    notes: notes || "",
                                                    created_on: Date.now(),
                                                    user_id: user_id,
                                                });
                                                return {
                                                    ...recipient,
                                                    status: new_status,
                                                    status_id: history?.dataValues?.id,
                                                    imporsonate_by: impersonator_id,
                                                    actor_first_name: userData?.first_name,
                                                    actor_last_name: userData?.last_name,
                                                    actor_by_avatar: userData?.avatar,
                                                    is_admin_override: is_admin_override,
                                                    updated_on: Date.now(),
                                                    notes: notes || "",
                                                };
                                            }
                                        }
                                    }
                                } else {
                                    // If user is a super_user, update status regardless
                                    const history = await WorkflowStatusHistory.create({
                                        job_workflow_id: id,
                                        placement_order,
                                        new_status,
                                        program_id,
                                        notes: notes || "",
                                        created_on: Date.now(),
                                        user_id: user_id,
                                    });
                                    return {
                                        ...recipient,
                                        status: new_status,
                                        status_id: history?.dataValues?.id,
                                        imporsonate_by: impersonator_id,
                                        actor_first_name: userData?.first_name,
                                        actor_last_name: userData?.last_name,
                                        actor_by_avatar: userData?.avatar,
                                        updated_on: Date.now(),
                                        is_admin_override: is_admin_override,
                                        notes: notes || "",
                                    };
                                }

                                // If no match, return original recipient
                                return recipient;
                            })
                        );

                        // Determine the level status
                        const allApproved = updatedRecipientTypes.every(
                            (recipient: any) => recipient.status.toLowerCase() === "approved" || 
                            recipient.status.toLowerCase() === "not needed" ||  
                            recipient.status.toLowerCase() === "bypassed"
                        );
                        return {
                            ...level,
                            status: allApproved ? "completed" : "pending",
                            recipient_types: updatedRecipientTypes,
                        };
                    }
                    if (is_admin_override) {
                        const slicedLevels = levels.slice(1);

                        slicedLevels.forEach((level: any) => {
                            if (level?.status?.toLowerCase() !== "completed" || level?.status?.toLowerCase() !== "bypassed") {
                                level.recipient_types = level.recipient_types.map((recipient: any) =>
                                    (recipient?.status?.toLowerCase() !== "approved" && recipient?.status?.toLowerCase() !== "not needed")
                                        ? {
                                            ...recipient,
                                            status: "approved",
                                            is_admin_override: is_admin_override,
                                            actor_first_name: userData?.first_name,
                                            actor_last_name: userData?.last_name,
                                            actor_by_avatar: userData?.avatar,
                                            imporsonate_by: impersonator_id,
                                            updated_on: Date.now(),
                                            notes: notes || "",
                                        }
                                        : recipient
                                );
                            }
                            
                            if(level.status.toLowerCase() ==='pending') {
                                level.status = "completed";
                            }

                        });
                    }
                    return level;
                })
            );

            const bypass_duplicate_approver = workflow.config?.bypass_duplicate_approver ?? false;
            if (bypass_duplicate_approver) {
                let levels = await handleBypassForUser(workflow.levels, user_id);
                workflow.levels = levels;
            };

            if (!levelFound) {
                throw new Error(`Placement order ${placement_order} not found in levels.`);
            }

            let allLevelsAfterFirstCompleted = true;
            let workflowStatus = "completed";

            // Loop through levels and process
            for (let i = 0; i < levels.length; i++) {
                const level = levels[i];
                const isValidLevel = level.recipient_types &&
                    level?.recipient_types?.length > 0 &&
                    level?.recipient_types?.every((recipient: any) => {
                        return recipient.meta_data !== null && recipient.meta_data !== undefined &&
                            Object.values(recipient.meta_data).every(value => value !== null);
                    });


                if (!isValidLevel) {
                    continue;
                }
                // If the level is valid (all meta_data are non-null), check the status
                if (level.status === "pending") {
                    allLevelsAfterFirstCompleted = false;
                }
            }
            // Set final workflow status based on valid levels
            workflowStatus = allLevelsAfterFirstCompleted ? "completed" : "pending";
            const is_updatedFlag = allLevelsAfterFirstCompleted ? true : false;

            // Update the workflow object
            workflow.status = workflowStatus;
            workflow.is_updated = is_updatedFlag;

            await workflow.update({ levels, status: workflowStatus, is_updated: is_updatedFlag, updated_on: Date.now(), updated_by: userId });

            let allPayload = {
                hierarchy_ids: hierarchy_ids,
                program_id: program_id,
            };

            if (workflowStatus === "completed") {
            
                await updatePendingApprovalStatus(request, reply, program_id, id, workflow, updates, user, userData)
                let eventCode = await getEventsCode(workflow);
                
                let allPayload = {
                    hierarchy_ids: hierarchy_ids || null,
                    program_id: program_id,
                    user_type: eventCode?.user_type || ''
                };
                let data = await handleJobWorkflowStatus(request, reply, workflowStatus, workflow, updates, program_id, id, allPayload, eventCode, oldAmount );
                await updateWorkflowPreviousCompltedStatus(request, reply, workflow)
            }
        }
        

        if (!updatedLevels) {
            return reply.status(400).send({
                status_code: 400,
                message: "No levels updated. Please check the placement orders provided.",
                trace_id: traceId,
            });
        }
        const newStatus = (job_id && program_id && token)
            ? await getUpdatedJobStatus(job_id, program_id, token)
            : null;   
                  
              if (job_id && newStatus) {
               try {
                 await createJobHistory(
                   program_id,
                   job_id,
                   newStatus,
                   'Job Status Update',
                   token,
                   userId || '',      
                   { status: newStatus }
                 );
               } catch (error) {
                 console.error('Failed to create job history:', error);
               }
             }  
        return reply.status(200).send({
            status_code: 200,
            message: "Approved done successfully.",
            trace_id: traceId,
        });
    } catch (error) {
        console.error("Error updating workflow:", error);

        return reply.status(500).send({
            status_code: 500,
            message: "Failed to update workflow.",
            trace_id: traceId,
        });
    }
};
export async function updateWorkflowPreviousCompltedStatus(request: FastifyRequest, reply: FastifyReply, workflow: any) {
    try {
        const userQuery = `
        SELECT *
        FROM workflow
        WHERE workflow_trigger_id = :workflow_trigger_id
        AND status = 'completed'
        AND flow_type = 'Review'
        AND is_enabled = true;
        `;

        const workflowResult = await sequelize.query(userQuery, {
            type: QueryTypes.SELECT,
            replacements: { workflow_trigger_id: workflow.workflow_trigger_id },
        });

        // Check if workflow data exists
        let workflowData: any = workflowResult[0];

        if (workflowData) {
            // Now use Sequelize to find the workflow record and update it
            const updatedWorkflow = await JobWorkFlowModel.findOne({
                where: { id: workflowData.id }
            });

            if (updatedWorkflow) {
                // Update the record
                await updatedWorkflow.update({
                    is_updated: true
                });

            }
        }


    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: "Failed to update job workflow.",

        });
    }
}
export async function getUsersStatus(sequelize: any, userId: any, program_id: any) {

    const userQuery = `
        SELECT user_id, status,first_name,last_name,avatar
        FROM user
        WHERE user_id IN (:userId)
          AND LOWER(status) = 'active';`;

    const users = await sequelize.query(userQuery, {
        type: QueryTypes.SELECT,
        replacements: { userId },
    });

    return users.map((user: any) => ({
        user_id: user.user_id || null,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        avatar: user.avatar?.url || null,
        status: user.status || null,
    }));
}
export async function updatePendingApprovalStatus(request: FastifyRequest, reply: FastifyReply, program_id: any, id: any, workflow: any, updates: any, user: any, userData: any) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ message: 'Unauthorized - Token not found' });
        }

        const token = authHeader.split(' ')[1];
        const user = await decodeToken(token);
        const body = request.body as any

        if (!user) {
            return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
        }
        const moduleType = workflow.module_type?.toLowerCase();
        if (moduleType === "job".toLowerCase() || moduleType === "jobs".toLowerCase()) {
            const job_id = workflow.workflow_trigger_id;
            
            const getJob = `${SOURCE_BASE_URL}/v1/api/program/${program_id}/job/${job_id}`;
            const jobResponse = await axios.get(getJob, {
                headers: {
                    'Content-Type': 'application/json',
                    authorization: authHeader
                }
            });
            const jobStatus= jobResponse.data.job.status == "PENDING_APPROVAL_SOURCING" ?
                             "SOURCING" : "OPEN";
                             
            const apiUrl = `${SOURCE_BASE_URL}/v1/api/program/${program_id}/job-status/${job_id}`;
            const payload = {
                status: jobStatus,
            };
            console.log(apiUrl);
             try {
                let a = await axios.put(apiUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: authHeader
                    },
                });
             } catch (error) {
                console.log('error is nowwww', error)
                
             }



        } else
            if (moduleType === "offer".toLowerCase() || moduleType === "offers".toLowerCase()) {
                if (workflow?.events?.toLowerCase() === "counter_offer") {
                    const offer_id = workflow.workflow_trigger_id;
                    const apiUrl = `${SOURCE_BASE_URL}/v1/api/program/${program_id}/offer/${offer_id}`;
                    const payload = {
                        status: "APPROVE",
                    };
                    await axios.put(apiUrl, payload, {
                        headers: {
                            'Content-Type': 'application/json',
                            authorization: authHeader
                        },
                    });
                } else {
                    const offer_id = workflow.workflow_trigger_id;
                    const apiUrl = `${SOURCE_BASE_URL}/v1/api/offer-release/program/${program_id}/offer/${offer_id}`;
                    const payload = {
                        status: "Pending Acceptance",
                    };
                    await axios.put(apiUrl, payload, {
                        headers: {
                            'Content-Type': 'application/json',
                            authorization: authHeader
                        },
                    });
                }
            } else
                if (moduleType === "Submissions".toLowerCase()) {
                    const submission_id = workflow.workflow_trigger_id;
                    const workflowID = workflow?.id;
                    const apiUrl = `${SOURCE_BASE_URL}/v1/api/update-submission-status/program/${program_id}/submission-candidate/${submission_id}`;
                    const payload = {
                        status: "shortlisted",
                        updates,
                        workflowID,
                        user,
                        userData
                    };

                    await axios.put(apiUrl, payload, {
                        headers: {
                            'Content-Type': 'application/json',
                            authorization: authHeader
                        },
                    });

                } else
                    if (moduleType === "Assignment".toLowerCase()) {
                        const assignment_id = workflow.workflow_trigger_id;
                        const apiUrl = `${TEAI_BASE_URL}/assignment/v1/program/${program_id}/assignments/${assignment_id}/update-status`;
                        const payload = { status: "approved", display_status: 'approved', notes: body?.notes};
                        await axios.put(apiUrl, payload, {
                            headers: {
                                'Content-Type': 'application/json',
                                authorization: authHeader
                            },
                        });
                    } else
                        if (moduleType === "Timesheet".toLowerCase()) {
                            try {
                                const timesheet_id = workflow.workflow_trigger_id;
                                let apiUrl = `${TEAI_BASE_URL}/timesheet/v1/program/${program_id}/timesheet/${timesheet_id}/approval`;
                            //    status: "approved"
                                const payload = {  };
                                await axios.put(apiUrl, payload, {
                                    headers: {
                                        'Content-Type': 'application/json',
                                        authorization: authHeader
                                    },
                                });   
                            } catch (error) {
                                 console.log('errro is noowww', error);
                            }
             
                        } else
                            if (moduleType === "Sow".toLowerCase() || moduleType === "Statement of Work".toLowerCase()) {
                                if (workflow?.events?.toLowerCase() === "create_sow" || workflow?.events?.toLowerCase() === "update_sow") {
                                    try {
                                        console.log('Calling sow api heree', SOW_BASE_URL)
                                        const sow_id = workflow.workflow_trigger_id;
                                        let apiUrl = `${SOW_BASE_URL}/v1/api/program/${program_id}/sow/${sow_id}/update-status`;
                                        const payload = { status: "approved" };
                                        let res = await axios.put(apiUrl, payload, {
                                            headers: {
                                                'Content-Type': 'application/json',
                                                authorization: authHeader
                                            },
                                        });
                                        console.log(' response from sow api', res)
                                    } catch (error) {
                                        console.log('errro is noowww', error);
                                    }
                                } else {
                                    try {
                                        console.log('Calling sow api heree', SOW_BASE_URL)
                                        const payload_id = workflow.workflow_trigger_id;
                                        let apiUrl = `${SOW_BASE_URL}/v1/api/program/${program_id}/payment-request/${payload_id}`;
                                        const payload = { status: "approved" };
                                        let res = await axios.put(apiUrl, payload, {
                                            headers: {
                                                'Content-Type': 'application/json',
                                                authorization: authHeader
                                            },
                                        });
                                        console.log(' response from sow api', res)
                                    } catch (error) {
                                        console.log('errro is noowww', error);
                                    }
                                }
                            }

    } catch (error) {
        console.error('error while updating status:', error);
        return reply.status(500).send({ message: 'Internal Server Error' });
    }
}
export async function updateRejectStatusInAllWorkflowModule(request: FastifyRequest, reply: FastifyReply, program_id: any, id: any, workflow: any , updates: any) {
    const body = request.body as any
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ message: 'Unauthorized - Token not found' });
        }

        const token = authHeader.split(' ')[1];
        const user = await decodeToken(token);

        if (!user) {
            return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
        }
        const moduleType = workflow.module_type?.toLowerCase();
        if (moduleType === "job".toLowerCase() || moduleType === "jobs".toLowerCase()) {
            const job_id = workflow.workflow_trigger_id;
            const apiUrl = `${SOURCE_BASE_URL}/v1/api/program/${program_id}/job-status/${job_id}`;
            const payload = {
                status: "REJECTED",
            };

            await axios.put(apiUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    authorization: authHeader
                },
            });
        } else if (moduleType === "offer".toLowerCase() || moduleType === "offers".toLowerCase()) {
            const offer_id = workflow.workflow_trigger_id;
            const apiUrl = `${SOURCE_BASE_URL}/v1/api/program/${program_id}/offer/${offer_id}`;
            const payload = {
                status: "Rejected",
                reason:body?.reason
            };

            await axios.put(apiUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    authorization: authHeader
                },
            });
        } else
            if (moduleType === "Submissions".toLowerCase()) {
                const submission_id = workflow.workflow_trigger_id;
                const apiUrl = `${SOURCE_BASE_URL}/v1/api/program/${program_id}/submission-candidate/${submission_id}`;
                const payload = {
                    status: "Rejected",
                    update: updates
                };

                await axios.put(apiUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: authHeader
                    },
                });
            }
            else if (moduleType === "Assignment".toLowerCase()) {
                const assignment_id = workflow.workflow_trigger_id;
                const apiUrl = `${TEAI_BASE_URL}/assignment/v1/program/${program_id}/assignments/${assignment_id}/update-status`;
                const payload = {
                    status: "rejected",
                    display_status: "rejected",
                    reason: body?.reason,
                    notes: body?.notes
                };

                await axios.put(apiUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: authHeader
                    },
                });

            } else if (moduleType === "timesheet".toLowerCase()) {
                const timesheet_id = workflow.workflow_trigger_id;
                const body = Array.isArray(updates) ? updates[0] : updates;
                const apiUrl = `${TEAI_BASE_URL}/timesheet/v1/program/${program_id}/timesheet/${timesheet_id}/rejection`;
                const payload = {
                    rejection_reason: body?.reason || '',
                    rejection_note: body?.notes || ''
                };

                await axios.put(apiUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        authorization: authHeader
                    },
                });

            }else if (moduleType === "Sow".toLowerCase() || moduleType === "Statement of Work".toLowerCase()) {
                                try {
                                    console.log('Calling sow api heree', SOW_BASE_URL)
                                    const sow_id = workflow.workflow_trigger_id;
                                     let apiUrl = `${SOW_BASE_URL}/v1/api/program/${program_id}/sow/${sow_id}/update-status`;
                                    const payload = {status: "rejected"}; 
                                   let res= await axios.put(apiUrl, payload, {
                                        headers: {
                                            'Content-Type': 'application/json',
                                            authorization: authHeader
                                        },
                                    });
                                    console.log(' response from sow api', res)
                                } catch (error) {
                                    console.log('errro is noowww', error);
                                }
                            }

    } catch (error) {
        console.error(error);
        return reply.status(500).send({ message: 'Internal Server Error' });
    }
}
async function handleJobWorkflowStatus(request: FastifyRequest, reply: FastifyReply, workflowStatus: any, workflow: any, updates: any, program_id: any, id: any, allPayload: any, eventCode: any, oldAmount:any) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    (async () => {

        const userQuery = `
        SELECT user_id, user_type,email
        FROM user
        WHERE user_id = :user_id
        AND LOWER(status) = 'active'
        LIMIT 1
    `;

        const userData: any = await sequelize.query(userQuery, {
            type: QueryTypes.SELECT,
            replacements: { user_id: user.sub },
        });
              let workflowDetails = workflow?.dataValues?.id
              ? await getWorkflowDetails(sequelize, workflow?.dataValues?.id)
              : null;

              const eventCodeStr = String(eventCode?.eventCode ?? '');
              const isOfferEvent = eventCodeStr?.includes('OFFER');
              const isAssignmentEvent = [
              "BUDGET_INCREASE_APPROVED",
              "BUDGET_REDUCED_APPROVAL",
              "BUDGET_INCREASE_REJECTED",
              "ASSIGNMENT_MODIFIED_REJECTED"
              ]?.includes(eventCode?.eventCode) || eventCode?.eventCode?.toLowerCase()?.includes("assignment");

              const offerData = isOfferEvent && workflow?.dataValues?.workflow_trigger_id
              ? await getOfferDetails(workflow?.dataValues?.workflow_trigger_id, program_id, token)
              : null;

              const jobDatas = workflow?.dataValues?.job_id
              ? await getJobDetails(workflow?.dataValues?.job_id, program_id, token)
              : null;

              const workflowTriggerId = workflow?.dataValues?.workflow_trigger_id;
              const assignmentData = isAssignmentEvent && workflowTriggerId
              ? await getAssignmentDetails(workflowTriggerId, program_id, token)
              : null;
              const newBudget = assignmentData?.data?.finance?.gross_allocated_budget || 0;
              const requestedAmount = (oldAmount != null && newBudget != null) ? Math.abs(oldAmount - newBudget) : 0;
              const currency = assignmentData?.data?.finance?.currency ?? "USD";
              const assignment = assignmentData?.data?.assignment;
              const { start_date, end_date } = await formatDatesByHierarchy(
                assignment?.primary_hierarchy?.id,
                assignment?.start_date,
                  assignment?.end_date
        );
        
        const reasonData = await getReasonById(updates[0]?.request_reason);
        let userType = userData[0]
        if (userType?.user_type?.toLowerCase() == "msp".toLowerCase() || userType?.user_type?.toLowerCase() == "client".toLowerCase() || user.userType?.toLowerCase() == "super_user".toLowerCase()) {

            // Fetch manager details
            let managerData: any = await getManagerDetails(program_id, id);
            const submissionData = await getSubmissionData(workflow?.dataValues?.candidate_id, program_id, token);
            const payload = {
                user_type: user?.userType,
                job_id: jobDatas?.data?.job?.job_id || "",
                job_url: jobDatas
                    ? `${ui_base_url}/jobs/job/view/${jobDatas?.data?.job?.id}/${jobDatas?.data?.job?.job_template_id}?detail=job-details`
                    : '',
                submission_id: submissionData?.data?.submission_candidate?.unique_id || "",
                sourcing_url: submissionData
                    ? `${ui_base_url}/jobs/view-submit/${submissionData?.data?.submission_candidate?.candidate_id}/job/${jobDatas?.data?.job?.id}?submission_id=${submissionData?.data?.submission_candidate?.id}&detail=submission`
                    : "",
                assignment_reject_reason: reasonData || "",
                assignment_effective_date: updates?.[0]?.effective_date || "",
                assignment_note: updates?.[0]?.request_notes || "",
                candidate_first_name: workflowDetails?.first_name || "",
                candidate_last_name: workflowDetails?.last_name || "",
                offer_id: offerData?.data?.offer?.offer_code || "",
                offer_url: offerData?.data?.offer.candidate_id ? `${ui_base_url}/jobs/view-submit/${offerData?.data?.offer?.candidate_id}/job/${offerData?.data?.offer?.id}?offerId=${offerData?.data?.id}&detail=offer` : "",
                assignment_title_name: assignmentData?.data?.assignment?.source_details?.title ?? "",
                assignment_id: assignmentData?.data?.assignment?.code ?? "",
                source_id: assignmentData?.data?.assignment?.code ?? "",
                duration: start_date && end_date ? `${start_date} to ${end_date}` : "",
                currency: assignmentData?.data?.finance?.currency ?? "USD",
                remaining_budget_amount: await formatCurrencyAmount(currency, assignmentData?.data?.finance?.net_allocated_budget ?? 0),
                budget_amount: await formatCurrencyAmount(currency, requestedAmount),
                worker_name: `${assignment?.worker?.candidate?.candidate_first_name ?? ''} ${assignment?.worker?.candidate?.candidate_last_name ?? ''}`,
                assignment_manager_name: `${assignment?.assignment_manager?.first_name ?? ''} ${assignment?.assignment_manager?.last_name ?? ''}`,
                assignment_url: assignment?.uuid ? `${ui_base_url}/assignment/view/${assignment.uuid}` : '',
            
            };
            const recipientEmailArray: EmailRecipient[] = [];
            // Prepare and send notification for manager data
            if (managerData && managerData?.data && managerData?.data?.email) {

                const recipeintEmail: EmailRecipient = {
                    email: managerData?.data?.email,
                    first_name: managerData?.data?.first_name,
                    last_name: managerData?.data?.last_name
                }
                recipientEmailArray.push(recipeintEmail);

            } else {
                console.log("Manager data is missing or email not found.");
            }
            let mspUserData: any = await FetchUsersBasedOnHierarchy(sequelize, allPayload);
            const vendorExistence = await isVendorRequired(eventCode?.eventCode);
            if (vendorExistence === true) {
                program_id ? mspUserData.push(...(await getProgramVendorsEmail(program_id))) : null;
            }
            // Check if mspUserData is an array and send emails to each user
            if (Array.isArray(mspUserData) && mspUserData.length > 0) {
                for (const user of mspUserData) {
                    const recipeintEmail: EmailRecipient = {
                        email: user?.email,
                        first_name: user?.first_name,
                        last_name: user?.last_name
                    }
                    recipientEmailArray.push(recipeintEmail);
                }

                const notificationPayload: NotificationDataPayload = {
                    program_id: program_id ?? "",
                    token,
                    traceId,
                    eventCode: eventCode?.eventCode,
                    recipientEmail: recipientEmailArray,
                    payload,
                    userId: user.sub ?? "",
                };
                
                if(notificationPayload?.eventCode?.toLowerCase() !== "counter_offer_approval_complete" || notificationPayload?.eventCode?.toLowerCase() !== "timesheet_submitted"){
                    console.log("Enter in SendNotification IF");
                    sendNotification(notificationPayload);
                }


            } else {
                console.log("No MSP users found or no email available for notification.");
            }

        } else {
            console.log("User type is not CLIENT/MSP/SUPER_USER, skipping logic.");
        }
    })();
}

async function getEventsCode(workflow: { flow_type: any, events: any }) {
    let { flow_type, events } = workflow
    console.log(flow_type, events);

    if (flow_type == "Approval" && events === "create_job") {
        let response = {

            eventCode: NotificationEventCode.JOB_APPROVAL_COMPLETE,

            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events === "update_job") {
        let response = {

            eventCode: NotificationEventCode.JOB_UPDATE_APPROVAL,

            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events === "create_offer") {
        let response = {

            eventCode: NotificationEventCode.OFFER_APPROVAL_COMPLETE,

            user_type: ['msp']
        }
        return response;

    } else if (flow_type == "Approval" && events === "counter_offer") {
        let response = {

            eventCode: NotificationEventCode.COUNTER_OFFER_APPROVAL_COMPLETE,

            user_type: ['msp', 'vendor']
        }
        return response;

    } else if (flow_type == "Approval" && events === "submit_candidate_rehire_check") {
        let response = {

            eventCode: NotificationEventCode.REHIRE_APPROVAL_COMPLETE,

            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events === "create_assignment") {
        let response = {

            eventCode: NotificationEventCode.ASSIGNMENT_APPROVAL_COMPLETE,

            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events === "submit_timesheet") {
        let response = {

            eventCode: NotificationEventCode.SUBMIT_TIMESHEET,


            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events === "update_assignment") {
        let response = {

            eventCode: NotificationEventCode.ASSIGNMENT_MODIFIED_APPROVAL_COMPLETE,

            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events == "BUDGET_INCREASED" || events === "assignment_budget_adjustment" || events == "BUDGET_INCREASED1") {
        let response = {

            eventCode: NotificationEventCode.BUDGET_INCREASE_APPROVED,

            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events == "BUDGET_REDUCED" || events === "assignment_budget_adjustment") {
        let response = {

            eventCode: NotificationEventCode.BUDGET_REDUCED_APPROVAL,

            user_type: ['msp']
        }
        return response;
    }  if (flow_type == "Approval" && events === "create_sow") {
        let response = {
            eventCode: NotificationEventCode.CREATE_SOW,

            user_type: ['msp']
        }
        return response;
    } else {
    return null
        // throw new Error(`Event code not found for event: ${events}`);
    }

}
async function getRejectEventsCode(workflow: { flow_type: any, events: any }) {
    let { flow_type, events } = workflow
    console.log('event is niooww', events)
    if (flow_type == "Approval" && events === "create_job") {
        let response = {

            eventCode: NotificationEventCode.JOB_APPROVAL_REJECT,

            user_type: ['msp']
        }
        return response;
    } if (flow_type == "Review" && events === "create_job") {
        let response = {

            eventCode: NotificationEventCode.JOB_REVIEW_REJECT,

            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events === "update_job") {
        let response = {

            eventCode: NotificationEventCode.JOB_UPDATE_APPROVAL_REJECTED,

            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Review" && events === "update_job") {
        let response = {

            eventCode: NotificationEventCode.JOB_UPDATE_REVIEW_REJECT,

            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Review" && events === "create_offer") {
        let response = {

            eventCode: NotificationEventCode.OFFER_REVIEW_REJECT,

            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events === "create_offer") {
        let response = {

            eventCode: NotificationEventCode.OFFER_APPROVAL_REJECT,

            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Review" && events === "counter_offer") {
        let response = {

            eventCode: NotificationEventCode.COUNTER_OFFER_REVIEW_REJECT,

            user_type: ['msp']
        }
        return response;

    } else if (flow_type == "Approval" && events === "counter_offer") {
        let response = {

            eventCode: NotificationEventCode.COUNTER_OFFER_APPROVAL_REJECT,

            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Review" && events === "submit_candidate_shortlist") {
        let response = {

            eventCode: NotificationEventCode.CANDIDATE_SHORTLIST_REJECTED,

            user_type: ['msp']
        }
        return response;

    } else if (flow_type == "Review" && events === "submit_candidate_rehire_check") {
        let response = {

            eventCode: NotificationEventCode.REHIRE_REVIEW_REJECT,

            user_type: ['msp', 'vendor']
        }
        return response;

    } else if (flow_type == "Approval" && events === "submit_candidate_rehire_check") {
        let response = {

            eventCode: NotificationEventCode.REHIRE_APPROVAL_REJECT,

            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events === "create_assignment") {
        let response = {

            eventCode: NotificationEventCode.ASSIGNMENT_APPROVAL_REJECTED,

            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events === "update_assignment") {
        let response = {

            eventCode: NotificationEventCode.ASSIGNMENT_MODIFIED_REJECTED,

            user_type: ['msp', 'vendor']
        }
        return response;
    } else if (flow_type == "Approval" && events === "BUDGET_INCREASED" || events === "assignment_budget_adjustment") {
        let response = {

            eventCode: NotificationEventCode.BUDGET_INCREASE_REJECTED,

            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events === "BUDGET_REDUCED" || events === "assignment_budget_adjustment") {
        let response = {

            eventCode: NotificationEventCode.BUDGET_REDUCED_REJECTED,

            user_type: ['msp']
        }
        return response;
    } else if (flow_type == "Approval" && events === "submit_timesheet" )  {
        let response = {
            eventCode: NotificationEventCode.TIMESHEET_APPROVAL_REJECTED,
            user_type: ['msp']
        }
        return response;

    }else {
        console.log(`events code not found for event: ${events}`);
    }

}
export async function fetchUsersBasedOnHierarchy(allPayload: { hierarchy_ids: any[], program_id: any }) {
    try {
        const { hierarchy_ids, program_id } = allPayload;

        // Query to fetch users based on hierarchy_ids and program_id
        const query = `
          SELECT u.*
          FROM user u
          WHERE u.program_id = :program_id
          AND u.user_type IN ('msp', 'vendor')
          AND (
              u.is_all_hierarchy_associate = true
              OR (
                  u.is_all_hierarchy_associate = false
                  AND EXISTS (
                      SELECT 1
                      FROM JSON_TABLE(
                          u.associate_hierarchy_ids,
                          '$[*]' COLUMNS (hierarchy_id INT PATH '$')
                      ) AS jt
                      WHERE jt.hierarchy_id IN (:hierarchy_ids)
                  )
              )
          );
      `;

        const users = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements: {
                program_id: program_id,
                hierarchy_ids: hierarchy_ids,
            },
        });




        return users || null; // Return the list of users that match the criteria.
    } catch (error) {
        console.error("Error fetching users:", error);
        throw new Error("Error fetching users based on hierarchy and program_id.");
    }
}

async function getManagerDetails(program_id: any, workflowId: any) {
    try {
        // Step 1: Query the workflow table to get the manager ID
        const workflowQuery = `
            SELECT id, manager,events
            FROM workflow
            WHERE id = :id
            AND is_enabled = true
            LIMIT 1
        `;

        const workflowResult: any = await sequelize.query(workflowQuery, {
            type: QueryTypes.SELECT,
            replacements: { id: workflowId },
        });

        if (workflowResult.length === 0) {
            return { status: 'Error', message: 'Workflow not found or disabled' };
        }

        const managerId = workflowResult[0].manager;

        // Step 2: Query the user table to get the manager details
        const userQuery = `
            SELECT user_id, email,first_name ,last_name
            FROM user
            WHERE user_id = :managerId
              AND program_id=:program_id
            LIMIT 1
        `;

        const userResult = await sequelize.query(userQuery, {
            type: QueryTypes.SELECT,
            replacements: { managerId, program_id },
        });

        if (userResult.length === 0) {
            return { status: 'Error', message: 'Manager not found' };
        }

        return { status: 'Success', data: userResult[0] || null };
    } catch (error) {
        console.error('Error fetching manager details:', error);
        return { status: 'Error', message: 'An error occurred while fetching manager details', error };
    }
}
export const rejectLevel = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body:
        | { placement_order: number; new_status: string; reason: string; user_id: string; notes?: string, job_id?: string, hierarchy_ids: any[] }
        | { placement_order: number; new_status: string; reason: string; user_id: string; notes?: string, job_id?: string, hierarchy_ids: any[] }[];
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;
    let updates = request.body;
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);
    const isSuperUser = user?.userType === "super_user";
    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub
    if (!Array.isArray(updates)) {
        updates = [updates];
    }

    if (!program_id || !id || updates.length === 0) {
        return reply.status(400).send({
            status_code: 400,
            message: "Invalid request: program_id, id, and at least one update are required.",
            trace_id: traceId,
        });
    }
    try {
        const userResult = await getUsersStatus(sequelize, userId, program_id);
        let userData = userResult[0] as any;
        const workflow: any = await JobWorkFlowModel.findOne({ where: { id, program_id } });
        const job_id = (updates as any[])[0]?.job_id;
        let impersonator_id: any
        if (user.impersonator) {
            impersonator_id = user.impersonator.id || null
        }
        if (!workflow) {
            return reply.status(404).send({
                status_code: 404,
                message: "Workflow data not found!",
                trace_id: traceId,
            });
        }
        // Parse levels array
        let levels = workflow.levels || [];
        let updatedLevels = false;
        updates.forEach(({ placement_order, new_status, user_id, notes, reason }) => {


            if (new_status !== "rejected") {
                throw new Error("Only 'rejected' status is allowed for this operation.");
            }

            let levelFound = false;

            levels = levels.map((level: any) => {
                if (level.placement_order >= placement_order) {
                    updatedLevels = true;

                    if (level.placement_order === placement_order) {
                        levelFound = true;
                        const updatedRecipientTypes = level.recipient_types.map((recipient: any) => {
                            if (isSuperUser) {
                                // Superuser logic: Skip user_id matching
                                return {
                                    ...recipient,
                                    status: "Rejected",
                                    updated_on: Date.now(),
                                    notes: notes,
                                    reason: reason,
                                    actor_first_name: userData?.first_name,
                                    actor_last_name: userData?.last_name,
                                    actor_by_avatar: userData?.avatar,
                                };
                            }
                            if (
                                (recipient.replaced_by && recipient.replaced_by === user_id) ||
                                (!recipient.replaced_by &&
                                    recipient.meta_data &&
                                    Object.values(recipient.meta_data).includes(user_id))
                            ) {

                                return {
                                    ...recipient, status: "Rejected", imporsonate_by: impersonator_id, updated_on: Date.now(), notes: notes, reason: reason,
                                    actor_first_name: userData?.first_name,
                                    actor_last_name: userData?.last_name,
                                    actor_by_avatar: userData?.avatar,
                                };

                            }

                            return {
                                ...recipient, status: "canceled", imporsonate_by: impersonator_id, updated_on: Date.now(),
                            };

                        });
                        return {
                            ...level,
                            updated_on: Date.now(),
                            status: "completed",
                            recipient_types: updatedRecipientTypes,
                        };
                    }
                    const updatedRecipientTypes = level.recipient_types.map((recipient: any) => ({
                        ...recipient,
                        status: "canceled",
                        updated_on: Date.now(),  

                    }));

                    return {
                        ...level,
                        updated_on: Date.now(),
                        status: "canceled",
                        recipient_types: updatedRecipientTypes,
                    };
                }

                return level;
            });

            if (!levelFound) {
                throw new Error(`Placement order ${placement_order} not found in levels.`);
            }

            WorkflowStatusHistory.create({
                job_workflow_id: id,
                placement_order,
                new_status: "rejected",
                program_id,
                reason,
                notes: notes || "",
                created_on: Date.now(),
                user_id: user_id,
                actor_first_name: userData?.first_name,
                actor_last_name: userData?.last_name,
                actor_by_avatar: userData?.avatar,
            });
        });


        if (!updatedLevels) {
            return reply.status(400).send({
                status_code: 400,
                message: "No levels updated. Please check the placement orders provided.",
                trace_id: traceId,
            });
        }

        // Update the workflow with the modified levels array
        await workflow.update({ levels, is_updated: true, updated_on: Date.now(), status: "completed" });

        let workflowStatus = "completed"
        let eventCode:any = await getRejectEventsCode(workflow)
        let allPayload = {
            hierarchy_ids: updates[0].hierarchy_ids,
            program_id: program_id,
            user_type: eventCode?.user_type
        }
        
        await handleJobWorkflowStatus(request, reply, workflowStatus, workflow, updates, program_id, id, allPayload, eventCode , null)
        await updateRejectStatusInAllWorkflowModule(request, reply, program_id, id, workflow, updates )
        const newStatus :any= (job_id && program_id && token)
            ? await getUpdatedJobStatus(job_id, program_id, token)
            : null;          
         if (job_id) {
               try {
                 await createJobHistory(
                   program_id,
                   job_id,
                   newStatus,
                   'Job Status Update',
                   token,
                   userId || '',      
                   { status: newStatus }
                 );
               } catch (error) {
                 console.error('Failed to create job history:', error);
               }
             }  	
        return reply.status(200).send({
            status_code: 200,
            message: "Job workflow updated successfully.",
            trace_id: traceId,
        });
    } catch (error) {
        console.error("Error updating job workflow:", error);

        return reply.status(500).send({
            status_code: 500,
            message: "Failed to update job workflow.",
            trace_id: traceId,
            error: (error as Error).message
        });
    }
};

export const updateReplaceLevel = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body: {
            placement_order: number;
            status: string;
            replaced_by: string;
            user_id?: string;
            notes?: string;
            job_id?: string
        };
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;
    const { placement_order, status, replaced_by, user_id, notes } = request.body;
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    // Validate input parameters
    if (!program_id || !id || !placement_order || !status || !replaced_by) {
        return reply.status(400).send({
            status_code: 400,
            message: "Invalid request: program_id, id, placement_order, status, and replaced_by are required.",
            trace_id: traceId,
        });
    }
    try {
        const workflow:any = await JobWorkFlowModel.findOne({ where: { id, program_id } });
        if (!workflow) {
            return reply.status(404).send({
                status_code: 404,
                message: "Workflow data not found!",
                trace_id: traceId,
            });
        }
        let levels = workflow.levels || [];
        let levelFound = false;
        levels = await Promise.all((levels || []).map(async (level: any) => {
            if (level.placement_order === placement_order) {
                levelFound = true;
        
                const updatedRecipientTypes = await Promise.all(level.recipient_types.map(async (recipient: any) => {
                    if (recipient.replaced_by && recipient.replaced_by === user_id) {
                        const metaDataKey = Object.keys(recipient.meta_data)[0];
                        const metaDataValue = Object.values(recipient.meta_data)[0];
                        const levelDb: any = await WorkflowTriggeredLevel.findOne({
                            where: {
                                workflow_trigger_id: workflow?.workflow_trigger_id,
                                workflow_id: workflow?.workflow_id,
                                placement_order,
                            },
                            attributes: ['id']
                        });
        
                        await WorkflowTriggeredRecipientType.update(
                            {
                                meta_data: {
                                    ...recipient.meta_data,
                                    [metaDataKey]: recipient?.replaced_by,
                                },
                            },
                            {
                                where: {
                                    level_id: levelDb?.id,
                                    program_id,
                                    workflow_trigger_id: workflow?.workflow_trigger_id,
                                    workflow_id: workflow?.workflow_id,
                                    [Op.and]: sequelize.literal(`JSON_SEARCH(meta_data, 'one', '${metaDataValue}') IS NOT NULL`),
                                },
                            }
                        );
        
                        return {
                            ...recipient,
                            status,
                            replaced_by,
                            meta_data: {
                                ...recipient.meta_data,
                                [metaDataKey]: recipient?.replaced_by
                            },
                            replaced_notes: notes,
                            replaced_modified_on: Date.now()
                        };
                    }
        
                    if (!recipient.replaced_by && Object.values(recipient.meta_data).includes(user_id)) {
                        return {
                            ...recipient,
                            status,
                            replaced_by,
                            meta_data: {
                                ...recipient.meta_data,
                            },
                            replaced_notes: notes,
                            replaced_modified_on: Date.now()
                        };
                    }
        
                    return recipient;
                }));
                
                return {
                    ...level,
                    recipient_types: updatedRecipientTypes
                };
            }
        
            return level;
        }));
        
        if (!levelFound) {
            return reply.status(400).send({
                status_code: 400,
                message: `Placement order ${placement_order} not found in levels.`,
                trace_id: traceId,
            });
        }
        if (user_id) {
            WorkflowStatusHistory.create({
                job_workflow_id: id,
                placement_order,
                status,
                program_id,
                notes: notes ?? "",
                created_on: Date.now(),
                user_id: user.sub,
            });
        }
        await workflow.update({ levels, updated_on: Date.now() });
        
        return reply.status(200).send({
            status_code: 200,
            message: "Job workflow updated successfully.",
            trace_id: traceId,
        });
    } catch (error) {
        console.error("Error updating job workflow:", error);
        return reply.status(500).send({
            status_code: 500,
            message: "Failed to update job workflow.",
            trace_id: traceId,
        });
    }
};

// async function fetchUserById(user_id: any) {
//     const userQuery = `
//         SELECT user_id, first_name, last_name, avatar, role_id,email
//         FROM user
//         WHERE user_id = :user_id
//           AND is_enabled = true
//         LIMIT 1;
//     `;

//     try {
//         const userResult = await sequelize.query(userQuery, {
//             type: QueryTypes.SELECT,
//             replacements: { user_id },
//         });

//         if (userResult.length > 0) {
//             return userResult[0]; // Return the first user found
//         } else {
//             console.warn(`User with ID ${user_id} not found.`);
//             return null; // Return null if no user is found
//         }
//     } catch (error) {
//         console.error(`Error fetching user with ID ${user_id}:`, error);
//         throw new Error("Failed to fetch user details.");
//     }
// }
export const imporsonateLevel = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body:
        | { placement_order: number; new_status: string; imporsonate_by: string; user_id?: string }
        | { placement_order: number; new_status: string; imporsonate_by: string; user_id?: string }[];
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    const { program_id, id } = request.params;
    let updates = request.body;


    if (!Array.isArray(updates)) {
        updates = [updates];
    }


    if (!program_id || !id || updates.length === 0) {
        return reply.status(400).send({
            status_code: 400,
            message: "Invalid request: program_id, id, and updates are required.",
            trace_id: traceId,
        });
    }

    try {

        const workflow = await JobWorkFlowModel.findOne({ where: { id, program_id } });

        if (!workflow) {
            return reply.status(404).send({
                status_code: 404,
                message: "Workflow data not found!",
                trace_id: traceId,
            });
        }

        let levels = workflow.levels || [];
        let updatedLevels = false;


        updates.forEach(({ placement_order, new_status, imporsonate_by, user_id }) => {
            let levelFound = false;

            levels = levels.map((level: any) => {
                if (level.placement_order === placement_order) {
                    levelFound = true;
                    updatedLevels = true;

                    const updatedRecipientTypes = level.recipient_types.map((recipient: any) => {
                        if (user_id) {
                            if (recipient.replaced_by) {
                                // If replaced_by exists, match user_id with replaced_by
                                if (recipient.replaced_by === user_id) {
                                    return { ...recipient, status: new_status, imporsonate_by };
                                }
                            } else {
                                // If replaced_by doesn't exist, check meta_data
                                const matchesUser = recipient?.replaced_by
                                            ? user_id === recipient?.replaced_by
                                            : Object.values(recipient?.meta_data).includes(user_id);

                                if (matchesUser) {
                                    return { ...recipient, status: new_status, imporsonate_by };
                                }
                            }
                        } else {
                            // Update status for all recipients if user_id is not provided
                            return { ...recipient, status: new_status, };
                        }
                        return recipient;
                    });


                    const allApproved = updatedRecipientTypes.every(
                        (recipient: any) => recipient.status === "approved" || recipient.status === "reviewed" 
                    );

                    return {
                        ...level,
                        status: allApproved ? "completed" : "pending",
                        recipient_types: updatedRecipientTypes,
                    };
                }
                return level;
            });

            if (!levelFound) {
                throw new Error(`Placement order ${placement_order} not found in levels.`);
            }


            WorkflowStatusHistory.create({
                job_workflow_id: id,
                placement_order,
                new_status,
                program_id,
                imporsonate_by,
                created_on: Date.now(),
                user_id: user_id || null,
            });
        });

        if (!updatedLevels) {
            return reply.status(400).send({
                status_code: 400,
                message: "No levels updated. Please check the placement orders provided.",
                trace_id: traceId,
            });
        }

        // Update the workflow with the modified levels array
        await workflow.update({ levels, updated_on: Date.now() });

        return reply.status(200).send({
            status_code: 200,
            message: "Job workflow updated successfully.",
            trace_id: traceId,
        });
    } catch (error) {
        console.error("Error updating job workflow:", error);

        return reply.status(500).send({
            status_code: 500,
            message: "Failed to update job workflow.",
            trace_id: traceId,
        });
    }
};

export const updateJobWorkFlow = async (
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
        Body: Partial<JobWorkFlow>;
    }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params;
    const updateData = request.body as JobWorkFlow;


    try {
        const workflow = await JobWorkFlowModel.findOne({ where: { id, program_id } });

        if (!workflow) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Workflow data not found !',
                trace_id: traceId,
            });
        }

        await workflow.update({ ...updateData, updated_on: Date.now() });


        reply.status(200).send({
            status_code: 200,
            message: 'Job workflow updated successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to update job workflow',
            trace_id: traceId,
        });
    }
};
export async function deleteJobWorkFlow(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();

    try {
        const { program_id, id } = request.params as { program_id: string, id: string };
        const workflow = await JobWorkFlowModel.findOne({ where: { program_id, id } });

        if (workflow) {
            await JobWorkFlowModel.update({ is_deleted: true, is_enabled: false }, { where: { program_id, id } });

            reply.status(204).send({
                status_code: 204,
                message: 'Job workflow deleted successfully.',
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 404,
                message: 'Job worklfow not found.',
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to delete job workflow',
            trace_id: traceId,
            error,
        });
    }
};
export const updateWorkflowStatusData = async (
    program_id: string,
    workflow_id: string,
    updates: {
        placement_order: number;
        new_status: string;
        // user_id: string;
        behavior?: string;
        notes?: string;
    }[],
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();


    if (!program_id || !workflow_id || updates.length === 0) {
        return reply.status(400).send({
            status_code: 400,
            message: "Invalid request: program_id, workflow_id, and at least one update are required.",
            trace_id: traceId,
        });
    }
    try {
        const workflow = await JobWorkFlowModel.findOne({ where: { id: workflow_id, program_id } });

        if (!workflow) {
            return reply.status(404).send({
                status_code: 404,
                message: "Workflow data not found!",
                trace_id: traceId,
            });
        }
        let levels = workflow.levels || [];
        let updatedLevels = false;

        updates.forEach(({ placement_order, new_status, behavior }) => {
            let levelFound = false;

            levels = levels.map((level: any) => {
                if (level.placement_order == placement_order) {
                    levelFound = true;
                    updatedLevels = true;

                    // Update all recipients in the specified level
                    const updatedRecipientTypes = level.recipient_types.map((recipient: any) => {
                        if (behavior === "any") {
                            return { ...recipient, status: "bypassed" };
                        }
                        return { ...recipient, status: new_status };
                    });

                    const allApproved = updatedRecipientTypes.every(
                        (recipient: any) => recipient.status === "bypassed" || recipient.status == "approved"
                    );

                    return {
                        ...level,
                        status: allApproved ? "completed" : "pending",
                        recipient_types: updatedRecipientTypes,
                    };
                }
                return level;
            });

            if (!levelFound) {
                throw new Error(`Placement order ${placement_order} not found in levels.`);
            }
        });


        console.log("Final Updated Levels:", JSON.stringify(levels, null, 2));


        let Result = await workflow.update(
            { levels, updated_on: Date.now() },
            { where: { id: workflow_id } } // Replace with the correct identifier
        );



        console.log("Levels successfully updated in the database!", Result);


    }
    catch (error) {
        console.error("Error updating job workflow:", error);
        return reply.status(500).send({
            status_code: 500,
            message: "Failed to update job workflow.",
            trace_id: traceId,
        });
    }
};


function getName(input_value: any): string {
    if ('first_name' in input_value && 'last_name' in input_value) {
        const firstName = (input_value as { first_name: string; last_name?: string }).first_name;
        const lastName = (input_value as { first_name: string; last_name?: string }).last_name ?? '';
        return `${firstName} ${lastName}`.trim();
    } else if ('name' in input_value) {
        return (input_value as { name: string }).name;
    }
    return '';
}



async function getRolesForRecipients(request: FastifyRequest, reply: FastifyReply, levels: any[], program_id: string) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        for (const level of levels) {

            // Iterate through all recipients in the current level
            for (const recipient of level.recipients) {
                // Get the user_id or replaced_by
                const userId = recipient.replaced_by || recipient.user_id;

                if (!userId) {
                    console.warn(`No user_id or replaced_by found for recipient: ${recipient}`);
                    continue;
                }

                // Fetch user mapping details
                const userMappingQuery = `
                SELECT role_id
                FROM user_mappings
                WHERE user_id = :user_id
                AND program_id = :program_id
                LIMIT 1
            `;
                const userMapping: any = await sequelize.query(userMappingQuery, {
                    type: QueryTypes.SELECT,
                    replacements: { user_id: userId, program_id },
                });

                if (!userMapping.length) {
                    console.warn(`No user mapping found for user_id: ${userId} and program_id: ${program_id}`);
                    continue;
                }

                const role_id = userMapping[0].role_id;

                // Fetch role details from the role table
                const apiUrl = `${AUTH_BASE_URL}/v1/api/roles/${role_id}?tenant-id=${program_id}`;

                const data = {
                    role_id: `${role_id}`
                };
                const response = await axios.post(apiUrl, data, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                const roleName = response.data.response.roles.display_name;


                // Add roleName to the recipient object
                recipient.roleName = roleName;
            }
        }

        return levels;
    } catch (error) {
        console.error('Error in getRolesForRecipients:', error);
        return reply.status(500).send({ status_code: 500, message: 'role not found' });

    }
}
const sendNotificationSequencially = async (request: FastifyRequest, reply: FastifyReply, workflow: any) => {
    const { program_id, job_workflow_id, levels } = workflow;
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);


    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    // 1. Filter levels with status "pending"
    const pendingLevels = levels?.filter((level: any) => level.level_status === "pending");

    for (const level of pendingLevels) {
        const placementOrder = level.placement_order;

        // 2. Check if a notification for this placement order already exists
        const existingLog = await sendNotificationModel.findOne({
            where: {
                program_id,
                workflow_id: job_workflow_id,
                placement_order: placementOrder,
            },
        });

        if (existingLog) {
            console.log(`Notification already sent for placement order: ${placementOrder}`);
            continue;
        }

        // 3. Extract recipient emails
        const recipientEmails = level.recipients.map((recipient: any) => ({
            id: recipient.user_id,
            email: recipient.email,
            first_name: recipient.name.split(" ")[0],
            last_name: recipient.name.split(" ").slice(1).join(" "),

        }));

        // 4. Create event code
        const eventCode = await getTriggeredEventsCode(workflow.workflow_type, workflow.event_slug);
        const workflowDetails = await getWorkflowDetails(sequelize, workflow.job_workflow_id);
        const events = workflowDetails?.events;
        const workflowTriggerId = workflowDetails?.workflow_trigger_id;
        const jobUUID = workflowDetails?.job_id;
        let jobDatas: any = null;
        let offerData: any = null;
        let assignmentData: any = null;
        const isOfferEvent = events?.includes('offer');
        const isAssignmentEvent = events?.includes('assignment')
        if (jobUUID) {
            jobDatas = await getJobDetails(jobUUID, program_id, token);
        }
        if (isOfferEvent && workflowTriggerId) {
            //fetch candidate details
            offerData = await getOfferDetails(workflowTriggerId, program_id, token);
        }
        if (workflowTriggerId && isAssignmentEvent) {
            assignmentData = await getAssignmentDetails(workflowTriggerId, program_id, token)
        }
        let payload;
        if (workflowDetails) {
            payload = {
                job_id: jobDatas?.data?.job?.job_id,
                job_url: jobDatas?.data?.job?.id && jobDatas?.data?.job?.job_template_id
                    ? `${ui_base_url}/jobs/job/view/${jobDatas.data.job.id}/${jobDatas.data.job.job_template_id}?detail=job-details`
                    : '',
                user_type: user?.userType,
                candidate_first_name: workflowDetails?.first_name,
                candidate_last_name: workflowDetails?.last_name,
                submission_id: workflowDetails?.code,
                offer_id: offerData?.data?.offer?.offer_code ?? "",
                offer_url: offerData?.data?.offer.candidate_id ? `${SOURCE_BASE_URL}/jobs/view-submit/${offerData?.data?.offer?.candidate_id}/job/${offerData?.data?.offer?.id}?offerId=${offerData?.offer?.id}&detail=offer`
                    : '',
                assignment_title_name: assignmentData?.data?.assignment?.title,
                id: assignmentData?.data?.assignment?.code,
                duration: assignmentData?.data?.finance?.working_duration,
                //remaining_budget_amount
                //budget_amount
                //worked_as
            }

        } else {
            console.error('workflowDetails is undefined or missing required properties');
        }
        // 5. Create the notification payload

        const notificationPayloads: NotificationDataPayload = {
            program_id,
            traceId,
            eventCode: eventCode ?? '',
            recipientEmail: recipientEmails,
            payload,
            token,
            userId: user?.sub ?? "",
        };

        // 6. Send notifications
        await sendNotification(notificationPayloads);
        console.log("notificationPayloads", notificationPayloads);


        // 7. Log the notification
        await sendNotificationModel.create({
            program_id,
            workflow_id: job_workflow_id,
            placement_order: placementOrder,
            created_by: user.sub,
        });

        console.log(`Notification sent and logged for placement order: ${placementOrder}`);
    }
};






/**
 * Fetch user data from the database
 */
async function fetchUserData(user_id: string, program_id: string) {
    console.log("user_id is", user_id, "and program_id is", program_id);

    if (!user_id) return null;
    const userTypeQuery = `
        SELECT user_type
        FROM user
        WHERE user_id = :user_id AND LOWER(status) = 'active'
        LIMIT 1
    `;

    const userTypeResult: any = await sequelize.query(userTypeQuery, {
        type: QueryTypes.SELECT,
        replacements: { user_id },
    });

    if (!userTypeResult.length) return null;

    const user_type = userTypeResult[0]?.user_type;

    let userQuery = `
        SELECT user_id, first_name, last_name, avatar, role_id, email, user_type
        FROM user
        WHERE user_id = :user_id AND LOWER(status) = 'active'
    `;
    if (user_type?.toLowerCase() !== 'super_user') {
        userQuery += ` AND program_id = :program_id`;
    }

    userQuery += ` LIMIT 1`;

    const userData: any = await sequelize.query(userQuery, {
        type: QueryTypes.SELECT,
        replacements: { user_id, program_id },
    });

    return userData || '';
}

/**
 * Fetch job manager data from the database
 */
async function fetchJobManagerData(manager_id: string, program_id: string) {
    if (!manager_id || !program_id) return null;
    
    const jobManagerQuery = `
        SELECT user_id, first_name, last_name, email, avatar, supervisor
        FROM user
        WHERE user_id = :job_manager_id
          AND program_id = :program_id
          AND LOWER(status) = 'active'
        LIMIT 1
    `;
    
    return await sequelize.query(jobManagerQuery, {
        type: QueryTypes.SELECT,
        replacements: { job_manager_id: manager_id, program_id },
    });
}

/**
 * Fetch supervisor data from the database
 */
async function fetchSupervisorData(supervisor_id: string, program_id: string) {
    if (!supervisor_id || !program_id) return null;
    
    const supervisorQuery = `
        SELECT user_id, first_name, last_name, email, avatar, role_id
        FROM user
        WHERE user_id = :supervisor
          AND program_id = :program_id
          AND LOWER(status) = 'active'
        LIMIT 1
    `;
    
    return await sequelize.query(supervisorQuery, {
        type: QueryTypes.SELECT,
        replacements: { supervisor: supervisor_id, program_id },
    });
}

/**
 * Fetch level user data from the database
 */
// async function fetchLevelUserData(user_id: string, program_id: string) {
//     if (!user_id || !program_id) return null;
    
//     const userQuery = `
//         SELECT user_id, first_name, last_name, email, avatar, role_id
//         FROM user
//         WHERE user_id = :user_id
//           AND program_id = :program_id
//           AND status = 'active'
//         LIMIT 1
//     `;
    
//     const userResult = await sequelize.query(userQuery, {
//         type: QueryTypes.SELECT,
//         replacements: { user_id, program_id },
//     });
    
//     return userResult.length > 0 ? userResult[0] : null;
// }

/**
 * Map user data to standardized format
 */
function mapUserData(user: any, recipient_details: any) {
    return {
        id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: user.avatar,
        role_id: user.role_id,
        email: user.email,
        updated_on: recipient_details?.updated_on,
        notes: recipient_details?.notes,
        reason: recipient_details?.reason,
        replaced_notes: recipient_details?.replaced_notes
    };
}

/**
 * Map replaced user data to standardized format
 */
function mapReplacedUserData(user: any, recipient_type: string, recipient_details: any, behaviour: any) {
    return {
        id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: user.avatar,
        role_id: user.role_id,
        email: user.email,
        recipient_type: recipient_type || '',
        replaced_date_time: recipient_details?.replaced_modified_on,
        behaviour,
    };
}

/**
 * Map impersonated user data to standardized format
 */
function mapImporsonateUserData(user: any, recipient_type: string, recipient_details: any, behaviour: any) {
    return {
        id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: user.avatar,
        role_id: user.role_id,
        email: user.email,
        updated_on: recipient_details?.updated_on,
        recipient_type: recipient_type || '',
        behaviour,
    };
}

export async function getUpdateWorkflowApprovals(request: FastifyRequest, reply: FastifyReply) {
    const trace_id = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    
    // Authentication check
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    const user_type = user?.userType
    
    try {
        const { workflow_action, job_id, workflow_trigger_id, hierarchy_id, workflow_id } = request.query as {
            workflow_action: string;
            job_id: string;
            workflow_trigger_id: string;
            hierarchy_id: any;
            workflow_id: string
        };
        
        // Properly format hierarchy IDs for SQL query
        
        // Base workflow data query
        const workflowQuery = buildWorkflowQuery(workflow_id);
        
        const rows: any[] = await sequelize.query(workflowQuery, {
            replacements: { 
                workflow_action, 
                program_id, 
                workflow_trigger_id,
                workflow_id: workflow_id
            },
            type: QueryTypes.SELECT,
        });

        if (rows.length === 0) {
            return reply.status(200).send({
                statusCode: 200,
                message: 'Workflow data not found',
                workflow: [],
                trace_id,
            });
        }
        
        const workflows: { [key: string]: Workflow } = {};
        
        for (const row of rows) {
            await processWorkflowRow(row, workflows, program_id, user_type);
        }
        for (const workflowId in workflows) {
            workflows[workflowId].levels = deduplicateLevels(workflows[workflowId].levels);

            await statusHandling(request, reply, workflows[workflowId] );
        }
        
        return reply.status(200).send({
            statusCode: 200,
            workflows: Object.values(workflows),
            trace_id,
        });
    } catch (error: any) {
        console.error('Error in getUpdateWorkflowApprovals:', error);
        return reply.status(500).send({
            statusCode: 500,
            message: 'An error occurred while fetching workflow data.',
            trace_id,
        });
    }
}

/**
 * Final deduplication of levels to ensure there are no duplicates with the same placement_order
 * This is a last resort safety measure to prevent duplicate levels in the response
 */
function deduplicateLevels(levels: Level[]): Level[] {
    if (!levels || !Array.isArray(levels) || levels.length === 0) {
        return [];
    }
    
    // Group levels by placement_order
    const levelsByPlacementOrder: { [key: number]: Level[] } = {};
    
    for (const level of levels) {
        if (!levelsByPlacementOrder[level.placement_order]) {
            levelsByPlacementOrder[level.placement_order] = [];
        }
        levelsByPlacementOrder[level.placement_order].push(level);
    }
    
    // For each placement_order, merge duplicate levels
    const result: Level[] = [];
    
    for (const placementOrder in levelsByPlacementOrder) {
        const levelsForOrder = levelsByPlacementOrder[placementOrder];
        
        if (levelsForOrder.length === 1) {
            // No duplicates for this placement_order - always include the level, even if it has no recipients
            result.push({
                ...levelsForOrder[0],
                recipients: Array.isArray(levelsForOrder[0].recipients) ? 
                    [...levelsForOrder[0].recipients] : []
            });
        } else {
            // Merge all levels with the same placement_order
            const mergedLevel: Level = { ...levelsForOrder[0] };
            mergedLevel.recipients = [];
            
            // Collect all unique recipients by user_id
            const recipientsByUserId: any = {};
            
            for (const level of levelsForOrder) {
                if (Array.isArray(level.recipients)) {
                    for (const recipient of level.recipients) {
                        if (recipient && recipient.user_id) {
                            // Take the recipient with the most recent updated_on timestamp
                            if (!recipientsByUserId[recipient.user_id] || 
                                (recipient.updated_on && (!recipientsByUserId[recipient.user_id].updated_on || 
                                 recipient.updated_on > recipientsByUserId[recipient.user_id].updated_on))) {
                                recipientsByUserId[recipient.user_id] = { ...recipient };
                            }
                        }
                    }
                }
            }
            
            // Add unique recipients to the merged level
            mergedLevel.recipients = Object.values(recipientsByUserId);
            
            // Add the merged level to the result
            result.push(mergedLevel);
        }
    }
    
    // Sort levels by placement_order
    result.sort((a, b) => a.placement_order - b.placement_order);
    
    return result;
}

/**
 * Build the SQL query for getting workflow data
 * This extracts the complex SQL query to a separate function for better readability
 */
function buildWorkflowQuery(workflow_id: string) {
     let workflowIdCondition = '';
        if (workflow_id) {
            workflowIdCondition = 'AND w.id = :workflow_id';
        }
    return `
        SELECT
            w.id AS job_workflow_id,
            w.workflow_id AS workflow_id,
            w.event_id AS event_id,
            w.event_title AS event_title,
            w.name AS workflow_name,
            w.flow_type AS workflow_type,
            w.levels,
            w.status,
            w.config,
            w.manager,
            l.id AS level_id,
            l.placement_order AS placement_order,
            r.recipient_type_id,
            r.meta_data,
            r.behaviour,
            e.name,
            e.slug AS event_slug,
            JSON_UNQUOTE(JSON_EXTRACT(w.levels, CONCAT('$[', l.placement_order, '].status'))) AS level_status,
            JSON_UNQUOTE(JSON_EXTRACT(w.levels, CONCAT('$[', l.placement_order, '].recipient_types'))) AS recipient_types,
            
            /* Get replaced_by user */
            (
                SELECT JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_by'))
                FROM JSON_TABLE(
                    JSON_EXTRACT(w.levels, CONCAT('$[', l.placement_order, '].recipient_types')),
                    '$[*]' COLUMNS (value JSON PATH '$')
                ) AS recipient
                WHERE JSON_EXTRACT(recipient.value, '$.replaced_by') IS NOT NULL
                LIMIT 1
            ) AS replaced_by,
            
            /* Get existing_replaced_user */
            (
                SELECT JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.existing_replaced_user'))
                FROM JSON_TABLE(
                    JSON_EXTRACT(w.levels, CONCAT('$[', l.placement_order, '].recipient_types')),
                    '$[*]' COLUMNS (value JSON PATH '$')
                ) AS recipient
                WHERE JSON_EXTRACT(recipient.value, '$.existing_replaced_user') IS NOT NULL
                LIMIT 1
            ) AS existing_replaced_user,
            
            /* Get impersonate_by user */
            (
                SELECT JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.imporsonate_by'))
                FROM JSON_TABLE(
                    JSON_EXTRACT(w.levels, CONCAT('$[', l.placement_order, '].recipient_types')),
                    '$[*]' COLUMNS (value JSON PATH '$')
                ) AS recipient
                WHERE JSON_EXTRACT(recipient.value, '$.imporsonate_by') IS NOT NULL
                LIMIT 1
            ) AS imporsonate_by,
            
            /* Get recipient details */
            (
                SELECT JSON_OBJECT(
                    'status', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.status')), NULL),
                    'updated_on', IFNULL(CAST(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.updated_on')) AS UNSIGNED), NULL),
                    'notes', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.notes')), NULL),
                    'reason', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.reason')), NULL),
                    'actor_first_name', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.actor_first_name')), NULL),
                    'actor_last_name', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.actor_last_name')), NULL),
                    'actor_by_avatar', NULLIF(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.actor_by_avatar')), 'null'),
                    'is_admin_override', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.is_admin_override')), NULL),
                    'replaced_notes', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_notes')), NULL),
                    'replaced_modified_on', IFNULL(CAST(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_modified_on')) AS UNSIGNED), NULL)
                )
                FROM JSON_TABLE(
                    JSON_EXTRACT(w.levels, CONCAT('$[', l.placement_order, '].recipient_types')),
                    '$[*]' COLUMNS (value JSON PATH '$')
                ) AS recipient
                WHERE JSON_EXTRACT(recipient.value, '$.status') IS NOT NULL
                LIMIT 1
            ) AS recipient_details,
            
            /* Get recipient status */
            (
                SELECT JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.status'))
                FROM JSON_TABLE(
                    JSON_EXTRACT(w.levels, CONCAT('$[', l.placement_order, '].recipient_types')),
                    '$[*]' COLUMNS (value JSON PATH '$')
                ) AS recipient
                WHERE JSON_EXTRACT(recipient.value, '$.status') IS NOT NULL
                LIMIT 1
            ) AS recipient_status
            
        FROM workflow w
        INNER JOIN workflow_triggered_level l 
            ON l.workflow_id = w.workflow_id 
            AND l.workflow_trigger_id = w.workflow_trigger_id
        LEFT JOIN workflow_triggered_recepient r 
            ON r.level_id = l.id
        LEFT JOIN event e
            ON w.event_id = e.id
        WHERE
            w.program_id = :program_id
            AND w.flow_type = :workflow_action
            AND w.workflow_trigger_id = :workflow_trigger_id
             ${workflowIdCondition}
            AND w.is_updated = true
        ORDER BY
            w.created_on DESC;
    `;
}

/**
 * Process a workflow row from the database and add it to the workflows map
 */
async function processWorkflowRow(row: any, workflows: { [key: string]: Workflow }, program_id: string, user_type: string): Promise<void> {
    const {
        level_id,
        level_status,
        levels: rowLevels,
        config,
        recipient_status,
        recipient_details,
        placement_order,
        recipient_type_id,
        meta_data,
        behaviour,
        replaced_by,
        existing_replaced_user,
        imporsonate_by,
        job_workflow_id,
        recipient_types
    } = row;

    let manager = row?.manager;
    
    // Initialize workflow if not already exists
    if (!workflows[job_workflow_id]) {
        workflows[job_workflow_id] = {
            program_id: program_id,
            job_workflow_id: job_workflow_id,
            workflow_id: row.workflow_id,
            event_title: row.event_title,
            workflow_name: row.workflow_name,
            workflow_type: row.workflow_type,
            event_slug: row.event_slug,
            status: row.status,
            config: row.config,
            levels: [],
            is_rejected_workflow: row.status?.toLowerCase() === "rejected"
        };
    }

    const workflow = workflows[job_workflow_id];
    
    // Always add the level to the workflow, even if there's no meta_data
    const existingLevelIndex = workflow.levels.findIndex(lvl => lvl.level_id === level_id);
    
    if (existingLevelIndex === -1) {
        // Level doesn't exist yet - add it
        workflow.levels.push({
            level_id,
            level_order: placement_order,
            placement_order,
            level_status,
            behaviour,
            recipients: [] // Start with empty recipients array
        });
    }
    
    // Extract recipients - Try multiple approaches to get complete recipient data
    
    // 1. First try to extract from recipient_types if it's available
    let recipients: any[] = [];
    
    if (recipient_types) { 
        try {
            let parsedTypes;
            if (typeof recipient_types === 'string') {
                parsedTypes = JSON.parse(recipient_types);
            } else {
                parsedTypes = recipient_types;
            }
            
            if (Array.isArray(parsedTypes)) {
                for (const rt of parsedTypes) {
                    // Skip if no meta_data
                    if (!rt.meta_data) continue;

                    const userId:any = rt.meta_data ? Object.values(rt.meta_data)[0] : null;
                    if (!userId) continue;
                    
                    // Fetch user data
                    const userData = await fetchUserById(userId, program_id);

                    if (!userData) continue;
                    
                    // Get recipient type info if available (without using getRecipientTypeNameById)
                    let recipientTypeName = ""; // Default empty string
                    if (rt.recipient_type_id) {
                        const rtInfo = await getRecipientTypeInfo(rt.recipient_type_id);
                        if (rtInfo) {
                            recipientTypeName = rtInfo.name || "";
                        }
                    }
                    
                    let replaced_user_data = null;
                    if (rt?.replaced_by) {
                        const replacedUserResult = await fetchUserData(rt?.replaced_by, program_id);
                        if (replacedUserResult?.length) {
                            replaced_user_data = mapReplacedUserData(replacedUserResult[0],recipientTypeName, recipient_details, behaviour);
                        }
                    }
                    

                    let imposonate_user_data = null;
                    if (user_type?.toLowerCase() !== "super_user" && (rt?.impersonate_by || imporsonate_by)) {
                        const imporsonater = rt?.impersonate_by || imporsonate_by
                        const imporsonateUserResult = await fetchUserData(imporsonater, program_id);

                        if (imporsonateUserResult?.length) {
                            imposonate_user_data = mapImporsonateUserData(imporsonateUserResult[0], recipientTypeName, recipient_details, behaviour);
                        }
                    }
                    // Create recipient object
                    let recipient:any = {
                        user_id: userId,
                        name: `${userData.first_name} ${userData.last_name}`.trim(),
                        first_name: userData.first_name,
                        last_name: userData.last_name,
                        level_id,
                        status: rt.status,
                        updated_on: rt.updated_on,
                        notes: rt.notes,
                        reason: rt.reason,
                        actor_first_name: rt.actor_first_name,
                        actor_last_name: rt.actor_last_name,
                        actor_by_avatar: rt.actor_by_avatar,
                        is_admin_override: rt.is_admin_override,
                        avatar: userData.avatar?.url || '',
                        role_id: userData.role_id,
                        email: userData.email,
                        recipient_type: recipientTypeName,
                        behaviour: rt.behaviour || behaviour,
                        imporsonate_by: imposonate_user_data,
                        replaced_by: replaced_user_data
                    };

                    if(recipient.recipient_type === "Manager of"){
                        const userData = await fetchUserById(rt?.managerId, program_id);
                        recipient ={
                            ...recipient,
                            manager: {
                                id: userData?.user_id,
                                first_name: userData?.first_name,
                                last_name: userData?.last_name,
                                email: userData?.email,
                                avatar: userData?.avatar,
                            }
                        };
                    }
                    recipients.push(recipient);
                }
            }
        } catch (error) {
            console.error(`Error parsing recipient_types for level ${level_id}:`, error);
        }
    }
    
    // 2. If no recipients from recipient_types, try standard processing based on meta_data and recipient_type
    if (recipients.length === 0 && meta_data && Object.keys(meta_data).length > 0 && recipient_type_id) {
        // Get recipient type information
        const recipientType = await getRecipientTypeInfo(recipient_type_id);
        if (recipientType) {
            try {
                if (recipientType.name === 'Specific User' || recipientType.name === 'Multiple users' || 
                    recipientType.name === "Job Manager" || recipientType.name === "Assignment Manager") {
                    recipients = await processSpecificUserRecipients(
                        recipientType, meta_data, existing_replaced_user, replaced_by, 
                        imporsonate_by, program_id, recipient_details, level_id, 
                        recipient_status, behaviour
                    );
                } 
                else if (recipientType.name === "Manager of") {
                    recipients = await processManagerOfRecipients(
                        manager, existing_replaced_user, replaced_by, imporsonate_by, 
                        program_id, recipient_details, level_id, recipient_status, 
                        recipientType, behaviour, workflow
                    );
                }
                else if (recipientType.name === "Custom Field Supplied User" || recipientType.name === "Manager of") {
                    recipients = await processCustomFieldRecipients(
                        rowLevels, recipientType, replaced_by, imporsonate_by, program_id, 
                        recipient_details, level_id, recipient_status, behaviour, workflow
                    );
                }
                else if (["Users in Program Role", "Master Data Owner", "Managerial Chain", 
                        "Financial Authority Chain", "Top of Financial Authority Chain", 
                        "Vendor Users", "Additional MDT Owner"].includes(recipientType.name)) {
                    recipients = await processRoleBasedRecipients(
                        recipient_types, level_id, behaviour, recipientType, program_id,
                        recipient_details, workflow
                    );
                }
            } catch (error) {
                console.error(`Error processing recipients for level ${level_id}:`, error);
            }
        }
    }
    
    // 3. If still no recipients and we have row.levels data, extract recipient information from there
    if (recipients.length === 0 && rowLevels) {
        try {
            let levelsData;
            if (typeof rowLevels === 'string') {
                levelsData = JSON.parse(rowLevels);
            } else {
                levelsData = rowLevels;
            }
            
            if (Array.isArray(levelsData)) {
                // Find the level with matching placement_order
                const matchingLevel = levelsData.find((lvl: any) => lvl.placement_order === placement_order);
                if (matchingLevel && matchingLevel.recipient_types) {
                    let recipientTypesData;
                    if (typeof matchingLevel.recipient_types === 'string') {
                        recipientTypesData = JSON.parse(matchingLevel.recipient_types);
                    } else {
                        recipientTypesData = matchingLevel.recipient_types;
                    }
                    
                    if (Array.isArray(recipientTypesData)) {
                        const recipientTypePromises = recipientTypesData.map(async (rt: any) => {
                            if (!rt.meta_data) return null;
                            
                            const userId:any = Object.values(rt.meta_data)[0];
                            if (!userId) return null;
                            
                            // Fetch user data
                            const userData = await fetchUserById(userId, program_id);
                            if (!userData) return null;
                            
                            // Get recipient type info
                            let recipientTypeName = "";
                            if (rt.recipient_type_id) {
                                const rtInfo = await getRecipientTypeInfo(rt.recipient_type_id);
                                if (rtInfo) {
                                    recipientTypeName = rtInfo.name || "";
                                }
                            }
                            
                            // Create recipient object
                            return {
                                user_id: userId,
                                name: `${userData.first_name} ${userData.last_name}`.trim(),
                                first_name: userData.first_name,
                                last_name: userData.last_name,
                                level_id,
                                status: rt.status,
                                updated_on: rt.updated_on,
                                notes: rt.notes,
                                reason: rt.reason,
                                actor_first_name: rt.actor_first_name,
                                actor_last_name: rt.actor_last_name,
                                actor_by_avatar: rt.actor_by_avatar,
                                is_admin_override: rt.is_admin_override,
                                avatar: userData.avatar?.url || '',
                                role_id: userData.role_id,
                                email: userData.email,
                                recipient_type: recipientTypeName,
                                behaviour: rt.behaviour || behaviour
                            };
                        });
                        
                        // Wait for all promises to resolve
                        const recipientResults = await Promise.all(recipientTypePromises);
                        
                        // Filter out null values and add to recipients
                        recipients = recipientResults.filter(r => r !== null);
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing row.levels for level ${level_id}:`, error);
        }
    }
    
    // Check for rejected recipients to update workflow status
    if (recipients && recipients.length > 0) {
        const hasRejectedRecipient = recipients.some((recipient: any) => 
            recipient.status?.toLowerCase() === "rejected"
        );
        
        if (hasRejectedRecipient) {
            workflow.is_rejected_workflow = true;
        }
        
        // Add recipients to the workflow level
        const levelIndex = workflow.levels.findIndex(lvl => lvl.level_id === level_id);
        if (levelIndex !== -1) {
            const level = workflow.levels[levelIndex];
            
            // Add new recipients, avoiding duplicates
            for (const recipient of recipients) {
                const duplicateIndex = level.recipients.findIndex((r: any) => 
                    r.user_id === recipient.user_id
                );
                
                if (duplicateIndex === -1) {
                    // Not a duplicate, add to level
                    level.recipients.push(recipient);
                } else {
                    // If this is a newer record, update the existing one
                    const existingRecipient:any = level.recipients[duplicateIndex];
                    if (recipient.updated_on && (!existingRecipient.updated_on || 
                                               recipient.updated_on > existingRecipient.updated_on)) {
                        level.recipients[duplicateIndex] = recipient;
                    }
                }
            }
        }
    }
    
    // Make sure levels are sorted by placement_order
    workflow.levels.sort((a, b) => a.placement_order - b.placement_order);
}


async function fetchUserById(userId: string, programId: string): Promise<any> {
    try {
        const userQuery = `
            SELECT user_id, first_name, last_name, avatar, role_id, email
            FROM user
            WHERE user_id = :userId
              AND program_id = :programId
              AND LOWER(status) = 'active'
            LIMIT 1;
        `;
        
        const userResult = await sequelize.query(userQuery, {
            type: QueryTypes.SELECT,
            replacements: { userId, programId },
        });
        
        return userResult.length > 0 ? userResult[0] : null;
    } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        return null;
    }
}

/**
 * Get recipient type information
 */
async function getRecipientTypeInfo(recipient_type_id: string) {
    if (!recipient_type_id) return null;
    
    const recipientTypeQuery = `
        SELECT id, name
        FROM recipient_type
        WHERE id = :recipient_type_id
        AND is_enabled = true
        LIMIT 1
    `;
    
    const recipientTypeResult = await sequelize.query(recipientTypeQuery, {
        type: QueryTypes.SELECT,
        replacements: { recipient_type_id },
    });
    
    return recipientTypeResult[0] as Recipient;
}

/**
 * TypeScript interfaces for workflow objects
 */


interface Level {
    level_id: string;
    level_order: number;
    placement_order: number;
    level_status: string;
    behaviour: any;
    recipients:any;
}

/**
 * Find an existing level in the workflow by placement_order and recipient's user_id
 * This is a replacement for the original getExistingLevel function
 * It now checks for duplicate levels based on placement_order rather than level_id
 */
function getPreviousExistingLevel(workflow: Workflow, level_id: string, placement_order: number, recipient_user_id?: string): Level | null {
    // First try to match by level_id (for backward compatibility)
    const levelById = workflow.levels.find(level => level.level_id === level_id);
    if (levelById) return levelById;
    
    // If level_id not found and we have a user_id, try to find by placement_order and recipient user_id
    if (recipient_user_id) {
        const levelByPlacementOrder = workflow.levels.find(level => 
            level.placement_order === placement_order && 
            level.recipients.some(recipient => recipient.user_id === recipient_user_id)
        );
        if (levelByPlacementOrder) return levelByPlacementOrder;
    }
    
    // If no matching level found by either method
    return null;
}

/**
 * Add recipients to workflow, avoiding duplicates
 * This is the key function to fix the duplicate levels issue
 * Now uses placement_order and user_id to detect duplicates instead of just level_id
 */
function addRecipientsToWorkflow(
    workflow: Workflow, 
    recipients:any, 
    level_id: string, 
    placement_order: number, 
    level_status: string, 
    behaviour: any
): void {
    // Skip if no recipients
    if (!recipients.length) return;
    
    // First see if we can find a matching level for the first recipient
    // We use the first recipient's user_id to check for existing levels
    const firstRecipient = recipients[0];
    const existingLevel = getPreviousExistingLevel(workflow, level_id, placement_order, firstRecipient.user_id);
    
    if (existingLevel) {
        // Level exists - add recipients to existing level (avoiding duplicates)
        for (const recipient of recipients) {
            // Check if recipient already exists in this level by user_id
            const duplicateIndex = existingLevel.recipients.findIndex((r:any) => r.user_id === recipient.user_id);
            
            if (duplicateIndex === -1) {
                // Not a duplicate, add to level
                existingLevel.recipients.push(recipient);
            } else {
                // If this is a newer record (has a higher updated_on timestamp), update the existing one
                const existingRecipient:any = existingLevel.recipients[duplicateIndex];
                if (recipient.updated_on && (!existingRecipient.updated_on || recipient.updated_on > existingRecipient.updated_on)) {
                    existingLevel.recipients[duplicateIndex] = recipient;
                }
            }
        }
    } else {
        // Level doesn't exist - create new level with recipients
        workflow.levels.push({
            level_id,
            level_order: placement_order,
            placement_order,
            level_status,
            behaviour,
            recipients: [...recipients] // Create a new array to avoid reference issues
        });
    }
    
    // Sort levels by placement_order to ensure consistent display
    workflow.levels.sort((a, b) => a.placement_order - b.placement_order);
}

/**
 * Process recipients for Specific User, Multiple Users, Job Manager, Assignment Manager types
 */
async function processSpecificUserRecipients(
    recipientType: any, 
    meta_data: any, 
    existing_replaced_user: string, 
    replaced_by: string, 
    imporsonate_by: string, 
    program_id: string, 
    recipient_details: any, 
    level_id: string, 
    recipient_status: string, 
    behaviour: any
) {
    const input_values: any = Object.values(meta_data);
    if (!input_values.length) return [];
    
    // Fetch primary user data
    let userResult = null;
    if (existing_replaced_user) {
        userResult = await fetchUserData(existing_replaced_user, program_id);
    } else {
        userResult = await fetchUserData(input_values[0], program_id);
    }
    
    if (!userResult?.length) return [];
    
    // Fetch replaced user data if applicable
    let replaced_user_data = null;
    if (replaced_by) {
        const replacedUserResult = await fetchUserData(replaced_by, program_id);
        if (replacedUserResult?.length) {
            replaced_user_data = mapReplacedUserData(replacedUserResult[0], recipientType.name, recipient_details, behaviour);
        }
    }
    
    // Fetch impersonated user data if applicable
    let imposonate_user_data = null;
    if (imporsonate_by) {
        const imporsonateUserResult = await fetchUserData(imporsonate_by, program_id);
        if (imporsonateUserResult?.length) {
            imposonate_user_data = mapImporsonateUserData(imporsonateUserResult[0], recipientType.name, recipient_details, behaviour);
        }
    }
    
    // Map user data to recipient format
    const user = userResult[0];
    const input_value = mapUserData(user, recipient_details);
    
    return [{
        name: getName(input_value),
        first_name: input_value.first_name,
        last_name: input_value.last_name,
        level_id,
        status: recipient_status,
        updated_on: recipient_details?.updated_on,
        notes: recipient_details?.notes,
        reason: recipient_details?.reason,
        replaced_date_time: recipient_details?.replaced_modified_on,
        replaced_notes: recipient_details?.replaced_notes,
        user_id: input_value.id,
        actor_first_name: recipient_details?.actor_first_name,
        actor_last_name: recipient_details?.actor_last_name,
        actor_by_avatar: recipient_details?.actor_by_avatar,
        is_admin_override: recipient_details?.is_admin_override,
        avatar: input_value.avatar?.url || '',
        role_id: input_value.role_id,
        email: input_value.email,
        recipient_type: recipientType?.name || '',
        behaviour,
        replaced_by: replaced_user_data,
        imporsonate_by: imposonate_user_data
    }];
}

/**
 * Process recipients for Manager of type
 */
async function processManagerOfRecipients(
    manager: string, 
    existing_replaced_user: string, 
    replaced_by: string, 
    imporsonate_by: string, 
    program_id: string, 
    recipient_details: any, 
    level_id: string, 
    recipient_status: string, 
    recipientType: any, 
    behaviour: any,
    workflow: any
) {
    // Skip if no manager
    if (!manager) return [];
    
    // Get job manager data
    const jobManagerResult = await fetchJobManagerData(manager, program_id);
    if (!jobManagerResult?.length) return [];
    
    const managerData:any = jobManagerResult[0];
    if (!managerData.supervisor) return [];
    
    // Get supervisor data
    let supervisorResult = null;
    if (existing_replaced_user) {
        supervisorResult = await fetchSupervisorData(existing_replaced_user, program_id);
    } else {
        supervisorResult = await fetchSupervisorData(managerData.supervisor, program_id);
    }
    
    if (!supervisorResult?.length) return [];
    
    // Get replaced user data if applicable
    let replaced_user_data = null;
    if (replaced_by) {
        const replacedUserResult = await fetchSupervisorData(replaced_by, program_id);
        if (replacedUserResult?.length) {
            replaced_user_data = mapReplacedUserData(replacedUserResult[0], recipientType.name, recipient_details, behaviour);
        }
    }
    
    // Get impersonated user data if applicable
    let imposonate_user_data = null;
    if (imporsonate_by) {
        const imporsonateUserResult = await fetchSupervisorData(imporsonate_by, program_id);
        if (imporsonateUserResult?.length) {
            imposonate_user_data = mapImporsonateUserData(imporsonateUserResult[0], recipientType.name, recipient_details, behaviour);
        }
    }
    
    // Map supervisor data to input value
    const supervisor:any = supervisorResult[0];
    const supervisorData = {
        id: supervisor.user_id,
        name: `${supervisor.first_name} ${supervisor.last_name}`.trim(),
        email: supervisor.email,
        avatar: supervisor.avatar || null,
        updated_on: recipient_details?.updated_on,
        notes: recipient_details?.notes,
        reason: recipient_details?.reason,
        replaced_notes: recipient_details?.replaced_notes
    };
    
    // Create recipient
    return [{
        name: getName(supervisorData),
        first_name: supervisor.first_name,
        last_name: supervisor.last_name,
        level_id,
        status: recipient_status,
        updated_on: recipient_details?.updated_on,
        notes: recipient_details?.notes,
        reason: recipient_details?.reason,
        replaced_date_time: recipient_details?.replaced_modified_on,
        replaced_notes: recipient_details?.replaced_notes,
        user_id: supervisor.user_id,
        actor_first_name: recipient_details?.actor_first_name,
        actor_last_name: recipient_details?.actor_last_name,
        actor_by_avatar: recipient_details?.actor_by_avatar,
        is_admin_override: recipient_details?.is_admin_override,
        avatar: supervisor.avatar || '',
        role_id: supervisor.role_id,
        email: supervisor.email,
        recipient_type: recipientType?.name || '',
        behaviour,
        replaced_by: replaced_user_data,
        imporsonate_by: imposonate_user_data
    }];
}

/**
 * Process recipients for Custom Field Supplied User type
 */
async function processCustomFieldRecipients(
    levels: any, 
    recipientType: any, 
    replaced_by: string, 
    imporsonate_by: string, 
    program_id: string, 
    recipient_details: any, 
    level_id: string, 
    recipient_status: string, 
    behaviour: any,
    workflow: any
) {
    let userFound = false;
    let userData = null;
    let replacedUserResult = null;
    let imporsonateUserResult = null;
    
    // Loop through each level to find matching recipient
    for (const level of levels || []) {
        for (const recipient of level.recipient_types || []) {
            if (recipient?.meta_data && recipientType?.id == recipient.recipient_type_id) {
                const metaData = recipient.meta_data;
                let userId:any = Object.values(metaData)[0];
                
                // Use existing_replaced_user if available
                if (recipient.existing_replaced_user) {
                    userId = recipient.existing_replaced_user;
                }
                
                // Fetch user data
                const userResult = await fetchUserData(userId, program_id);
                if (!userResult?.length) continue;
                
                userFound = true;
                const user:any = userResult[0];
                
                // Fetch replaced user data if applicable
                if (replaced_by) {
                    replacedUserResult = await fetchUserData(replaced_by, program_id);
                }
                
                // Fetch impersonated user data if applicable
                if (imporsonate_by) {
                    imporsonateUserResult = await fetchUserData(imporsonate_by, program_id);
                }
                
                // Map user data
                userData = {
                    id: user.user_id,
                    name: `${user.first_name}${" "}${user.last_name}`,
                    email: user.email,
                    avatar: user.avatar,
                    updated_on: recipient_details?.updated_on,
                    notes: recipient_details?.notes,
                    reason: recipient_details?.reason,
                    replaced_notes: recipient_details?.replaced_notes
                };
                
                // Exit early once we found a matching user
                break;
            }
        }
        if (userFound) break;
    }
    
    if (!userData) return [];
    
    // Process replaced user data
    let replaced_user_data = null;
    if (replacedUserResult?.length) {
        replaced_user_data = mapReplacedUserData(replacedUserResult[0], recipientType.name, recipient_details, behaviour);
    }
    
    // Process impersonated user data
    let imposonate_user_data = null;
    if (imporsonateUserResult?.length) {
        imposonate_user_data = mapImporsonateUserData(imporsonateUserResult[0], recipientType.name, recipient_details, behaviour);
    }
    
    // Create recipient
    return [{
        name: getName(userData),
        first_name: userData.name.split(' ')[0],
        last_name: userData.name.split(' ').slice(1).join(' '),
        level_id,
        status: recipient_status,
        updated_on: recipient_details?.updated_on,
        notes: recipient_details?.notes,
        reason: recipient_details?.reason,
        replaced_date_time: recipient_details?.replaced_modified_on,
        replaced_notes: recipient_details?.replaced_notes,
        user_id: userData.id,
        actor_first_name: recipient_details?.actor_first_name,
        actor_last_name: recipient_details?.actor_last_name,
        actor_by_avatar: recipient_details?.actor_by_avatar,
        is_admin_override: recipient_details?.is_admin_override,
        avatar: userData.avatar || '',
        email: userData.email,
        recipient_type: recipientType?.name || '',
        behaviour,
        replaced_by: replaced_user_data,
        imporsonate_by: imposonate_user_data
    }];
}

/**
 * Process recipients for role-based recipient types
 */
async function processRoleBasedRecipients(
    recipient_types: string,
    level_id: string,
    behaviour: any,
    recipientType: any,
    program_id: string,
    recipient_details: any,
    workflow: any
) {
    if (!recipient_types) return [];
    
    const recipientTypes = JSON.parse(recipient_types);
    const users = [];
    
    // Process each recipient type
    for (const recipient of recipientTypes) {
        if (!recipient?.meta_data) continue;
        
        const metaData = recipient.meta_data;
        let userId:any = Object.values(metaData)[0];
        const level_behaviour = Object.values(metaData)[1];
        
        // Use existing_replaced_user if available
        if (recipient.existing_replaced_user) {
            userId = recipient.existing_replaced_user;
        }
        
        // Fetch user data
        const user:any = await fetchLevelUserData(userId, program_id);
        if (!user) continue;
        
        // Build user data object
        const userData: any = {
            id: user.user_id,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar: user.avatar,
            role_id: user.role_id,
            email: user.email,
            receipentstatus: recipient.status,
            modifiedOn: recipient.updated_on,
            level_behaviour: level_behaviour,
            replaced_by: null,
            impersonate_by: null,
            updated_on: recipient.updated_on,
            notes: recipient.notes,
            reason: recipient.reason,
            actor_first_name: recipient.actor_first_name,
            actor_last_name: recipient.actor_last_name,
            actor_by_avatar: recipient.actor_by_avatar,
            is_admin_override: recipient.is_admin_override,
            replaced_notes: recipient.replaced_notes
        };
        
        // Process replaced_by user if applicable
        if (recipient.replaced_by) {
            const replacedByUser:any = await fetchLevelUserData(recipient.replaced_by, program_id);
            if (replacedByUser) {
                userData.replaced_by = {
                    id: replacedByUser.user_id,
                    first_name: replacedByUser.first_name,
                    last_name: replacedByUser.last_name,
                    email: replacedByUser.email,
                    avatar: replacedByUser.avatar,
                    role_id: replacedByUser.role_id,
                    replaced_notes: recipient.replaced_notes,
                    replaced_date_time: recipient.replaced_modified_on,
                    actor_first_name: recipient.actor_first_name,
                    actor_last_name: recipient.actor_last_name,
                    actor_by_avatar: recipient.actor_by_avatar,
                    is_admin_override: recipient.is_admin_override,
                };
            }
        }
        
        // Process impersonate_by user if applicable
        if (recipient.impersonate_by) {
            const impersonatedUser:any = await fetchLevelUserData(recipient.impersonate_by, program_id);
            if (impersonatedUser) {
                userData.impersonate_by = {
                    id: impersonatedUser.user_id,
                    first_name: impersonatedUser.first_name,
                    last_name: impersonatedUser.last_name,
                    email: impersonatedUser.email,
                    avatar: impersonatedUser.avatar,
                    role_id: impersonatedUser.role_id,
                    updated_on: recipient_details?.updated_on,
                    impersonate_notes: recipient.impersonate_notes,
                    impersonate_date_time: recipient.impersonate_modified_on,
                    actor_first_name: recipient.actor_first_name,
                    actor_last_name: recipient.actor_last_name,
                    actor_by_avatar: recipient.actor_by_avatar,
                    is_admin_override: recipient.is_admin_override,
                };
            }
        }
        
        users.push(userData);
    }
    
    // Map users to the final recipients format
    return users.map(user => {
        return {
            name: `${user.first_name} ${user.last_name}`.trim(),
            first_name: user.first_name,
            last_name: user.last_name,
            level_id,
            status: user.receipentstatus,
            updated_on: user.updated_on,
            notes: user.notes,
            reason: user.reason,
            actor_first_name: user.actor_first_name,
            actor_last_name: user.actor_last_name,
            actor_by_avatar: user.actor_by_avatar,
            is_admin_override: user.is_admin_override,
            user_id: user.id,
            avatar: user.avatar?.url || '',
            role_id: user.role_id,
            email: user.email,
            level_behaviour: user.level_behaviour,
            replaced_by: user.replaced_by,
            impersonate_by: user.impersonate_by,
            recipient_type: recipientType?.name || '',
            behaviour,
        };
    });
}

export const getModuleEvent = async (
    request: FastifyRequest<{ Querystring: { candidate_id: string; job_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const { candidate_id, job_id } = request.query;

    try {
        const results: any[] = await sequelize.query(
            `
           WITH ranked_workflows AS (
               SELECT 
                   jw.workflow_trigger_id,
                   m.name AS module_name,
                   e.name AS event_name,
                   e.slug AS event_slug,
                   jw.created_on,
                   ROW_NUMBER() OVER (
                       PARTITION BY e.slug
                       ORDER BY jw.created_on DESC
                   ) AS rn
               FROM 
                   workflow AS jw
               LEFT JOIN 
                   module AS m ON jw.module_type = m.name
               LEFT JOIN 
                   event AS e ON jw.event_id = e.id
               WHERE 
                   jw.candidate_id = :candidate_id
                   AND jw.program_id = :program_id
                   AND jw.job_id = :job_id
                   AND jw.is_deleted = false
           )
           SELECT 
               workflow_trigger_id,
               module_name,
               event_name,
               event_slug
           FROM 
               ranked_workflows
           WHERE 
               event_slug != 'counter_offer' OR (event_slug = 'counter_offer' AND rn = 1)
           ORDER BY 
               created_on DESC
           `,
            {
                replacements: {
                    candidate_id,
                    program_id,
                    job_id,
                },
                type: QueryTypes.SELECT,
            }
        );
console.log("results is the ", results)
        const groupedData: Record<string, any[]> = {};

        results.forEach((workflow: any) => {
            const moduleName = workflow.module_name || '';
            const eventName = workflow.event_name || null;
            const eventSlug = workflow.event_slug || null;

            if (!groupedData[moduleName]) {
                groupedData[moduleName] = [];
            }

            const isDuplicate = groupedData[moduleName].some(
                (event) =>
                    event.event === eventName &&
                    event.event_slug === eventSlug
            );

            if (!isDuplicate) {
                groupedData[moduleName].push({
                    event: eventName,
                    workflow_trigger_id: workflow.workflow_trigger_id,
                    event_slug: eventSlug,
                });
            }
        });

        const data = Object.entries(groupedData).map(([moduleName, events]) => ({
            [moduleName]: events.sort((a, b) => {
                if (a.event_slug === 'submit_candidate_rehire_check') return -1;
                if (b.event_slug === 'submit_candidate_rehire_check') return 1;
                return 0;
            }),
        }));

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Module and events fetched successfully.',
            data,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            error: error,
        });
    }
};
// export const sendSequencialNotification = async (
//     request: FastifyRequest<{ Params: { program_id: string, job_workflow_id: string } }>,
//     reply: FastifyReply
// ) => {
//     const workflow = request.body as NotificationPayload;
//     console.log(workflow);

//     const traceId = generateCustomUUID();
//     const { program_id, job_workflow_id } = request.params;

//     const authHeader = request.headers.authorization;
//     if (!authHeader?.startsWith('Bearer ')) {
//         return reply.status(401).send({ message: 'Unauthorized - Token not found' });
//     }

//     const token = authHeader.split(' ')[1];
//     const user: any = await decodeToken(token);
//     if (!user) {
//         return reply.status(401).send({ message: "Unauthorized - Invalid token" });
//     }
//     try {
//         let query: any[] = await sequelize.query(`select * from workflow where id=:job_workflow_id;`, {
//             replacements: { job_workflow_id: job_workflow_id },
//             type: QueryTypes.SELECT
//         });
//         let workflowData = query[0]
//         const matchedLevel = workflowData.levels.slice(1).find((level: any) => level.placement_order == workflow.placement_order);
//         console.log(matchedLevel);

//         let userIds: any = []
//         if (matchedLevel?.recipient_types) {
//             userIds = matchedLevel.recipient_types
//                 .flatMap((recipient: any) => Object.values(recipient.meta_data || {}));

//             console.log("Extracted User IDs:", userIds);
//         }
//         const placementOrder = workflowData.placement_order;

//         // 1. Check if the log already exists in send-notification-logs
//         const existingLog = await sendNotificationModel.findOne({
//             where: {
//                 program_id,
//                 workflow_id: job_workflow_id,
//                 placement_order: placementOrder,

//             },
//         });

//         if (existingLog) {
//             return reply.status(200).send({ message: "Notification already sent for this placement order." });
//         }
//         const users = await getUserData(userIds, sequelize);
//         console.log(users);


//         if (!users || users.length === 0) {
//             return reply.status(404).send({ message: "No valid users found for the provided IDs." });
//         }
//         const recipientEmailList: EmailRecipient[] = users.map((user: any) => ({
//             id: user.id,
//             email: user.email,
//             first_name: user.first_name,
//             last_name: user.last_name,
//         }));

//         let eventCode = await getTriggeredEventsCode(workflowData.flow_type, workflowData.events)
//         // 4. Create the notification payload
//         const notificationPayloads: NotificationDataPayload = {
//             program_id,
//             traceId,
//             eventCode: eventCode,
//             recipientEmail: recipientEmailList,
//             payload: {
//                 job_id: workflow.job_id,
//                 user_type: user?.userType,
//             },
//             token,
//             userId: user?.sub ?? "",
//         };

//         // 5. Send notifications
//         await sendNotification(notificationPayloads);
//         console.log("notificationPayloads", notificationPayloads);

//         // 6. Log the notification status
//         await sendNotificationModel.create({
//             program_id,
//             workflow_id: job_workflow_id,
//             placement_order: placementOrder,
//             created_by: user.sub,

//         });
//         reply.status(200).send({ message: "Notification sent successfully and logged." });
//     } catch (error) {

//         console.error(error);
//         reply.status(500).send({
//             status_code: 500,
//             message: 'An error occurred while creating job workflow.',
//             trace_id: traceId,
//             error: (error as any).message,
//         });
//     }
// };

export async function getUnifiedWorkflowHandler(request: FastifyRequest, reply: FastifyReply) {
    const trace_id = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const authHeader = request.headers.authorization;

    // Quick authentication check
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    
    try {
        // Optimize: Decode token asynchronously while fetching data to parallelize operations
        const userPromise = decodeToken(token);
        
        // Extract common query parameters
        const queryParams = request.query as Record<string, any>;
        const { workflow_trigger_id, hierarchy_id } = queryParams;
        let hierarchy_ids = hierarchy_id.split(",").map((id: string) => id.trim());
        
        // Determine which type of workflow request this is
        const isUpdateWorkflow = !!queryParams.workflow_action;
        
        // OPTIMIZATION: Dramatically reduce query complexity by only selecting needed fields
        // This will reduce database processing time and network transfer
        const minimalSelectPart = `
            SELECT
                w.id As job_workflow_id,
                w.workflow_id,
                w.event_id,
                w.event_title,
                w.name AS workflow_name,
                w.flow_type AS workflow_type,
                w.levels,
                w.status,
                w.config,
                w.manager,
                l.id AS level_id,
                l.placement_order,
                r.recipient_type_id,
                r.meta_data,
                r.behaviour,
                e.slug AS event_slug,
                JSON_UNQUOTE(JSON_EXTRACT(w.levels, CONCAT('$[', l.placement_order, '].status'))) AS level_status
            FROM
                workflow w
            INNER JOIN workflow_triggered_level l ON l.workflow_id = w.workflow_id AND l.workflow_trigger_id = w.workflow_trigger_id
            LEFT JOIN workflow_triggered_recepient r ON r.level_id = l.id
            LEFT JOIN event e ON w.event_id = e.id
        `;
        
        // OPTIMIZATION: Fetch only 1 record for the non-update workflow case, since we only use the first one
        let query: string;
        let rows: any[];
        
        if (isUpdateWorkflow) {
            // CASE 1: Update workflow approval handling
            const { workflow_action } = queryParams;
            
            // OPTIMIZATION: Limit query to just what's needed and add indexes/query hints if available
            query = `${minimalSelectPart}
            WHERE
                w.program_id = :program_id
                AND w.flow_type = :workflow_action
                AND w.workflow_trigger_id = :workflow_trigger_id
                AND w.is_updated = true
                AND JSON_OVERLAPS(w.hierarchies, JSON_ARRAY(${hierarchy_ids?.map((id: string) => `"${id}"`).join(',')}))
            ORDER BY
                l.placement_order ASC
            LIMIT 50; /* Reduced limit from 100 to 50 */
            `;

            // OPTIMIZATION: Execute user token verification and database query in parallel
            const [user, queryRows] = await Promise.all([
                userPromise,
                sequelize.query(query, {
                    replacements: { workflow_action, program_id, workflow_trigger_id },
                    type: QueryTypes.SELECT,
                })
            ]);
            
            if (!user) {
                return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
            }
            
            rows = queryRows;
            
            if (rows.length === 0) {
                return reply.status(200).send({
                    statusCode: 200,
                    message: 'Workflow data not found',
                    workflow: [],
                    trace_id,
                });
            }
            
            // OPTIMIZATION: Simpler data processing with Map/Set for O(1) lookups
            const uniqueWorkflowIds = new Set<string>();
            for (const row of rows) {
                uniqueWorkflowIds.add(row.job_workflow_id);
            }
            
            // Use a faster workflow instantiation method
            const workflows: Record<string, any> = {};
            for (const id of uniqueWorkflowIds) {
                const sampleRow = rows.find(r => r.job_workflow_id === id);
                workflows[id as string] = {
                    program_id: program_id,
                    job_workflow_id: id,
                    workflow_id: sampleRow.workflow_id,
                    event_title: sampleRow.event_title,
                    workflow_name: sampleRow.workflow_name,
                    workflow_type: sampleRow.workflow_type,
                    event_slug: sampleRow.event_slug,
                    status: sampleRow.status,
                    config: sampleRow.config,
                    levels: [],
                    is_rejected_workflow: sampleRow.status?.toLowerCase() === "rejected"
                };
            }
            
            // OPTIMIZATION: Efficient data collection for batch operations
            const recipientTypeIds = new Set<string>();
            const userIds = new Set<string>();
            const recipientRowMap = new Map<string, any[]>(); // level -> rows

            // One-pass data collection
            for (const row of rows) {
                const levelKey = `${row.job_workflow_id}-${row.level_id}`;
                
                if (row.recipient_type_id) {
                    recipientTypeIds.add(row.recipient_type_id);
                }
                
                if (row.meta_data) {
                    const values = Object.values(row.meta_data);
                    for (const v of values) {
                        if (v && typeof v === 'string') userIds.add(v);
                    }
                }
                
                // Group rows by level for easier processing
                if (!recipientRowMap.has(levelKey)) {
                    recipientRowMap.set(levelKey, []);
                }
                recipientRowMap.get(levelKey)?.push(row);
            }
            
            // OPTIMIZATION: Execute all database lookups in parallel
            const [recipientTypes, users] = await Promise.all([
                // Only fetch if there are recipient types to fetch
                recipientTypeIds.size > 0 ? 
                    sequelize.query(
                        `SELECT id, name FROM recipient_type 
                         WHERE id IN (:recipient_type_ids) AND is_enabled = true`,
                        {
                            type: QueryTypes.SELECT,
                            replacements: { recipient_type_ids: [...recipientTypeIds] },
                        }
                    ) : Promise.resolve([]),
                
                // Only fetch if there are user IDs to fetch
                userIds.size > 0 ?
                    sequelize.query(
                        `SELECT user_id, first_name, last_name, avatar, role_id, email, supervisor
                         FROM user
                         WHERE user_id IN (:user_ids) AND program_id = :program_id AND LOWER(status) = 'active'`,
                        {
                            type: QueryTypes.SELECT,
                            replacements: { user_ids: [...userIds], program_id },
                        }
                    ) : Promise.resolve([])
            ]);
            
            // Create lookup maps for fast access
            const recipientTypesMap: Record<string, any> = {};
            for (const type of recipientTypes) {
                // Fix TypeScript error by using type assertion
                const typeObj = type as any;
                recipientTypesMap[typeObj.id] = typeObj;
            }
            
            const usersMap: Record<string, any> = {};
            for (const user of users) {
                // Fix TypeScript error by using type assertion
                const userObj = user as any;
                usersMap[userObj.user_id] = userObj;
            }
            
            // OPTIMIZATION: Simplified processing with fewer loops
            // Process each level only once
            for (const [levelKey, levelRows] of recipientRowMap.entries()) {
                const [workflowId, levelId] = levelKey.split('-');
                const workflow = workflows[workflowId];
                const firstRow = levelRows[0];
                
                if (!firstRow.meta_data || Object.keys(firstRow.meta_data).length === 0) {
                    continue;
                }
                
                const recipientType = recipientTypesMap[firstRow.recipient_type_id];
                if (!recipientType) continue;
                
                // Process recipient data more efficiently
                const recipients = [];
                
                // Process just what we need based on meta_data
                const input_values = Object.values(firstRow.meta_data);
                
                // OPTIMIZATION: Simplified recipient creation - focus on the minimal viable logic
                if (input_values.length > 0) {
                    const userId = firstRow.existing_replaced_user || input_values[0];
                    const user = usersMap[userId];
                    
                    if (user) {
                        recipients.push({
                            name: `${user.first_name} ${user.last_name}`.trim(),
                            first_name: user.first_name,
                            last_name: user.last_name,
                            level_id: levelId,
                            status: firstRow.recipient_status,
                            user_id: user.user_id,
                            avatar: user.avatar?.url || '',
                            role_id: user.role_id,
                            email: user.email,
                            recipient_type: recipientType?.name || '',
                            behaviour: firstRow.behaviour,
                        });
                    }
                }
                
                if (recipients.length > 0) {
                    workflow.levels.push({
                        level_id: levelId,
                        level_order: firstRow.placement_order,
                        placement_order: firstRow.placement_order,
                        level_status: firstRow.level_status,
                        behaviour: firstRow.behaviour,
                        recipients
                    });
                }
            }
            
            // OPTIMIZATION: Process status handling in parallel with minimal data
            // Replace with a simplified version if possible
            const statusHandlingPromises = Object.values(workflows).map(workflow => {
                return statusHandling(request, reply, workflow).catch(err => {
                    console.error("Error in status handling:", err);
                    // Continue despite errors
                });
            });

            // Wait for status handling but with a timeout
            await Promise.race([
                Promise.all(statusHandlingPromises),
                new Promise(resolve => setTimeout(resolve, 2000)) // 2 second timeout
            ]);
            
            return reply.status(200).send({
                statusCode: 200,
                workflows: Object.values(workflows),
                trace_id,
            });
        } else {
            // CASE 2: Regular workflow approval handling
            const { method_id } = queryParams;
            const methodIds = method_id.split(',');
            // OPTIMIZATION: For regular workflow, we only use the first result, so limit to 1
            // after ordering by priority (pending first, then completed)
            const optimizedQuery = `${minimalSelectPart}
            WHERE
                w.program_id = :program_id
                AND w.workflow_trigger_id = :workflow_trigger_id
                AND w.is_updated = false
                AND FIND_IN_SET(w.method_id, :method_ids) > 0
                AND JSON_OVERLAPS(w.hierarchies, JSON_ARRAY(${hierarchy_ids?.map((id: string) => `"${id}"`).join(',')}))
                AND w.is_enabled = true
                AND w.status IN ('pending', 'completed')
            ORDER BY
                FIELD(w.status, 'pending', 'completed'),
                FIELD(w.method_id, ${methodIds.map((id:any) => `'${id}'`).join(',')}),
                l.placement_order ASC
            LIMIT 50;
            `;
            
             // OPTIMIZATION: Execute all queries in parallel to save time
            const [user, queryRows, flowTypesData] = await Promise.all([
                userPromise,
                sequelize.query(optimizedQuery, {
                    replacements: {
                        method_ids: methodIds.join(','),
                        program_id,
                        workflow_trigger_id
                    },
                    type: QueryTypes.SELECT,
                }),
                sequelize.query(
                    `SELECT flow_type, status FROM workflow 
                     WHERE workflow_trigger_id = :workflow_trigger_id AND (status = "pending" OR status = "completed")
                     AND program_id = :program_id
                     LIMIT 1`, // Limit to avoid excessive results
                    {
                        replacements: { workflow_trigger_id, program_id },
                        type: QueryTypes.SELECT,
                    }
                )
            ]);
            
            if (!user) {
                return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
            }
            
            rows = queryRows;
            // Log job creation asynchronously if request body exists - don't wait for it
            if (request.body) {
                const initialJobData = request.body as JobWorkFlow;
                logger({
                    actor: {
                        user_name: user?.preferred_username,
                        user_id: user?.sub,
                    },
                    data: initialJobData,
                    eventname: "creating job",
                    status: "info",
                    description: `Creating job for ${program_id}`,
                    level: 'info',
                    action: request.method,
                    url: request.url,
                    entity_id: program_id,
                    is_deleted: false
                }, JobWorkFlowModel).catch(err => console.error("Logging error:", err));
            }
            
             // Process flow types
            const flowTypeStatusMap = new Map<string, boolean>();
            
            for (const program of flowTypesData) {
                const { flow_type, status } = program as any;
                
                if (!flowTypeStatusMap.has(flow_type)) {
                    flowTypeStatusMap.set(flow_type, status === "completed");
                } else {
                    const currentStatus = flowTypeStatusMap.get(flow_type);
                    if (status === "pending") {
                        flowTypeStatusMap.set(flow_type, false);
                    } else if (status === "completed" && currentStatus !== false) {
                        flowTypeStatusMap.set(flow_type, true);
                    }
                }
            }
            
            const flowTypes = Array.from(flowTypeStatusMap.entries())
                .map(([flow_type, is_completed]) => ({ flow_type, is_completed }))
                .sort((a, b) => {
                    if (a.flow_type === "Review") return -1;
                    if (b.flow_type === "Review") return 1;
                    return 0;
                });
            
            if (rows.length === 0) {
                return reply.status(200).send({
                    statusCode: 200,
                    flowTypes: flowTypes,
                    message: 'Workflow data not found',
                    workflow: [],
                    trace_id,
                });
            }
            
            // OPTIMIZATION: Since this code path only uses the first workflow, 
            // filter data more aggressively
            
            // Group rows by workflow ID to get the first one
            const workflowIds = new Set<string>();
            for (const row of rows) {
                workflowIds.add(row.job_workflow_id);
            }
            
            if (workflowIds.size === 0) {
                return reply.status(200).send({
                    statusCode: 200,
                    flowTypes: flowTypes,
                    message: 'Workflow data not found',
                    workflow: [],
                    trace_id,
                });
            }
            
            // Get the first workflow ID (should be pending if available)
            const workflowId = [...workflowIds][0];
            const workflowRows = rows.filter(row => row.job_workflow_id === workflowId);
            const firstRow = workflowRows[0];
            
            const workflow: any = {
                program_id: program_id,
                job_workflow_id: firstRow.job_workflow_id,
                workflow_id: firstRow.workflow_id,
                workflow_name: firstRow.workflow_name,
                workflow_type: firstRow.workflow_type,
                event_title: firstRow.event_title,
                event_slug: firstRow.event_slug,
                status: firstRow.status,
                config: firstRow.config,
                levels: [],
            };
            
            // OPTIMIZATION: Use optimized version that directly processes the data
            // instead of making additional queries
            // Start this processing immediately
            const getLevelDataPromise = getLevelData(request, reply, workflowRows, workflow, firstRow?.manager);
            
            // OPTIMIZATION: Start notification in background without awaiting
            // This can happen completely asynchronously
            setTimeout(() => {
                sendNotificationSequencially(request, reply, workflow)
                    .catch(err => console.error('Error sending notifications:', err));
            }, 100);
            
            // Only wait for level data
            await getLevelDataPromise;
            
            return reply.status(200).send({
                statusCode: 200,
                flowTypes: flowTypes,
                workflow,
                trace_id,
            });
        }
    } catch (error: any) {
        console.log(error);
        return reply.status(500).send({
            statusCode: 500,
            message: 'An error occurred while fetching workflow data.',
            trace_id,
        });
    }
}

async function getTriggeredEventsCode(flow_type: any, event: any) {
    if (flow_type === "Approval" && event === "create_job") {
        return NotificationEventCode.JOB_APPROVAL_FIRST;
    } else if (flow_type === "Review" && event === "create_job") {
        return NotificationEventCode.JOB_REVIEW_FIRST;
    } else if (flow_type === "Review" && event === "update_job") {
        return NotificationEventCode.JOB_UPDATE_REVIEW;
    } else if (flow_type === "Approval" && event === "update_job") {
        return NotificationEventCode.JOB_UPDATE_APPROVAL;
    } else if (flow_type === "Review" && event === "create_offer") {
        return NotificationEventCode.OFFER_REVIEW_FIRST;
    } else if (flow_type === "Approval" && event === "create_offer") {
        return NotificationEventCode.OFFER_APPROVAL_FIRST;
    } else if (flow_type === "Review" && event === "counter_offer") {
        return NotificationEventCode.COUNTER_OFFER_REVIEW_FIRST;
    } else if (flow_type === "Approval" && event === "counter_offer") {
        return NotificationEventCode.COUNTER_OFFER_APPROVAL_FIRST;
    } else if (flow_type === "Approval" && event === "create_assignment") {
        return NotificationEventCode.ASSIGNMENT_APPROVAL_REQUEST;
    } else if (flow_type === "Approval" && event === "submit_timesheet") {
        return NotificationEventCode.SUBMIT_TIMESHEET;
    } else if (flow_type === "Approval" && event === "update_assignment") {
        return NotificationEventCode.ASSIGNMENT_MODIFIED_APPROVAL;
    } else if (flow_type === "Review" && event === "submit_candidate_rehire_check") {
        return NotificationEventCode.REHIRE_REVIEW;
    } else if (flow_type === "Review" && event === "submit_candidate_rehire_check") {
        return NotificationEventCode.DO_NOT_REHIRE_REVIEW;
    } else if (flow_type === "Review" && event === "submit_candidate_shortlist") {
        return NotificationEventCode.CANDIDATE_SHORTLIST_REQUEST_FIRST;
    } else if (flow_type === "Approval" && event === "submit_candidate_rehire_check") {
        return NotificationEventCode.RE_HIRE_APPROVAL;
    } else {
         return null
        // throw new Error(`Event code not found for event: ${event}`);
    }
}
async function getUserData(userIds: any[], sequelize: any): Promise<any[]> {
    if (!userIds || userIds.length === 0) {
        return []; // Return empty array if no user IDs are provided
    }

    const userQuery = `
        SELECT
            id,
            first_name,
            last_name,
            email,
            avatar,
            role_id,
            is_enabled
        FROM
            user
        WHERE
            id IN (:userIds)
            AND LOWER(status) = 'active'
    `;

    try {
        // Fetch all user data matching the provided user IDs
        const users = await sequelize.query(userQuery, {
            type: QueryTypes.SELECT,
            replacements: { userIds },
        });

        // Map the results into an array of objects
        const userData = users.map((user: any) => ({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            avatar: user.avatar || null,
            role_id: user.role_id,
        }));

        return userData;
    } catch (error) {
        console.error("Error fetching user data:", error);
        throw new Error("Unable to fetch user data.");
    }
}

export async function getWorkflowForJob(request: FastifyRequest, reply: FastifyReply) {
    const trace_id = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    const initialJobData = request.body as JobWorkFlow;
    logger({
        actor: {
            user_name: user?.preferred_username,
            user_id: user?.sub,
        },
        data: initialJobData,
        eventname: "creating job",
        status: "info",
        description: `Creating job for ${program_id}`,
        level: 'info',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
    }, JobWorkFlowModel);
    try {
        const { method_id, job_id, workflow_trigger_id, hierarchy_id, workflow_id } = request.query as {
            method_id: string;
            job_id?: string;
            workflow_trigger_id: string;
            hierarchy_id: any, 
            workflow_id: string;
        };
        let workflowIdCondition = '';
        if (workflow_id) {
            workflowIdCondition = 'AND id = :workflow_id';
        }
        console.log('workflowIdCondition', workflowIdCondition)
        const methodIds = method_id.split(',');
        const query = `
            SELECT
            w.id As job_workflow_id,
                w.workflow_id AS workflow_id,
                 w.event_id AS event_id,
                   w.event_title AS event_title,
                w.name AS workflow_name,
                w.flow_type AS workflow_type,
                w.levels,
                w.status,
                w.config,
                w.manager,
                l.id AS level_id,
                l.placement_order AS placement_order,
            r.recipient_type_id,
                r.meta_data,
                r.behaviour,
                  e.name,
        e.slug AS event_slug,
                JSON_UNQUOTE(
                    JSON_EXTRACT(
                        w.levels,
                        CONCAT(
                            '$[',
                            l.placement_order,
                            '].status'
                        )
                    )
                ) AS level_status,

                 JSON_UNQUOTE(
                    JSON_EXTRACT(
                        w.levels,
                        CONCAT(
                            '$[',
                            l.placement_order,
                            '].recipient_types'
                        )
                    )
                ) AS recipient_types,
                (
            SELECT JSON_UNQUOTE(
                JSON_EXTRACT(
                    recipient.value, '$.replaced_by'
                )
            )
            FROM JSON_TABLE(
                JSON_EXTRACT(
                    w.levels,
                    CONCAT(
                        '$[',
                        l.placement_order,
                        '].recipient_types'
                    )
                ),
                '$[*]' COLUMNS (
                    value JSON PATH '$'
                )
            ) AS recipient
            WHERE JSON_EXTRACT(recipient.value, '$.replaced_by') IS NOT NULL
            LIMIT 1
        ) AS replaced_by,
         (
                SELECT JSON_UNQUOTE(
                    JSON_EXTRACT(
                        recipient.value, '$.managerId'
                    )
                )
                FROM JSON_TABLE(
                    JSON_EXTRACT(
                        w.levels,
                        CONCAT(
                            '$[',
                            l.placement_order,
                            '].recipient_types'
                        )
                    ),
                    '$[*]' COLUMNS (
                        value JSON PATH '$'
                    )
                ) AS recipient
                WHERE JSON_EXTRACT(recipient.value, '$.managerId') IS NOT NULL
                LIMIT 1
            ) AS manager_id,
               JSON_UNQUOTE(
                    JSON_EXTRACT(
                        w.levels,
                        CONCAT(
                            '$[',
                            l.placement_order,
                            '].recipient_types'
                        )
                    )
                ) AS recipient_types,
                (
            SELECT JSON_UNQUOTE(
                JSON_EXTRACT(
                    recipient.value, '$.existing_replaced_user'
                )
            )
            FROM JSON_TABLE(
                JSON_EXTRACT(
                    w.levels,
                    CONCAT(
                        '$[',
                        l.placement_order,
                        '].recipient_types'
                    )
                ),
                '$[*]' COLUMNS (
                    value JSON PATH '$'
                )
            ) AS recipient
            WHERE JSON_EXTRACT(recipient.value, '$.existing_replaced_user') IS NOT NULL
            LIMIT 1
        ) AS existing_replaced_user,
 JSON_UNQUOTE(
                    JSON_EXTRACT(
                        w.levels,
                        CONCAT(
                            '$[',
                            l.placement_order,
                            '].recipient_types'
                        )
                    )
                ) AS recipient_types,
                (
            SELECT JSON_UNQUOTE(
                JSON_EXTRACT(
                    recipient.value, '$.imporsonate_by'
                )
            )
            FROM JSON_TABLE(
                JSON_EXTRACT(
                    w.levels,
                    CONCAT(
                        '$[',
                        l.placement_order,
                        '].recipient_types'
                    )
                ),
                '$[*]' COLUMNS (
                    value JSON PATH '$'
                )
            ) AS recipient
            WHERE JSON_EXTRACT(recipient.value, '$.imporsonate_by') IS NOT NULL
            LIMIT 1
        ) AS imporsonate_by,
(
    SELECT JSON_OBJECT(
        'status', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.status')), NULL),
        'updated_on', IFNULL(CAST(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.updated_on')) AS UNSIGNED), NULL),
        'notes', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.notes')), NULL),
        'reason', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.reason')), NULL),
         'actor_first_name', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.actor_first_name')), NULL),
          'actor_last_name', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.actor_last_name')), NULL),
         'actor_by_avatar',NULLIF(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.actor_by_avatar')), 'null'),
         'is_admin_override', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.is_admin_override')), NULL),
        'replaced_notes', IFNULL(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_notes')), NULL),
         'replaced_modified_on', IFNULL(CAST(JSON_UNQUOTE(JSON_EXTRACT(recipient.value, '$.replaced_modified_on')) AS UNSIGNED), NULL)
    )
    FROM JSON_TABLE(
        JSON_EXTRACT(
            w.levels,
            CONCAT('$[', l.placement_order, '].recipient_types')
        ),
        '$[*]' COLUMNS (
            value JSON PATH '$'
        )
    ) AS recipient
    WHERE JSON_EXTRACT(recipient.value, '$.status') IS NOT NULL
    LIMIT 1
) AS recipient_details,

         (
            SELECT JSON_UNQUOTE(
                JSON_EXTRACT(
                    recipient.value, '$.status'
                )
            )
            FROM JSON_TABLE(
                JSON_EXTRACT(
                    w.levels,
                    CONCAT(
                        '$[',
                        l.placement_order,
                        '].recipient_types'
                    )
                ),
                '$[*]' COLUMNS (
                    value JSON PATH '$'
                )
            ) AS recipient
            WHERE JSON_EXTRACT(recipient.value, '$.status') IS NOT NULL
            LIMIT 1
        ) AS recipient_status
            FROM
                workflow  w
            INNER JOIN workflow_triggered_level l ON l.workflow_id = w.workflow_id AND l.workflow_trigger_id = w.workflow_trigger_id
            LEFT JOIN workflow_triggered_recepient r ON r.level_id = l.id
            LEFT JOIN event e
        ON w.event_id = e.id
         WHERE
    w.program_id = :program_id
    AND w.workflow_trigger_id = :workflow_trigger_id
    AND w.is_updated = false
    AND FIND_IN_SET(w.method_id, :method_ids) > 0
    AND w.method_id = (
        SELECT method_id
        FROM (
            SELECT method_id
            FROM workflow
            WHERE
                program_id = :program_id
                AND FIND_IN_SET(method_id, :method_ids) > 0
                AND workflow_trigger_id = :workflow_trigger_id
                AND is_updated = false
                 ${workflowIdCondition}
                AND is_enabled = true
                AND status='pending'
            ORDER BY FIELD(method_id, ${methodIds.map((id) => `'${id}'`).join(',')})
            LIMIT 1
        ) AS prioritized_method
    )
ORDER BY
    FIELD(w.method_id, ${methodIds.map((id) => `'${id}'`).join(',')}),
    w.created_on DESC;`;
        console.log('Hitting the query hereee');
        const rows: any[] = await sequelize.query(query, {
            replacements: {
                method_ids: methodIds.join(','),
                program_id,
                workflow_trigger_id,
                workflow_id,
            },
            type: QueryTypes.SELECT,
        });

        let programData = await sequelize.query(
            `SELECT * FROM workflow WHERE workflow_trigger_id = :workflow_trigger_id AND (status = "pending" OR status = "completed")`,
            {
                replacements: { workflow_trigger_id },
                type: QueryTypes.SELECT,
            }
        );

        const flowTypeStatusMap = new Map<string, boolean>();
        
        for (const program of programData) {
            const { flow_type, status } = program as JobWorkFlow;
        
            if (!flowTypeStatusMap.has(flow_type)) {
                flowTypeStatusMap.set(flow_type, status === "completed");
            } else {
                const currentStatus = flowTypeStatusMap.get(flow_type);
                if (status === "pending") {
                    flowTypeStatusMap.set(flow_type, false);
                } else if (status === "completed" && currentStatus !== false) {
                    flowTypeStatusMap.set(flow_type, true);
                }
            }
        }
        console.log('outside the flow type for');
        
        const flowTypes = Array.from(flowTypeStatusMap.entries())
            .map(([flow_type, is_completed]) => ({ flow_type, is_completed }))
            .sort((a, b) => {
                if (a.flow_type === "Review") return -1;
                if (b.flow_type === "Review") return 1;
                return 0;
            });
    
        // Check if rows array is not empty before accessing rows[0]
        let manager = rows.length > 0 ? rows[0]?.manager : null;
        console.log('checked flow typess');
        
        if (rows.length === 0) {
            return reply.status(200).send({
                statusCode: 200,
                flowTypes: flowTypes,
                message: 'Workflow data not found',
                workflow: [],
                trace_id,
            });
        }
        
        const workflow: Workflow = {
            program_id: program_id,
            job_workflow_id: rows[0].job_workflow_id,
            workflow_id: rows[0].workflow_id,
            workflow_name: rows[0].workflow_name,
            workflow_type: rows[0].workflow_type,
            event_title: rows[0].event_title,
            event_slug: rows[0].event_slug,
            status: rows[0].status,
            config: rows[0].config,
            levels: [],
        };
        
        // Process all rows, not just the first one
        await getLevelData(request, reply, rows, workflow, manager);
        console.log('waited for level data');

        (async () => {
            console.log('here calling the notificationsss');
            let notifyUser = sendNotificationSequencially(request, reply, workflow);
        })();
        
        console.log('returning response from here');
        return reply.status(200).send({
            statusCode: 200,
            flowTypes: flowTypes,
            workflow,
            trace_id,
        });
    } catch (error: any) {
        console.log(error);
        return reply.status(500).send({
            statusCode: 500,
            message: 'An error occurred while fetching workflow data.',
            trace_id,
        });
    }
}

const getLevelData = async (request: FastifyRequest, reply: FastifyReply, rows: any[], workflow: any, manager: any): Promise<any> => {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    
    const impersonatorId = user.impersonator?.id || null;
    
    try {
        const [recipientTypes, managerData, impersonatorData] = await Promise.all([
            fetchRecipientTypes(rows),
            fetchManagerData(manager, workflow.program_id),
            fetchImpersonatorData(impersonatorId)
        ]);

        const userCache = new Map<string, any>();
        if (impersonatorData) userCache.set(impersonatorId, impersonatorData);
        if (managerData) userCache.set(manager, managerData);

        const fetchUser = createUserFetcher(userCache, workflow.program_id);
        const levelMap = initializeLevelMap(rows);
        
        await processRowsInBatches(rows, {
            levelMap,
            recipientTypes,
            managerData,
            impersonatorData,
            impersonatorId,
            fetchUser,
            manager
        });
        
        const finalLevels = buildFinalLevels(levelMap);
        workflow.levels = finalLevels;
        
        await Promise.all([
            statusHandling(request, reply, workflow),
            updateMissingLevels(rows.length > 0 ? rows[0].levels || [] : [], workflow)
        ]);
        
        return workflow;
    } catch (error) {
        console.error('Error in getLevelData:', error);
        return reply.status(500).send({
            statusCode: 500,
            message: 'An error occurred while fetching workflow data.',
        });
    }
};

async function fetchRecipientTypes(rows: any[]): Promise<Record<string, any>> {
    const uniqueRecipientTypeIds = [...new Set(rows
        .filter(row => row.recipient_type_id)
        .map(row => row.recipient_type_id))];
        
    if (uniqueRecipientTypeIds.length === 0) return {};
    
    const recipientTypeQuery = `
        SELECT id, name
        FROM recipient_type
        WHERE id IN (:recipient_type_ids)
        AND is_enabled = true
    `;
    
    const recipientTypeResults = await sequelize.query(recipientTypeQuery, {
        type: QueryTypes.SELECT,
        replacements: { recipient_type_ids: uniqueRecipientTypeIds },
    });
    
    return (recipientTypeResults as any[]).reduce((acc: Record<string, any>, type: any) => {
        acc[type.id] = type;
        return acc;
    }, {});
}

async function fetchManagerData(manager: any, programId: string): Promise<any> {
    if (!manager) return null;
    
    const userQuery = `
        SELECT user_id, first_name, last_name, avatar, role_id, email, supervisor
        FROM user
        WHERE user_id = :user_id
        AND program_id = :program_id
        AND LOWER(status) = 'active'
        LIMIT 1
    `;
    
    const userResult = await sequelize.query(userQuery, {
        type: QueryTypes.SELECT,
        replacements: { user_id: manager, program_id: programId },
    });
    
    return userResult.length > 0 ? userResult[0] : null;
}

async function fetchImpersonatorData(impersonatorId: string | null): Promise<any> {
    if (!impersonatorId) return null;
    
    const userQuery = `
        SELECT user_id, first_name, last_name, avatar, role_id, email
        FROM user
        WHERE user_id = :user_id         
        AND LOWER(status) = 'active'
        LIMIT 1
    `;
    
    const impersonatorResult = await sequelize.query(userQuery, {
        type: QueryTypes.SELECT,
        replacements: { user_id: impersonatorId },
    });
    
    return impersonatorResult.length > 0 ? impersonatorResult[0] : null;
}

function createUserFetcher(userCache: Map<string, any>, programId: string) {
    return async (userId: string): Promise<any> => {
        if (!userId) return null;
        
        if (userCache.has(userId)) {
            return userCache.get(userId);
        }
        
        const userQuery = `
            SELECT user_id, first_name, last_name, avatar, role_id, email
            FROM user
            WHERE user_id = :user_id
            AND program_id = :program_id
            AND LOWER(status) = 'active'
            LIMIT 1
        `;
        
        const result = await sequelize.query(userQuery, {
            type: QueryTypes.SELECT,
            replacements: { user_id: userId, program_id: programId },
        });
        
        const userData = result.length > 0 ? result[0] : null;
        if (userData) {
            userCache.set(userId, userData);
        }
        return userData;
    };
}

function initializeLevelMap(rows: any[]): Map<string, any> {
    const levelMap = new Map<string, any>();
    
    for (const row of rows) {
        const { level_id, level_status, placement_order, behaviour } = row;
        
        if (!levelMap.has(level_id)) {
            levelMap.set(level_id, {
                level_id,
                placement_order,
                level_status,
                behaviour,
                recipients: [],
                processedUsers: new Set<string>()
            });
        }
    }
    
    return levelMap;
}

async function processRowsInBatches(rows: any[], context: any): Promise<void> {
    const BATCH_SIZE = 10; 
    const batches: any[][] = [];
    
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        batches.push(rows.slice(i, i + BATCH_SIZE));
    }
    
    for (const batch of batches) {
        await Promise.all(batch.map(row => processRow(row, context)));
    }
}

async function processRow(row: any, context: any): Promise<void> {
    const {
        levelMap, recipientTypes, managerData, impersonatorData,
        impersonatorId, fetchUser, manager
    } = context;
    
    const {
        level_id, level_status, recipient_status, recipient_details,
        placement_order, recipient_type_id, meta_data, behaviour,
        replaced_by, existing_replaced_user, imporsonate_by, manager_id
    } = row;
    
    if (!meta_data || Object.keys(meta_data).length === 0 || !recipient_type_id) {
        return;
    }
    
    const levelInfo = levelMap.get(level_id);
    const recipientType = recipientTypes[recipient_type_id];
    
    if (!recipientType) {
        return;
    }
    
    const effectiveImpersonateBy = imporsonate_by || impersonatorId;
    
    const result = await processRecipientType(
        recipientType.name,
        row,
        {
            manager,
            managerData,
            impersonatorData,
            impersonatorId,
            effectiveImpersonateBy,
            fetchUser,
            recipientType,
            behaviour,
            recipient_details,
            replaced_by,
            manager_id,
            existing_replaced_user,
            meta_data
        }
    );

    if (result?.input_value) {
        addRecipientsToLevel(levelInfo, result, row, recipientType, behaviour);
    }
}

async function processRecipientType(
    typeName: string,
    row: any,
    context: any
): Promise<any> {
    const {
        manager, managerData, impersonatorData, impersonatorId,
        effectiveImpersonateBy, fetchUser, recipientType, behaviour,
        recipient_details, replaced_by, manager_id, existing_replaced_user,
        meta_data
    } = context;
    
    switch (typeName) {
        case 'Specific User':
        case 'Multiple users':
        case 'Job Manager':
        case 'Assignment Manager':
        case 'Timesheet Managers':
        case 'SOW Manager':
        case 'Job Manager On Offer':
            return await processSpecificUserTypes(context, row);
            
        case 'Manager of':
            return await processManagerOf(context, row);
            
        case 'Custom Field Supplied User':
            return await processCustomFieldUser(context, row);
            
        case 'Users in Program Role':
        case 'Master Data Owner':
        case 'Managerial Chain':
        case 'Financial Authority Chain':
        case 'Vendor Users':
        case 'Top of Financial Authority Chain':
        case 'Additional MDT Owner':
            return await processProgramRoleUsers(context, row);
        default:
            return null;
    }
}

async function processSpecificUserTypes(context: any, row: any): Promise<any> {
    const {
        manager, managerData, impersonatorData, impersonatorId,
        effectiveImpersonateBy, fetchUser, recipientType, behaviour,
        recipient_details, replaced_by, manager_id, existing_replaced_user,
        meta_data
    } = context;
    
    const input_values = Object.values(meta_data);
    let userId: string | undefined;
    
    if (existing_replaced_user) {
        userId = existing_replaced_user;
    } else if (recipientType.name === 'Job Manager') {
        userId = manager;
    } else if (input_values.length > 0) {
        userId = input_values[0] as string;
    }
    
    if (!userId) return null;
    
    const impersonateUserPromise = effectiveImpersonateBy ?
        (effectiveImpersonateBy === impersonatorId && impersonatorData ?
            Promise.resolve(impersonatorData) :
            fetchUser(effectiveImpersonateBy)
        ) :
        Promise.resolve(null);
    
    const [userResult, replacedUserResult, managerDataResult, impersonateUserResult] = await Promise.all([
        fetchUser(userId),
        replaced_by ? fetchUser(replaced_by) : Promise.resolve(null),
        manager_id ? fetchUser(manager_id) : Promise.resolve(null),
        impersonateUserPromise
    ]);
    
    if (!userResult) return null;
    
    const input_value = {
        id: userResult.user_id,
        first_name: userResult.first_name,
        last_name: userResult.last_name,
        avatar: userResult.avatar,
        role_id: userResult.role_id,
        email: userResult.email,
        updated_on: recipient_details?.updated_on,
        notes: recipient_details?.notes,
        reason: recipient_details?.reason,
        replaced_notes: recipient_details?.replaced_notes
    };
    
    let manager_data = null;
    if (managerDataResult) {
        manager_data = {
            id: managerDataResult.user_id,
            first_name: managerDataResult.first_name,
            last_name: managerDataResult.last_name,
            avatar: managerDataResult.avatar || null,
            email: managerDataResult.email || null
        };
    }
    
    let replaced_user_data = null;
    if (replacedUserResult) {
        replaced_user_data = {
            id: replacedUserResult.user_id,
            first_name: replacedUserResult.first_name,
            last_name: replacedUserResult.last_name,
            avatar: replacedUserResult.avatar,
            role_id: replacedUserResult.role_id,
            email: replacedUserResult.email,
            recipient_type: recipientType.name || '',
            behaviour,
            replaced_date_time: recipient_details?.replaced_modified_on,
            replaced_notes: recipient_details?.replaced_notes || ''
        };
    }
    
    let imposonate_user_data = null;
    if (impersonateUserResult) {
        imposonate_user_data = createImpersonateUserData(
            impersonateUserResult,
            recipient_details,
            recipientType.name,
            behaviour
        );
    }
    
    return { input_value, manager_data, replaced_user_data, imposonate_user_data };
}

async function processManagerOf(context: any, row: any): Promise<any> {
    const {
        managerData, impersonatorData, impersonatorId,
        effectiveImpersonateBy, fetchUser, recipientType, behaviour,
        recipient_details, replaced_by, existing_replaced_user
    } = context;
    
    if (!managerData) return null;
    
    let supervisorId: string | null = null;
    if (existing_replaced_user) {
        supervisorId = existing_replaced_user;
    } else if (managerData.supervisor) {
        supervisorId = managerData.supervisor;
    }
    
    if (!supervisorId) return null;
    
    const impersonateUserPromise = effectiveImpersonateBy ?
        (effectiveImpersonateBy === impersonatorId && impersonatorData ?
            Promise.resolve(impersonatorData) :
            fetchUser(effectiveImpersonateBy)
        ) :
        Promise.resolve(null);
    
    const [supervisorResult, replacedUserResult, impersonateUserResult] = await Promise.all([
        fetchUser(supervisorId),
        replaced_by ? fetchUser(replaced_by) : Promise.resolve(null),
        impersonateUserPromise
    ]);
    
    if (!supervisorResult) return null;
    
    const supervisorData = {
        id: supervisorResult.user_id,
        first_name: supervisorResult.first_name,
        last_name: supervisorResult.last_name,
        name: `${supervisorResult.first_name} ${supervisorResult.last_name}`.trim(),
        email: supervisorResult.email,
        avatar: supervisorResult.avatar || null,
        updated_on: recipient_details?.updated_on,
        notes: recipient_details?.notes,
        reason: recipient_details?.reason,
        replaced_notes: recipient_details?.replaced_notes
    };
    
    const input_value = [supervisorData];
    
    let replaced_user_data = null;
    if (replacedUserResult) {
        replaced_user_data = {
            id: replacedUserResult.user_id,
            first_name: replacedUserResult.first_name,
            last_name: replacedUserResult.last_name,
            avatar: replacedUserResult.avatar || null,
            email: replacedUserResult.email || null,
            recipient_type: recipientType.name || "",
            behaviour,
            replaced_date_time: recipient_details?.replaced_modified_on,
            replaced_notes: recipient_details?.replaced_notes,
        };
    }
    
    let manager_data = null;
    if (managerData) {
        manager_data = {
            id: managerData.user_id,
            first_name: managerData.first_name,
            last_name: managerData.last_name,
            avatar: managerData.avatar || null,
            email: managerData.email || null,
        };
    }
    
    let imposonate_user_data = null;
    if (impersonateUserResult) {
        imposonate_user_data = createImpersonateUserData(
            impersonateUserResult,
            recipient_details,
            recipientType.name,
            behaviour
        );
    }
    
    return { input_value, manager_data, replaced_user_data, imposonate_user_data };
}

async function processCustomFieldUser(context: any, row: any): Promise<any> {
    const {
        impersonatorData, impersonatorId, effectiveImpersonateBy,
        fetchUser, recipientType, behaviour, recipient_details, replaced_by
    } = context;
    
    const levels = row.levels || [];
    
    for (const level of levels) {
        for (const recipient of level.recipient_types || []) {
            if (recipient?.meta_data && recipientType?.id == recipient.recipient_type_id) {
                const metaData = recipient.meta_data;
                const metaValue = Object.values(metaData)[0] as string;
                const userId = recipient.existing_replaced_user || metaValue;
                
                if (!userId) continue;
                
                const impersonateUserPromise = effectiveImpersonateBy ?
                    (effectiveImpersonateBy === impersonatorId && impersonatorData ?
                        Promise.resolve(impersonatorData) :
                        fetchUser(effectiveImpersonateBy)
                    ) :
                    Promise.resolve(null);
                
                const [userData, replacedUserResult, impersonateUserResult] = await Promise.all([
                    fetchUser(userId),
                    replaced_by ? fetchUser(replaced_by) : Promise.resolve(null),
                    impersonateUserPromise
                ]);
                
                if (!userData) continue;
                
                const input_value = {
                    id: userData.user_id,
                    name: `${userData.first_name} ${userData.last_name}`,
                    email: userData.email,
                    avatar: userData.avatar,
                    updated_on: recipient_details?.updated_on,
                    notes: recipient_details?.notes,
                    reason: recipient_details?.reason,
                    replaced_notes: recipient_details?.replaced_notes
                };
                
                let replaced_user_data = null;
                if (replacedUserResult) {
                    replaced_user_data = {
                        id: replacedUserResult.user_id,
                        first_name: replacedUserResult.first_name,
                        last_name: replacedUserResult.last_name,
                        avatar: replacedUserResult.avatar,
                        role_id: replacedUserResult.role_id,
                        email: replacedUserResult.email,
                        recipient_type: recipientType.name || '',
                        behaviour,
                        replaced_date_time: recipient_details?.replaced_modified_on,
                        replaced_notes: recipient_details?.replaced_notes,
                    };
                }
                
                let imposonate_user_data = null;
                if (impersonateUserResult) {
                    imposonate_user_data = createImpersonateUserData(
                        impersonateUserResult,
                        recipient_details,
                        recipientType.name,
                        behaviour
                    );
                }
                
                return { input_value, replaced_user_data, imposonate_user_data };
            }
        }
    }
    
    return null;
}

async function processProgramRoleUsers(context: any, row: any): Promise<any> {
    const { fetchUser, impersonatorId, impersonatorData } = context;
    
    const users: any[] = [];
    const recipientTypes = JSON.parse(row.recipient_types) || [];
    
    const CONCURRENCY_LIMIT = 5;
    const chunks = [];
    for (let i = 0; i < recipientTypes.length; i += CONCURRENCY_LIMIT) {
        chunks.push(recipientTypes.slice(i, i + CONCURRENCY_LIMIT));
    }
    
    for (const chunk of chunks) {
        const chunkResults = await Promise.all(
            chunk.map(async (recipient: any) => {
                const receipentStatus = recipient.status;
                
                if (!recipient?.meta_data) return null;
                
                const metaData = recipient.meta_data;
                let userId = Object.values(metaData)[0] as string;
                const level_behaviour = Object.values(metaData)[1];
                
                if (recipient.existing_replaced_user) {
                    userId = recipient.existing_replaced_user;
                }
                
                const user = await fetchUser(userId);
                if (!user) return null;
                
                const userData: any = {
                    id: user.user_id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    avatar: user.avatar,
                    role_id: user.role_id,
                    email: user.email,
                    receipentstatus: receipentStatus,
                    modifiedOn: recipient.updated_on,
                    level_behaviour: level_behaviour,
                    replaced_by: null,
                    impersonate_by: null,
                    updated_on: recipient.updated_on,
                    notes: recipient.notes,
                    reason: recipient.reason,
                    actor_first_name: recipient.actor_first_name,
                    actor_last_name: recipient.actor_last_name,
                    actor_by_avatar: recipient.actor_by_avatar,
                    is_admin_override: recipient.is_admin_override,
                    replaced_notes: recipient.replaced_notes
                };
                
                const [replacedByUser, impersonatedUser] = await Promise.all([
                    recipient.replaced_by ? fetchUser(recipient.replaced_by) : Promise.resolve(null),
                    (() => {
                        const effectiveImpersonateId = recipient.impersonate_by || impersonatorId;
                        if (!effectiveImpersonateId) return Promise.resolve(null);
                        
                        if (effectiveImpersonateId === impersonatorId && impersonatorData) {
                            return Promise.resolve(impersonatorData);
                        }
                        return fetchUser(effectiveImpersonateId);
                    })()
                ]);
                
                if (replacedByUser) {
                    userData.replaced_by = {
                        id: replacedByUser.user_id,
                        first_name: replacedByUser.first_name,
                        last_name: replacedByUser.last_name,
                        email: replacedByUser.email,
                        avatar: replacedByUser.avatar,
                        role_id: replacedByUser.role_id,
                        replaced_notes: recipient.replaced_notes,
                        replaced_date_time: recipient.replaced_modified_on,
                        actor_first_name: recipient.actor_first_name,
                        actor_last_name: recipient.actor_last_name,
                        actor_by_avatar: recipient.actor_by_avatar,
                        is_admin_override: recipient.is_admin_override,
                    };
                }
                
                if (impersonatedUser) {
                    userData.impersonate_by = {
                        id: impersonatedUser.user_id,
                        first_name: impersonatedUser.first_name,
                        last_name: impersonatedUser.last_name,
                        email: impersonatedUser.email,
                        avatar: impersonatedUser.avatar,
                        role_id: impersonatedUser.role_id,
                        updated_on: context.recipient_details?.updated_on,
                        impersonate_notes: recipient.impersonate_notes,
                        impersonate_date_time: recipient.impersonate_modified_on,
                        actor_first_name: recipient.actor_first_name,
                        actor_last_name: recipient.actor_last_name,
                        actor_by_avatar: recipient.actor_by_avatar,
                        is_admin_override: recipient.is_admin_override,
                    };
                }
                
                return userData;
            })
        );
        users.push(...chunkResults.filter(Boolean));
    }
    
    if (users.length === 0) return null;
    
    const input_value = users.map(user => (
        {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        email: user.email,
        avatar: user.avatar || null,
        level_behaviour: user.level_behaviour,
        replaced_by: user.replaced_by,
        impersonate_by: user.impersonate_by,
        receipentStatus: user.receipentstatus,
        actor_first_name: user.actor_first_name,
        actor_last_name: user.actor_last_name,
        actor_by_avatar: user.actor_by_avatar,
        is_admin_override: user.is_admin_override,
        reason: user.reason,
        updated_on: user.updated_on,
        notes: user.notes
    }));
    
    return { input_value };
}

function createImpersonateUserData(userData: any, recipientDetails: any, recipientType: string, behaviour: string) {
    if (!userData) return null;
    
    return {
        id: userData.user_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        avatar: userData.avatar,
        role_id: userData.role_id,
        email: userData.email,
        updated_on: recipientDetails?.updated_on,
        recipient_type: recipientType || '',
        replaced_notes: recipientDetails?.replaced_notes,
        behaviour,
    };
}

function addRecipientsToLevel(levelData: any, result: any, row: any, recipientType: any, behaviour: string): void {
    const {
        input_value, manager_data, replaced_user_data, imposonate_user_data
    } = result;
    
    const {
        level_id, recipient_status, recipient_details
    } = row;
    
    let recipients = [];
    
    if (Array.isArray(input_value)) {
        console.log("Processing multiple recipients:", JSON.stringify(input_value, null, 2));
        
        recipients = input_value.map(user => ({
            name: getRecipientName(user),
            first_name: user.first_name,
            last_name: user.last_name,
            level_id,
            actor_first_name: user.actor_first_name,
            actor_last_name: user.actor_last_name,
            actor_by_avatar: user.actor_by_avatar,
            is_admin_override: user?.is_admin_override === true || user?.is_admin_override === 'true',
            status: user.receipentStatus || recipient_status,
            updated_on: user.updated_on,
            notes: user.notes,
            reason: user.reason,
            level_behaviour: user.level_behaviour,
            user_id: user.id,
            avatar: user.avatar?.url || '',
            role_id: user.role_id,
            email: user.email,
            replaced_by: user.replaced_by || replaced_user_data,
            manager: manager_data || null,
            imporsonate_by: user.impersonate_by || imposonate_user_data,
            recipient_type: recipientType.name || '',
            behaviour,
        }));
    } else {
        recipients = [{
            name: getRecipientName(input_value),
            first_name: input_value.first_name,
            last_name: input_value.last_name,
            level_id,
            status: recipient_status,
            updated_on: recipient_details?.updated_on,
            notes: recipient_details?.notes,
            reason: recipient_details?.reason,
            replaced_date_time: recipient_details?.replaced_modified_on,
            replaced_notes: recipient_details?.replaced_notes,
            actor_first_name: recipient_details?.actor_first_name,
            actor_last_name: recipient_details?.actor_last_name,
            actor_by_avatar: recipient_details?.actor_by_avatar,
            is_admin_override: recipient_details?.is_admin_override === true || recipient_details?.is_admin_override === 'true',
            user_id: input_value.id,
            avatar: input_value.avatar?.url || '',
            role_id: input_value.role_id,
            email: input_value.email,
            recipient_type: recipientType.name || '',
            behaviour,
            replaced_by: replaced_user_data,
            manager: manager_data || null,
            imporsonate_by: imposonate_user_data
        }];
    }
    
    for (const recipient of recipients) {
        if (!levelData.processedUsers.has(recipient.user_id)) {
            levelData.recipients.push(recipient);
            levelData.processedUsers.add(recipient.user_id);
        }
    }
}

function buildFinalLevels(levelMap: Map<string, any>): any[] {
    const unprocessedLevels = Array.from(levelMap.values())
        .filter(({ recipients }) => recipients.length > 0)
        .map(({ level_id, placement_order, level_status, behaviour, recipients }) => ({
            level_id,
            level_order: placement_order,
            placement_order,
            level_status,
            behaviour,
            recipients
        }))
        .sort((a, b) => a.placement_order - b.placement_order);
    
    const placementOrderGroups = new Map<number, any[]>();
    for (const level of unprocessedLevels) {
        if (!placementOrderGroups.has(level.placement_order)) {
            placementOrderGroups.set(level.placement_order, []);
        }
        placementOrderGroups.get(level.placement_order)?.push(level);
    }
    
    const finalLevels: any[] = [];
    
    placementOrderGroups.forEach((levels) => {
        const recipientTypeMap = new Map<string, any>();
        
        for (const level of levels) {
            const key = level.recipient_type || 'null';
            if (!recipientTypeMap.has(key)) {
                recipientTypeMap.set(key, level);
            } else {
                const existingLevel = recipientTypeMap.get(key);
                const existingUserIds = new Set(existingLevel.recipients.map((r: any) => r.user_id));
                
                for (const recipient of level.recipients) {
                    if (!existingUserIds.has(recipient.user_id)) {
                        existingLevel.recipients.push(recipient);
                        existingUserIds.add(recipient.user_id);
                    }
                }
            }
        }
        
        recipientTypeMap.forEach(level => {
            delete level.recipient_type; 
            finalLevels.push(level);
        });
    });
    
    return finalLevels.sort((a, b) => a.placement_order - b.placement_order);
}


// Helper function to get name (renamed to avoid duplicate function implementation)
function getRecipientName(user: any): string {
    if (user.name) {
        return user.name;
    }
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName} ${lastName}`.trim();
}


const statusHandling = async (request: FastifyRequest, reply: FastifyReply, workflow: any) => {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized - Invalid token' });
    }
    // 1. Filter levels with status "pending"
    const levelStatusMap: Record<number, string> = {};
    if (workflow.levels && workflow.levels.length >= 0) {
        const sortedLevels = [...workflow.levels].sort((a, b) => a.placement_order - b.placement_order);
        for (let i = 0; i < sortedLevels.length; i++) {
            const currentLevel = sortedLevels[i];
            const placementOrder = currentLevel.placement_order;
            if (i === 0) {
                currentLevel.level_status = currentLevel.level_status;
            } else {
                const previousLevel = sortedLevels[i - 1];
                if (previousLevel.level_status === "completed" || previousLevel.level_status === "canceled" || previousLevel.level_status === "bypassed") {
                    currentLevel.level_status = currentLevel.level_status;
                } else {
                    currentLevel.level_status = "not started";
                }
            }
            if (currentLevel.level_status === "pending"||currentLevel.level_status === "bypassed") {                
                const hasMatchingRecipient =
                    user.userType == "super_user" ||
                    currentLevel.recipients.some((recipient: any) => {
                        const isUserMatched =
                            (recipient.replaced_by && recipient.replaced_by.id === user.sub) ||
                            (!recipient.replaced_by && recipient.user_id === user.sub);  // Fallback to user_id if replaced_by is not present

                        return isUserMatched && recipient.status === "pending";
                    });
                if (!workflow.action_allowed) {
                    workflow.action_allowed = {};
                }
                if (workflow.workflow_type === "Review") {
                    workflow.action_allowed.is_review = workflow?.status?.toLowerCase() ==='completed' ? false: hasMatchingRecipient;
                } else if (workflow.workflow_type === "Approval") {
                    workflow.action_allowed.is_approve = workflow?.status?.toLowerCase() ==='completed' ? false: hasMatchingRecipient;
                }
            }

            // Update the status map for reference
            levelStatusMap[placementOrder] = currentLevel.level_status;
            // Update the status map for reference
            if (currentLevel.recipients && currentLevel.recipients.length > 0) {
                currentLevel.recipients.forEach((recipient: any) => {
                    if (currentLevel.level_status === "bypassed") {
                        // If the level is bypassed, set recipient's status to "bypassed"
                        recipient.status = recipient.status;

                        // Set actor fields to null when the level is bypassed
                        recipient.actor_first_name = null;
                        recipient.actor_last_name = null;
                    } else if (currentLevel.level_status === "completed" || currentLevel.level_status === "canceled" || currentLevel.level_status === "Not needed") {
                        // If the level is completed, preserve the recipient's existing status
                        recipient.status = recipient.status;
                    } else if (currentLevel.level_status === "pending") {
                        // If the level is pending, keep the recipient's status as is
                        recipient.status = recipient.status;
                    } else {
                        // If the level is not started, set recipient status to "not started"
                        recipient.status = "not started";
                    }
                });
            }
        }
    }
};

const fetchLevelUserData = async (userId: any, program_id: any) => {
    const userQuery = `
        SELECT user_id, first_name, last_name, avatar, role_id, email
        FROM user
        WHERE user_id = :user_id
          AND program_id=:program_id
         AND LOWER(status) = 'active'
        LIMIT 1
    `;
    const userResult = await sequelize.query<Users>(userQuery, {
        type: QueryTypes.SELECT,
        replacements: { user_id: userId, program_id: program_id },
    });

    if (userResult.length > 0) {
        return userResult[0];  // Return user data
    }

    return null;
};

async function updateMissingLevels(levels: any[], workflow: any) {
    // Extract all placement orders from workflow.levels into a Set
    const workflowPlacementOrders = new Set(workflow.levels.map((level: any) => level.placement_order));

    // Update status for levels where placement_order is NOT in workflowPlacementOrders
    const updatedLevels = levels.map((level: any) => {
        if (!workflowPlacementOrders.has(level.placement_order)) {
            return { ...level, status: "completed" };
        }
        return level;
    });
    
    for (const updatedLevel of updatedLevels) {
        await JobWorkFlowModel.update(
            { levels: updatedLevels },
            {
                where: {
                    placement_order: updatedLevel.placement_order,
                    id: workflow.job_workflow_id
                }
            }
        );
    }
    
    // Optionally, return the updated levels or any other information
    return updatedLevels;
}

// Helper function to get an existing level by level_id
function getExistingLevel(workflow: any, level_id: string) {
    return workflow.levels.find((level: any) => level.level_id === level_id);
}

