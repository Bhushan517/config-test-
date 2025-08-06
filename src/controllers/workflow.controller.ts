import { FastifyRequest, FastifyReply } from 'fastify';
import WorkFlow from '../models/workflow.model';
import { WorkflowData, WorkflowLevelData } from '../interfaces/workflow.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op, QueryTypes } from 'sequelize';
import { Module } from '../models/module.model';
import EventModel from '../models/event.model';
import WorkflowMethod from '../models/workflow-methods.model';
import hierarchies from '../models/hierarchies.model';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import RecipientTypeModel from '../models/recipient-types.model';
import DataSourceModel from '../models/workflow-data-source.model'
import { sequelize } from '../config/instance';
import {
    countChildWorkflowsQuery,
    getChildWorkflowsQuery,
    getparentWorkflowsQuery,
    workflowAdvanceFilter
} from '../utility/queries';
import FieldOperatorModel from '../models/field-operator.model'
import FieldConfigModel from '../models/workflow-field-config.model'
import FieldModel from '../models/workflow-field.model'
import WorkflowLevel from '../models/workflow-level-model.model';
import WorkflowLevelCondition from '../models/workflow-level-condition.model';
import WorkflowRecepientType from '../models/workflow-recipient-type.model';
import User from '../models/user.model';
import CustomField from '../models/custom-fields.model';
import FoundationalDataTypes from '../models/master-datatypes.model';
import WorkLocationModel from '../models/work-location.model';
import IndustriesModel from '../models/labour-category.model';
import picklistModel from '../models/picklist.model';
import foundationalData from '../models/master-data.model';
import jobTemplateModel from '../models/job-template.model';
import TimesheetTypeConfig from '../models/timesheet-type-config.model';
import WorkflowTriggeredRecipientType from '../models/workflow-triggered-recipient-type.model';
import WorkflowTriggeredLevel from '../models/workflow-triggering-level-model';
import axios from 'axios';
import { databaseConfig } from '../config/db';
import PicklistItemModel from '../models/picklist-item.model';
const AUTH_BASE_URL = databaseConfig.config.auth_url;
const AUTH_DB = databaseConfig.config.database_auth;

export const createWorkflow = async (request: FastifyRequest, reply: FastifyReply) => {
    const { program_id } = request.params as { program_id: string };
    const { name, module, hierarchies, method_id } = request.body as WorkflowData;
    const traceId = generateCustomUUID();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found', trace_id: traceId });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token', trace_id: traceId });
    }
    const userId = user?.sub;
    try {
        const existingWorkflow = await WorkFlow.findOne({
            where: { name, program_id, is_deleted: false }
        });

        if (existingWorkflow) {
            return reply.status(409).send({
                status_code: 409,
                message: "A workflow with the same name already exists",
                trace_id: traceId,
            });
        }

        const existingWorkflowWithConditions = await WorkFlow.findOne({
            where: {
                module,
                method_id,
                program_id,
                is_deleted: false
            }
        });

        if (existingWorkflowWithConditions) {
            const existingHierarchies = existingWorkflowWithConditions.hierarchies || [];

            const isHierarchyMatch =
                existingHierarchies.length === hierarchies.length &&
                existingHierarchies.every((id: string) => hierarchies.includes(id));

            if (isHierarchyMatch) {
                return reply.status(409).send({
                    status_code: 409,
                    message: "A workflow with the same module, hierarchies, and method_id already exists",
                    trace_id: traceId,
                });
            }
        }

        const workflowDataPayload = request.body as Omit<WorkflowData, '_id'>;
        let createdWorkflow: any;
        let grouped = await WorkFlow.findOne({
            where: {
                flow_type: workflowDataPayload.flow_type,
                is_deleted: false,
                program_id,
                event_id: workflowDataPayload.event_id,
                workflow_id: null
            }
        });

        if (grouped) {
            createdWorkflow = await WorkFlow.create({
                ...workflowDataPayload,
                created_by: userId,
                updated_by: userId,
                program_id,
                workflow_id: grouped.id,
                type: "child"
            });
            await grouped.update({ flow_count: (grouped.flow_count || 0) + 1 });
            await createdWorkflow.update({
                placement_order: grouped.flow_count - 1,
            });
        } else {
            createdWorkflow = await WorkFlow.create({
                ...workflowDataPayload,
                program_id,
                placement_order: 0,
                created_by: userId,
                updated_by: userId,
                flow_count: 1,
                type: "parent",
                workflow_id: null
            });
        }

        reply.status(201).send({
            status_code: 201,
            workflow: {
                id: createdWorkflow?.id,
                name: createdWorkflow?.name,
            },
            trace_id: traceId,
        });
    } catch (error: any) {
        console.log(error);
        reply.status(500).send({
            status_code: 500,
            message: 'Error while creating workflow',
            error: error.message,
            trace_id: traceId
        });
    }
};


export const updateWorkflow = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const workflowData = request.body as WorkflowData;
    const { name } = workflowData;
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
    const userId = user?.sub;

    try {   
        const data = await WorkFlow.findOne({
            where: { id, is_deleted: false, program_id }
        });

        if (data) {
            await data.update({
                ...workflowData,
                updated_on: new Date(),
                updated_by: userId
            }, { fields: Object.keys(workflowData).filter(field => field !== 'created_on').concat(['updated_on', 'updated_by']) });

            return reply.status(200).send({
                status_code: 200,
                updated_by: userId,
                workflow_id: id,
                message: 'Workflow updated successfully.',
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: 'Workflow data not found.', trace_id: traceId });
        }
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while updating the workflow',
            error: (error as any).message,
            trace_id: traceId
        });
    }
};
export const updateReorder = async (
    request: FastifyRequest<{
        Params: { program_id: string; module: string; event_id: string; flow_type: string };
        Body: { flow_order: string[] }
    }>,
    reply: FastifyReply
) => {
    const { program_id, module, event_id, flow_type } = request.params;
    const { flow_order } = request.body;
    const traceId = generateCustomUUID();

    try {
        // Fetch workflows based on flow_order and other conditions
        const workflows = await WorkFlow.findAll({
            where: {
                id: flow_order,
                program_id,
                module,
                event_id,
                flow_type,
                is_deleted: false
            }
        });

        // Reorder fetched workflows based on the sequence of flow_order from the request body
        const workflowsMap = new Map(workflows.map(workflow => [workflow.id, workflow]));
        const reorderedWorkflows = flow_order
            .map(id => workflowsMap.get(id))
            .filter(workflow => workflow !== undefined);

        // Check if any IDs from flow_order are missing in the fetched workflows
        const existingIds = workflows.map(workflow => workflow.id);
        const missingIds = flow_order.filter(id => !existingIds.includes(id));

        if (missingIds.length > 0) {
            return reply.status(404).send({
                status_code: 404,
                message: `Some workflows not found: ${missingIds.join(', ')}`,
                trace_id: traceId
            });
        }

        // Update placement_order starting from 0
        for (let index = 0; index < reorderedWorkflows.length; index++) {
            const workflow = reorderedWorkflows[index];
            await WorkFlow.update(
                { placement_order: index }, // Start from 0
                {
                    where: {
                        id: workflow.id,
                        program_id,
                        module,
                        event_id,
                        flow_type,
                        is_deleted: false
                    }
                }
            );
        }

        reply.status(200).send({
            status_code: 200,
            message: 'Workflow placement order updated successfully.',
            trace_id: traceId
        });

    } catch (error) {
        console.log(error);
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while updating the workflow placement order.',
            error: (error as any).message,
            trace_id: traceId
        });
    }
};

export async function deleteWorkflow(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params;

        const workFlowData = await WorkFlow.findOne({ where: { program_id, id } });

        if (!workFlowData) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Workflow not found.',
                trace_id: traceId
            });
        }

        const { module, event_id, method_id } = workFlowData;

        await WorkFlow.update(
            { is_deleted: true, is_enabled: false },
            { where: { program_id, id } }
        );

        await WorkFlow.decrement(
            { flow_count: 1 },
            {
                where: {
                    program_id,
                    module,
                    event_id,
                    method_id,
                    is_deleted: false
                }
            }
        );

        reply.status(200).send({
            status_code: 200,
            workflow: id,
            message: 'Workflow deleted successfully',
            trace_id: traceId,
        });

    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting workflow.',
            trace_id: traceId,
            error: (error as any).message,
        });
    }
}

export async function getAllWorkflows(
    request: FastifyRequest<{ Params: WorkflowData, Querystring: WorkflowData }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const params = request.params;
        const query = request.query as WorkflowData | any;
        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;

        const searchConditions: any = { is_deleted: false, program_id: params.program_id };

        if (query.name) {
            searchConditions.name = { [Op.like]: `%${query.name}%` };
        }
        if (query.is_enabled !== undefined) {
            searchConditions.is_enabled = query.is_enabled !== "false";
        }
        if (query.module) {
            const modules = Array.isArray(query.module) ? query.module : query.module.split(",");
            searchConditions.module = { [Op.in]: modules };
        }
        if (query.event_id) {
            const eventIds = Array.isArray(query.event_id) ? query.event_id : query.event_id.split(",");
            searchConditions.event_id = { [Op.in]: eventIds };
        }
        if (query.method_id) {
            searchConditions.method_id = query.method_id;
        }
        if (query.type) {
            searchConditions.type = query.type;
        }
        if (query.flow_type) {
            searchConditions.flow_type = query.flow_type;
        }

        const { rows: workflows, count } = await WorkFlow.findAndCountAll({
            where: searchConditions,
            attributes: { exclude: ["program_id"] },
            limit: limit,
            offset: offset,
            order: [["created_on", "DESC"]],
        });

        if (workflows.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Workflow not found",
                workflow: [],
                trace_id: traceId
            });
        }

        const populatedWorkflow = await Promise.all(workflows.map(async (workflow) => {
            const module_id = workflow.module;
            const event_id = workflow.event_id;
            const method_id = workflow.method_id;

            const moduleData = module_id ? await Module.findByPk(module_id, { attributes: ["id", "name"] }) : null;
            const eventData = event_id ? await EventModel.findByPk(event_id, { attributes: ["id", "name"] }) : null;
            const methodData = method_id ? await WorkflowMethod.findByPk(method_id, { attributes: ["id", "name"] }) : null;

            const hierarchyIds = workflow.hierarchies || [];
            const hierarchiesData = hierarchyIds.length ? await hierarchies.findAll({
                where: { id: { [Op.in]: hierarchyIds } },
                attributes: ['id', 'name']
            }) : [];

            return {
                ...workflow.toJSON(),
                Module: moduleData ? moduleData.toJSON() : null,
                Event: eventData ? eventData.toJSON() : null,
                Method: methodData ? methodData.toJSON() : null,
                hierarchies: hierarchiesData.map(hierarchy => ({
                    id: hierarchy.get('id'),
                    name: hierarchy.get('name')
                })),
            };
        }));

        reply.status(200).send({
            status_code: 200,
            message: "workflow get successfully",
            total_records: count,
            workflow: populatedWorkflow,
            trace_id: traceId
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal server error",
            error: (error as any).message,
            trace_id: traceId
        });
    }
}

async function getHierarchyIds(user: any, program_id: string): Promise<string[]> {
    const userDetails = await User.findOne({
        where: { program_id, user_id: user.sub },
        attributes: ['user_id', 'user_type', 'tenant_id', 'is_all_hierarchy_associate', 'associate_hierarchy_ids']
    });

    const userType = user.userType?.toLowerCase();
    const user_type = userDetails?.user_type?.toLowerCase();

    if (userType === 'super_user' || (user_type === 'client' && userDetails?.is_all_hierarchy_associate)) {
        const allHierarchies = await hierarchies.findAll({
            where: { program_id },
            attributes: ['id']
        });
        return allHierarchies.map((h: any) => h.id);
    }

    if (user_type === 'msp' && userDetails?.is_all_hierarchy_associate) {
        const managedHierarchies = await hierarchies.findAll({
            where: { program_id, managed_by: userDetails.tenant_id },
            attributes: ['id']
        });
        return managedHierarchies.map((h: any) => h.id);
    }

    return userDetails?.associate_hierarchy_ids || [];
}


export async function getWorkflowById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found', trace_id: traceId });
    }
    const token = authHeader.split(' ')[1];
    const user: any = await decodeToken(token);
    try {
        const { id, program_id } = request.params as { id: string; program_id: string };
        const item:any = await WorkFlow.findOne({
            where: { id, program_id }
        });

        if (!item) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Workflow data not found',
                workflow: [],
                trace_id: traceId
            });
        }
        
        let hierarchyIds: string[] = item.hierarchies || [];
        if (item.is_associated_to_all_hierarchy === true) {
            hierarchyIds = await getHierarchyIds(user, program_id);
        }

        const [moduleData, eventData, methodData, hierarchiesData] = await Promise.all([
            item.module ? Module.findByPk(item.module, { attributes: ["id", "name"] }) : null,
            item.event_id ? EventModel.findByPk(item.event_id, { attributes: ["id", "name"] }) : null,
            item.method_id ? WorkflowMethod.findByPk(item.method_id, { attributes: ["id", "name"] }) : null,
            hierarchyIds?.length > 0 ? hierarchies.findAll({
                where: { id: { [Op.in]: hierarchyIds } },
                attributes: ['id', 'name']
            }) : []
        ]);

        const fieldOperatorIds = new Set<string>();
        const metaFieldConfigIds = new Set<string>();
        const selectedItems = new Set<string>();
        const targetValues = new Set<string>();

        item.levels.forEach((level: any) => {
            level.recipient_types?.forEach((recipientType: any) => {
                const metaData = recipientType.meta_data || {};
                Object.keys(metaData).forEach(fieldConfigId => metaFieldConfigIds.add(fieldConfigId));
            });

            level.conditions?.forEach((condition: any) => {
                if (condition.field_operator_id) {
                    fieldOperatorIds.add(condition.field_operator_id);
                }
                if (condition.field_config) {
                    metaFieldConfigIds.add(condition.field_config);
                }
                if (condition.source_field_meta?.selected_item) {
                    selectedItems.add(condition.source_field_meta.selected_item);
                }

                if (condition.target_field_value?.values) {
                    if (Array.isArray(condition.target_field_value.values)) {
                        condition.target_field_value.values.forEach((value: any) => {
                            targetValues.add(value);
                            selectedItems.add(value);
                        });
                    } else {
                        targetValues.add(condition.target_field_value.values);
                    }
                }
            });
        });

        const [fieldConfigs, fieldOperators, selectedItemDetails, foundationalDetails, workLocationDetails, labourCategoryDetails, createOrgDetail, masterDataDetails, jobTemplateDetails, userDetails, timesheetType, picklistItem, roleDetails] = await Promise.all([
            FieldConfigModel.findAll({
                where: { id: { [Op.in]: Array.from(metaFieldConfigIds) } },
                attributes: ['id', 'config', 'field_id', 'placement_order'],
                include: [
                    {
                        model: FieldModel,
                        as: 'field',
                        include: [
                            {
                                model: DataSourceModel,
                                as: 'data_source',
                                attributes: ['id', 'name', 'slug', 'api_url']
                            }
                        ]
                    }
                ]
            }),
            FieldOperatorModel.findAll({
                where: { id: { [Op.in]: Array.from(fieldOperatorIds) } },
                attributes: ['id', 'sign', 'eval_text', 'is_separator']
            }),
            CustomField.findAll({
                where: { id: { [Op.in]: Array.from(selectedItems) } },
                attributes: ['id', 'name', 'slug']
            }),
            FoundationalDataTypes.findAll({
                where: { id: { [Op.in]: Array.from(selectedItems) } },
                attributes: ['id', 'name',]
            }),
            WorkLocationModel.findAll({
                where: { id: { [Op.in]: Array.from(targetValues) } },
                attributes: ['id', 'name']
            }),

            IndustriesModel.findAll({
                where: { id: { [Op.in]: Array.from(targetValues) } },
                attributes: ['id', 'name']
            }),
            picklistModel.findAll({
                where: { id: { [Op.in]: Array.from(targetValues) } },
                attributes: ['id', 'name']
            }),
            foundationalData.findAll({
                where: { id: { [Op.in]: Array.from(targetValues) } },
                attributes: ['id', 'name']
            }),
            jobTemplateModel.findAll({
                where: { id: { [Op.in]: Array.from(targetValues) } },
                attributes: ['id', 'template_name']
            }),
            User.findAll({
                where: { user_id: { [Op.in]: Array.from(targetValues) } },
                attributes: ['user_id', 'first_name', 'last_name']
            }),
            TimesheetTypeConfig.findAll({
                where: { id: { [Op.in]: Array.from(targetValues) } },
                attributes: ['id', 'title']
            }),
            PicklistItemModel.findAll({
                where: { id: { [Op.in]: Array.from(selectedItems) } },
                attributes: ['id', 'value','slug']
            }),
            targetValues.size > 0
                ? sequelize.query(
                    `SELECT id, display_name FROM ${AUTH_DB}.roles WHERE id IN (${Array.from(targetValues).map(() => '?').join(',')})`,
                    { replacements: Array.from(targetValues), type: QueryTypes.SELECT }
                )
                : []
        ]);

        const fieldConfigMap = fieldConfigs.reduce((acc: any, config: any) => {
            acc[config.id] = {
                id: config.id,
                placement_order: config.placement_order,
                config: config.config,
                field: config.field
            };
            return acc;
        }, {});

        const fieldOperatorMap = fieldOperators.reduce((acc: any, operator: any) => {
            acc[operator.id] = operator;
            return acc;
        }, {});

        const selectedItemMap = selectedItemDetails.reduce((acc: any, item: any) => {
            acc[item.id] = item;
            return acc;
        }, {});
        const masterItemMap = foundationalDetails.reduce((acc: any, item: any) => {
            acc[item.id] = item;
            return acc;
        }, {});

        const picklistItemMap = picklistItem.reduce((acc: any, item: any) => {
            acc[item.id] = item;
            return acc;
        }, {});

        const targetItemMap = workLocationDetails.reduce((acc: any, item: any) => {
            acc[item.id] = item;
            return acc;
        }, {});
        const labourCategoryItemMap = labourCategoryDetails.reduce((acc: any, item: any) => {
            acc[item.id] = item;
            return acc;
        }, {});
        const createOrgItemMap = createOrgDetail.reduce((acc: any, item: any) => {
            acc[item.id] = item;
            return acc;
        }, {});
        const masterDataMap = masterDataDetails.reduce((acc: any, item: any) => {
            acc[item.id] = item;
            return acc;
        }, {});
        const jobTemplateMap = jobTemplateDetails.reduce((acc: any, item: any) => {
            acc[item.id] = item;
            return acc;
        }, {});
        const userMap = userDetails.reduce((acc: any, item: any) => {
            acc[item.user_id] = item;
            return acc;
        }, {});
        const timesheetTypeMap = timesheetType.reduce((acc: any, item: any) => {
            acc[item.id] = item;
            return acc;
        }, {});
        const roleMap = roleDetails.reduce((acc: any, item: any) => {
            acc[item.id] = {
                id: item.id,
                name: item.display_name
            };
            return acc;
        }, {});
        const levelsWithDetails = await Promise.all(
            item.levels.map(async (level: { recipient_types: any[], conditions: any[] }) => {
                if (Array.isArray(level.recipient_types)) {
                    const recipientTypeIds = level.recipient_types.map(rt => rt.recipient_type_id);
                    const recipientTypes = await RecipientTypeModel.findAll({
                        where: { id: { [Op.in]: recipientTypeIds } },
                        attributes: ['id', 'name', 'meta_data', 'slug', 'module_id', 'event_id', 'method_id']
                    });

                    level.recipient_types = await Promise.all(level.recipient_types.map(async rt => {
                        const recipientType: any = recipientTypes.find(r => r.id === rt.recipient_type_id);


                        const meta_data = rt.meta_data || {};
                        const populatedMetaData = Object.keys(meta_data).reduce((acc: any, fieldConfigId: string) => {
                            const fieldConfig = fieldConfigMap[fieldConfigId];
                            if (fieldConfig) {
                                acc[fieldConfigId] = {
                                    id: fieldConfig.id,
                                    name: fieldConfig.name,
                                    slug: fieldConfig.slug,
                                    config: fieldConfig.config,
                                    field: fieldConfig.field_id
                                };
                            }
                            return acc;
                        }, {});

                        const input_values = Object.values(meta_data)[0];


                        const input_val = Object.values(meta_data)[1];
                        let input_value: CustomField | User | FoundationalDataTypes | null | any = null;

                        let behaviour = rt.behaviour;
                        if (behaviour == undefined || behaviour == null) {
                            if (["Top of Financial Authority Chain", "Financial Authority Chain", "Managerial Chain"].includes(recipientType?.name)) {
                                behaviour = "CHAIN";
                            } else if (["Manager of", "Master Data Owner", "Specific User", "Multiple users", "Users in Program Role", "Custom Field Supplied User", "Additional MDT Owner"].includes(recipientType?.name)) {
                                behaviour = "ANY";
                            }
                        }

                        if (["Top of Financial Authority Chain", "Financial Authority Chain", "Managerial Chain", "Manager of", ""].includes(recipientType?.name)) {
                            const specificRecipientType = await RecipientTypeModel.findOne({
                                where: { name: recipientType?.name, module_id: recipientType?.module_id, event_id: recipientType.event_id, method_id: recipientType.method_id }
                            });


                            if (specificRecipientType) {
                                const fieldConfigs = specificRecipientType.parameter_schema?.field_configs || [];
                                fieldConfigs.forEach((config: any) => {
                                    const children = config.children || [];
                                    const matchingChild = children.find((child: { id: any }) => child.id === input_values);

                                    if (matchingChild) {
                                        input_value = {
                                            id: matchingChild.id,
                                            name: matchingChild.field?.name || ''
                                        } as any;
                                    } else {
                                        if (!matchingChild) {
                                            input_value = {
                                                id: input_values,
                                                name: "Owner"
                                            } as any;
                                        }
                                    }
                                });
                            }
                        } else if (recipientType?.name === "Specific User" || recipientType?.name === "Multiple users" || recipientType?.name === "Job Manager") {
                            input_value = await User.findOne({
                                where: { user_id: input_values },
                                attributes: ["id", "user_id", "first_name", "last_name"]
                            });


                        } else if (recipientType?.name === "Custom Field Supplied User") {
                            input_value = await CustomField.findOne({
                                where: { id: input_values },
                                attributes: ["id", "name"]
                            });
                        } else if (recipientType?.name === "Master Data Owner" ||  recipientType?.name === "Additional MDT Owner") {
                            input_value = await FoundationalDataTypes.findOne({
                                where: { id: input_values },
                                attributes: ["id", "name"]
                            });
                        } else if (recipientType?.name === "Users in Program Role") {
                            const apiUrl = `${AUTH_BASE_URL}/v1/api/roles/${input_values}?tenant-id=${program_id}`;
                            const data = {
                                role_id: `${input_values}`
                            };
                            const response = await axios.post(apiUrl, data, {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                },
                            });
                            if (response.data && response.data.response && response.data.response.roles) {
                                const role = response.data.response.roles;

                                input_value = {
                                    id: role.id,
                                    name: role.display_name,

                                };


                            }
                        } else if (recipientType?.name === "Vendor Users") {
                            input_value = {
                                id: input_values,
                            } as any;
                        }
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

                        Object.keys(meta_data).forEach((fieldConfigId, index) => {
                            if (!populatedMetaData[fieldConfigId]) {
                                populatedMetaData[fieldConfigId] = {};
                            }

                            if (index === 0) {
                                if (Array.isArray(input_value)) {
                                    populatedMetaData[fieldConfigId].input_value = input_value.map((value: any) => ({
                                        id: value.user_id,
                                        name: getName(value)
                                    }));
                                } else if (input_value) {
                                    populatedMetaData[fieldConfigId].input_value = [{
                                        id: input_value.user_id || input_value.id,
                                        name: getName(input_value)
                                    }];
                                } else {
                                    populatedMetaData[fieldConfigId].input_value = [];
                                }
                            } else if (index === 1) {
                                populatedMetaData[fieldConfigId].input_value = input_val;
                            }
                        });

                        return {
                            id: rt.id,
                            behaviour: behaviour,
                            recipient_type: recipientType || null,
                            metadata: populatedMetaData
                        };
                    }));
                }

                if (Array.isArray(level.conditions)) {
                    level.conditions = level.conditions.map(condition => {
                        if (condition.field_operator_id) {
                            condition.field_operator = fieldOperatorMap[condition.field_operator_id];
                        }
                        if (condition.field_config) {
                            const fieldConfig = fieldConfigMap[condition.field_config];
                            condition.field_config = fieldConfig;

                        }
                        if (condition.source_field_meta?.selected_item) {
                            const selectedItem = selectedItemMap[condition.source_field_meta.selected_item];
                            if (selectedItem) {
                                condition.source_field_meta = {
                                    id: selectedItem.id,
                                    name: selectedItem.name,
                                    slug: selectedItem.slug
                                };
                            }
                            const masterDataItem = masterItemMap[condition.source_field_meta.selected_item];
                            if (masterDataItem) {
                                condition.source_field_meta = {
                                    id: masterDataItem.id,
                                    name: masterDataItem.name
                                };
                            }
                            
                            const picklistItem = picklistItemMap[condition.source_field_meta.selected_item];
                            
                            if (picklistItem) {
                                condition.source_field_meta = {
                                    id: picklistItem.id,
                                    name: picklistItem.value,
                                    slug: picklistItem.slug
                                };
                            }
                            delete condition.source_field_meta.selected_item;
                        }

                        const targetMaps = [
                            { map: targetItemMap, key: 'targetItem' },
                            { map: labourCategoryItemMap, key: 'labourCategoryItem' },
                            { map: masterDataMap, key: 'masterDataItem' },
                            { map: createOrgItemMap, key: 'createOrgItem' },
                            { map: jobTemplateMap, key: 'jobTemplateItem', nameField: 'template_name' },
                            { map: userMap, key: 'userItem', username: ['first_name', 'last_name'] },
                            { map: timesheetTypeMap, key: 'timesheetTypeItem', nameField: 'title' },
                            { map: roleMap, key: 'roleItem', nameField: 'name' },
                            { map: picklistItemMap, key: 'picklistItem', nameField: 'value' }
                        ];

                        if (condition.target_field_value?.values) {
                            const values = Array.isArray(condition.target_field_value.values)
                                ? condition.target_field_value.values
                                : [condition.target_field_value.values];

                            condition.target_field_obj = values.flatMap((value: string | number) => {
                                for (const { map, nameField, username } of targetMaps) {

                                    const item = map[value];
                                    if (item) {
                                        if (username && Array.isArray(username)) {
                                            const fullName = username.map(field => item[field]).filter(Boolean).join(' ');


                                            return {
                                                id: item.id ?? (item[nameField ?? 'name'] || item.user_id),
                                                name: fullName || item[nameField ?? 'name'],
                                            };
                                        }

                                        return {
                                            id: item.id ?? item[nameField ?? 'name'],
                                            name: item[nameField ?? 'name'],
                                        };
                                    }
                                }
                                return {
                                    id: `${value}`,
                                    name: `${value}`,
                                };
                            }).filter(Boolean);
                        } else {
                            condition.target_field_obj = null;
                        }

                        return condition;

                    });
                }
                return level;
            })
        );


        const workflow = {
            ...item.toJSON(),
            Module: moduleData ? moduleData.toJSON() : null,
            Event: eventData ? eventData.toJSON() : null,
            Method: methodData ? methodData.toJSON() : null,
            hierarchies: hierarchiesData.map(hierarchy => ({
                id: hierarchy.get('id'),
                name: hierarchy.get('name')
            })),
            levels: levelsWithDetails
        };

        reply.status(200).send({
            status_code: 200,
            message: "workflow retrieved successfully",
            workflow,
            trace_id: traceId
        });
    } catch (error) {
        console.log(error);
        reply.status(500).send({
            status_code: 500,
            message: "internal server error",
            error: error,
            trace_id: traceId
        });
    }
}

export async function getChildWorkflows(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found', trace_id: traceId });
    }
    const token = authHeader.split(' ')[1];
    const user: any = await decodeToken(token);
    try {
        const params = request.params as {
            program_id: string;
            workflow_id: string;
            flow_type: string;
        };
        const query = request.query as any;
        const normalizedFlowType = params.flow_type?.trim().toLowerCase();
        const filters: any = {
            program_id: params.program_id,
            workflow_id: params.workflow_id,
            flow_type: normalizedFlowType,
            is_enabled: query.is_enabled !== undefined ? (query.is_enabled === 'true' ? 1 : 0) : null,
            name: query.name ? `%${query.name}%` : null,
        };
        console.log(filters);

        const hierarchyIds = query.hierarchy_id ? query.hierarchy_id.split(',') : [];
        hierarchyIds.forEach((id: any, index: number) => {
            filters[`hierarchy_id_${index + 1}`] = id;
        });

        const Workflow = await sequelize.query(getparentWorkflowsQuery(hierarchyIds.length), {
            replacements: filters,
            type: QueryTypes.SELECT
        });

        let parentWorkflow: any[] = [];
        parentWorkflow = await Promise.all(
            (Workflow || []).map(async (workflow: any) => {
                if (workflow?.is_associated_to_all_hierarchy === 1) {
                    const hierarchyIdsForUser = await getHierarchyIds(user, params.program_id);
                    const hierarchy = await hierarchies.findAll({
                        where: { id: { [Op.in]: hierarchyIdsForUser } },
                        attributes: ['id', 'name']
                    });
                    return { ...workflow, hierarchies: hierarchy };
                } else {
                    return { ...workflow };
                }
            })
        );

        const childWorkflows = await sequelize.query(getChildWorkflowsQuery(hierarchyIds.length), {
            replacements: filters,
            type: QueryTypes.SELECT
        });

        if ((!parentWorkflow || parentWorkflow.length === 0) && (!childWorkflows || childWorkflows.length === 0)) {
            return reply.status(200).send({
                status_code: 200,
                message: "Workflow not found",
                workflows: [],
                trace_id: traceId
            });
        }

        let totalRecords = 0;
        if (childWorkflows && childWorkflows.length > 0) {
            const totalCountResult = await sequelize.query(countChildWorkflowsQuery(hierarchyIds.length), {
                replacements: filters,
                type: QueryTypes.SELECT
            }) as [{ total_workflows: number }];

            const totalChild = totalCountResult[0]?.total_workflows || 0;
            totalRecords = totalChild + (parentWorkflow && parentWorkflow.length > 0 ? 1 : 0);
        } else {
            totalRecords = parentWorkflow.length > 0 ? 1 : 0;
        }

        const workflows = parentWorkflow && parentWorkflow.length > 0
            ? [...parentWorkflow, ...childWorkflows]
            : [...childWorkflows];
        workflows.sort((a: any, b: any) => a.placement_order - b.placement_order);
        reply.status(200).send({
            status_code: 200,
            total_records: totalRecords,
            message: "Workflows fetched successfully.",
            workflows,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: "An error occurred while fetching workflow data.",
            error: (error).message,
            trace_id: traceId
        });
    }
}

export const createWorkflowLevel = async (request: FastifyRequest, reply: FastifyReply) => {
    const WorkflowLevelPayload = request.body as Omit<WorkflowLevelData, '_id'>;
    const { program_id } = request.params as { program_id: string };
    const trace_id = generateCustomUUID();
    try {
        const createdWorkflowLevel: any = await WorkflowTriggeredLevel.create({ ...WorkflowLevelPayload, program_id });
        reply.status(201).send({
            status_code: 201,
            workflow_level: {
                id: createdWorkflowLevel?.id,
            },
            trace_id
        });
    } catch (error) {
        reply.status(500).send({
            statusCode: 500,
            message: 'Error while creating workflow triggered level.',
            trace_id
        });
    }
};
export const createWorkflowRecipientType = async (request: FastifyRequest, reply: FastifyReply) => {
    const WorkflowRecipientTypePayload = request.body as Omit<WorkflowLevelData, '_id'>;
    const { program_id } = request.params as { program_id: string };
    const trace_id = generateCustomUUID();
    try {
        const createdWorkflowRecipientType: any = await WorkflowTriggeredRecipientType.create({ ...WorkflowRecipientTypePayload, program_id });
        reply.status(201).send({
            status_code: 201,
            workflow_recipient_type: {
                id: createdWorkflowRecipientType?.id,
            },
            trace_id
        });
    } catch (error) {
        console.log(error);

        reply.status(500).send({
            statusCode: 500,
            message: 'Error while creating workflow triggered recipient type.',
            trace_id
        });
    }
};

export async function workflowFilter(
    request: FastifyRequest<{
        Params: { program_id: string };
        Body: {
            id?: string;
            event_id?: string[];
            hierarchy_ids?: string[];
            module?: string[];
            page?: string;
            limit?: string;
        };
    }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const { id, event_id = [], hierarchy_ids = [], module = [], page, limit } = request.body;
        const pageNumber = parseInt(page ?? '1', 10);
        const limitNumber = parseInt(limit ?? '10', 10);
        const offset = (pageNumber - 1) * limitNumber;
        const query = workflowAdvanceFilter(
            Boolean(id),
            event_id,
            module,
            hierarchy_ids
        );
        const replacements: Record<string, any> = {
            program_id,
            id,
            limit: limitNumber,
            offset
        };
        hierarchy_ids.forEach((hierarchyId, index) => {
            replacements[`hierarchy_id${index}`] = hierarchyId;
        });
        event_id.forEach((event, index) => {
            replacements[`event_id${index}`] = event;
        });
        module.forEach((mod, index) => {
            replacements[`module${index}`] = mod;
        });
        const data = await sequelize.query<{ total_count: any }>(query, {
            replacements,
            type: QueryTypes.SELECT
        });
        const totalRecords = data.length > 0 ? data[0].total_count : 0;
        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: data.length > 0 ? 'Workflow data fetched successfully' : 'Workflow data not found',
            total_records: totalRecords,
            workflows: data,
            page: pageNumber,
            limit: limitNumber
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message
        });
    }
}