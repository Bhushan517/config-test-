import { FastifyRequest } from "fastify";
import ExpenseConfigurationModel from "../models/expense-configuration.model";
import generateCustomUUID from "../utility/genrateTraceId";
import { ExpenseConfigurationAttributes, HierarchyId } from "../interfaces/expense-configuration.interfaces";
import { QueryTypes, Op, Sequelize } from 'sequelize';
import { sequelize } from "../config/instance";
import { decodeToken } from "../middlewares/verifyToken";
import { logger } from "../utility/loggerService";
import ExpenseTypeMapping from "../models/expense-config-expense-type-mapping.model";
import Hierarchies from "../models/hierarchies.model";
import ExpenseTypeModel from "../models/expense-type.model";
import { getAllExpenseConfigHierarchies, getExpenseByHierarchy, getExpenseConfigurationQuery } from "../repositories/expense-config.repository";
import FoundationalDataTypes from "../models/master-datatypes.model";
import CustomField from "../models/custom-fields.model";
import GlobalRepository from "../repositories/global.repository";

class ExpenseConfigurationService {
    async getExpenseConfigurations({
        request,
        traceId
    }: {
        request: FastifyRequest<{}>;
        traceId: string;
    }) {
        try {
            const { program_id } = request.params as { program_id: string };
            const { page = 1, limit = 10, name, is_enabled, updated_on, hierarchy_ids,
            } = request.query as { page?: number; limit?: number; name?: string; is_enabled?: string | boolean; updated_on?: string; hierarchy_ids?: string; expense_type_ids?: string; };
            const offset = (page - 1) * limit;
            const whereCondition: any = {
                program_id,
                is_deleted: false,
                latest: true,
            };

            if (name) whereCondition.name = name;

            if (is_enabled !== undefined) whereCondition.is_enabled = is_enabled === "true";

            if (updated_on) {
                const dateRange = updated_on.split(',').map(date => new Date(date.trim()));
                if (dateRange.length === 2 && !isNaN(dateRange[0].getTime()) && !isNaN(dateRange[1].getTime())) {
                    whereCondition.updated_on = { [Op.between]: [dateRange[0].toISOString(), dateRange[1].toISOString()] };
                }
            }
            if (hierarchy_ids) {
                const ids = hierarchy_ids.split(',').map(id => id.trim());
                whereCondition[Op.and] = ids.map(id =>
                    Sequelize.where(
                        Sequelize.literal(`JSON_CONTAINS(hierarchy_ids, '["${id}"]')`),
                        true
                    )
                );
            }
            const { count, rows: expenseConfigList } = await ExpenseConfigurationModel.findAndCountAll({
                where: whereCondition,
                offset,
                limit,
                order: [['created_on', 'DESC']],
            });
            const populatedExpenseConfig = await Promise.all(
                expenseConfigList.map(async (config) => {
                    const configJSON = config.toJSON();
                    const hierarchyIds = Array.isArray(configJSON.hierarchy_ids) ? configJSON.hierarchy_ids : [];
                    let hierarchyDetails: { id: any; name: any }[] = [];
                    if (hierarchyIds.length > 0) {
                        const hierarchies = await Hierarchies.findAll({
                            where: { id: { [Op.in]: hierarchyIds } },
                            attributes: ['id', 'name'],
                        });
                        hierarchyDetails = hierarchies.map((h: any) => ({
                            id: h.id,
                            name: h.name,
                        }));
                    }
                    return {
                        ...configJSON,
                        hierarchy_ids: hierarchyDetails,
                    };
                })
            );
            return {
                status: 200,
                response: {
                    status_code: 200,
                    message: populatedExpenseConfig.length > 0
                        ? 'Expense configuration fetched successfully.'
                        : 'No expense configuration found.',
                    trace_id: traceId,
                    total: count,
                    page,
                    limit,
                    totalPages: Math.ceil(count / limit),
                    data: populatedExpenseConfig,
                }
            };
        } catch (error) {
            return {
                status: 500,
                response: {
                    status_code: 500,
                    message: 'Internal Server Error',
                    trace_id: traceId,
                    error: (error as Error).message,
                }
            };
        }
    }

    async getExpenseConfigurationById({
        program_id,
        id,
        traceId
    }: {
        program_id: string;
        id: string;
        traceId: string;
    }) {
        try {
            const query = getExpenseConfigurationQuery(program_id, id);
            const [expenseConfig] = await sequelize.query(query, {
                replacements: { program_id, id },
                type: QueryTypes.SELECT,
            }) as [{ [key: string]: any }];
            if (!expenseConfig) {
                return {
                    status: 200,
                    response: {
                        status_code: 200,
                        message: 'Expense configuration not found.',
                        trace_id: traceId,
                        expense_config: [],
                    }
                };
            }
            const parseJsonSafely = (value: any): any[] => {
                try {
                    return typeof value === 'string' ? JSON.parse(value) : value ?? [];
                } catch {
                    return [];
                }
            };
            const convertExpenseConfigBooleans = (config: any) => {
                return {
                    ...config,
                    is_enabled: Boolean(config.is_enabled),
                    is_mdt_enabled: Boolean(config.is_mdt_enabled),
                    is_projects_enabled: Boolean(config.is_projects_enabled),
                    is_thresholds_enabled: Boolean(config.is_thresholds_enabled),
                    latest: Boolean(config.latest),
                    is_deleted: Boolean(config.is_deleted),
                };
            };
            const transformedExpenseConfig = {
                ...convertExpenseConfigBooleans(expenseConfig),
                master_data_types: parseJsonSafely(expenseConfig.master_data_types),
                expense_types: parseJsonSafely(expenseConfig.expense_types).map((et: any) => ({
                    ...et,
                    is_enabled: Boolean(et.is_enabled),
                    is_attachments_mandatory: Boolean(et.is_attachments_mandatory),
                    is_notes_mandatory: Boolean(et.is_notes_mandatory),
                    is_msp_fees_applied: Boolean(et.is_msp_fees_applied),
                    is_tax_applied: Boolean(et.is_tax_applied),
                    is_negative_expense_allowed: Boolean(et.is_negative_expense_allowed),
                    is_unit_based: Boolean(et.is_unit_based),
                })),
            };
            return {
                status: 200,
                response: {
                    status_code: 200,
                    message: 'Expense configuration fetched successfully.',
                    trace_id: traceId,
                    expenseConfig: transformedExpenseConfig,
                }
            };
        } catch (error: any) {
            console.error('Error fetching expense config:', error);
            return {
                status: 500,
                response: {
                    status_code: 500,
                    message: 'An error occurred while fetching expense configuration.',
                    trace_id: traceId,
                    error: error.message,
                }
            };
        }
    }

    async createExpenseConfiguration({
        request,
        user,
        traceId
    }: {
        request: FastifyRequest;
        user: { sub: string; preferred_username: string };
        traceId: string;
    }) {
        try {
            const { program_id } = request.params as { program_id: string };
            const expenseConfig = request.body as ExpenseConfigurationAttributes;
            const entityId = generateCustomUUID();

            if (!expenseConfig.hierarchy_ids || !Array.isArray(expenseConfig.hierarchy_ids) || expenseConfig.hierarchy_ids.length === 0) {
                return {
                    status: 400,
                    response: {
                        status_code: 400,
                        message: "hierarchy_ids are required and must be a non-empty array",
                        trace_id: traceId,
                    }
                };
            }

            const existingConfigWithName = await ExpenseConfigurationModel.findAll({
                where: {
                    program_id,
                    name: expenseConfig.name,
                    is_deleted: false,
                    is_enabled: true,
                    latest: true,
                },
            });

            if (existingConfigWithName.length > 0) {
                return {
                    status: 409,
                    response: {
                        status_code: 409,
                        message: "An expense configuration with the same name already exists",
                        trace_id: traceId,
                    }
                };
            }

            const existingConfigs = await ExpenseConfigurationModel.findAll({
                where: {
                    program_id,
                    is_deleted: false,
                    latest: true,
                    is_enabled: true,
                    [Op.or]: expenseConfig.hierarchy_ids.map((id: any) =>
                        Sequelize.where(
                            Sequelize.literal(`JSON_CONTAINS(hierarchy_ids, '["${id}"]')`),
                            true
                        )
                    ),
                },
            });

            if (existingConfigs.length > 0) {
                return {
                    status: 409,
                    response: {
                        status_code: 409,
                        message: 'An Expense configuration with the same hierarchy already exists.',
                        trace_id: traceId,
                    }
                };
            }

            for (const config of existingConfigs) {
                const configHierarchyIds = config.hierarchy_ids ?? [];
                const newHierarchyIds = expenseConfig.hierarchy_ids ?? [];

                const sameHierarchies: boolean = configHierarchyIds.length === newHierarchyIds.length &&
                    configHierarchyIds.every((id: HierarchyId) => newHierarchyIds.includes(id));

                if (sameHierarchies) {
                    return {
                        status: 409,
                        response: {
                            status_code: 409,
                            message: "An expense configuration with the same hierarchy IDs already exists",
                            trace_id: traceId,
                        }
                    };
                }
            }

            const slug = (expenseConfig.name ?? '')
                .trim()
                .toLowerCase()
                .replace(/\s+/g, '_')
                .replace(/[^\w]+/g, '');

            const expenseConfigData = await ExpenseConfigurationModel.create({
                ...expenseConfig,
                entity_id: entityId,
                program_id,
                slug,
                created_by: user.sub,
                updated_by: user.sub,
                is_enabled: true,
                latest: true,
                is_deleted: false,
            });

            if (Array.isArray(expenseConfig.expense_types)) {
                for (const expenseTypeId of expenseConfig.expense_types) {
                    await ExpenseTypeMapping.create({
                        program_id,
                        expense_config_id: expenseConfigData.id,
                        expense_type_id: expenseTypeId,
                    });
                }
            }

            return {
                status: 201,
                response: {
                    status_code: 201,
                    trace_id: traceId,
                    id: expenseConfigData.id,
                    message: "Expense configuration created successfully.",
                }
            };
        } catch (error: any) {
            return {
                status: 500,
                response: {
                    status_code: 500,
                    message: "An error occurred while creating expense configuration.",
                    trace_id: traceId,
                    error: error.message,
                }
            };
        }
    }

    async updateExpenseConfiguration({
        request,
        user,
        traceId
    }: {
        request: FastifyRequest;
        user: { sub: string; preferred_username: string };
        traceId: string;
    }) {
        const transaction = await sequelize.transaction();

        try {
            const { id, program_id } = request.params as { id: string; program_id: string };
            const updatedData = request.body as ExpenseConfigurationAttributes;
            const newHierarchyIds = updatedData.hierarchy_ids ?? [];

            const existingConfig = await ExpenseConfigurationModel.findOne({
                where: { id, program_id, is_deleted: false},
                transaction,
            });

            if (!existingConfig) {
                await transaction.rollback();
                return {
                    status: 400,
                    response: {
                        status_code: 400,
                        trace_id: traceId,
                        message: 'Expense configuration not found.',
                    }
                };
            }

            const oldHierarchyIds = existingConfig.hierarchy_ids ?? [];

            if (!this.arraysEqual(oldHierarchyIds, newHierarchyIds) && newHierarchyIds.length > 0) {
                const conflictResult = await this.checkHierarchyConflicts(program_id, newHierarchyIds, id, transaction);

                if (conflictResult.hasConflict) {
                    await transaction.rollback();
                    return {
                        status: 409,
                        response: {
                            status_code: 409,
                            trace_id: traceId,
                            message: 'An expense configuration with the same hierarchy IDs already exists',
                            conflicting_record_ids: conflictResult.conflictingIds
                        }
                    };
                }

                if (conflictResult.exactMatch) {
                    await transaction.commit();
                    return {
                        status: 200,
                        response: {
                            status_code: 200,
                            message: 'Expense configuration updated successfully.',
                            trace_id: traceId,
                            data: conflictResult.exactMatch,
                        }
                    };
                }
            }

            const newConfig = await this.createNewConfigurationVersion(
                existingConfig,
                updatedData,
                user.sub,
                transaction
            );

            if (Array.isArray(updatedData.expense_types)) {
                await this.createExpenseTypeMappings(program_id, newConfig.id, updatedData.expense_types, transaction);
            }

            await transaction.commit();

            return {
                status: 200,
                response: {
                    status_code: 200,
                    message: 'Expense configuration versioned update successful.',
                    trace_id: traceId,
                    data: newConfig,
                }
            };

        } catch (error: any) {
            await transaction.rollback();
            return {
                status: 500,
                response: {
                    status_code: 500,
                    trace_id: traceId,
                    message: 'An error occurred while updating expense configuration.',
                    error: error.message,
                }
            };
        }
    }

    arraysEqual(arr1: any[], arr2: any[]): boolean {
        if (arr1.length !== arr2.length) return false;
        return arr1.every(item => arr2.includes(item)) && arr2.every(item => arr1.includes(item));
    }

    async checkHierarchyConflicts(program_id: string, hierarchyIds: string[], excludeId: string, transaction: any): Promise<{
        hasConflict: boolean;
        conflictingIds?: string[];
        exactMatch?: any;
    }> {
        if (hierarchyIds.length === 0) return { hasConflict: false };

        const conditions = hierarchyIds.map(id =>
            Sequelize.where(
                Sequelize.literal(`JSON_CONTAINS(hierarchy_ids, '["${id}"]')`),
                true
            )
        );

        const potentialConflicts = await ExpenseConfigurationModel.findAll({
            attributes: ['id', 'hierarchy_ids'],
            where: {
                program_id,
                is_deleted: false,
                latest: true,
                is_enabled: true,
                id: { [Op.ne]: excludeId },
                [Op.or]: conditions,
            },
            transaction,
        }) as any[];

        const exactMatch = potentialConflicts.find(c =>
            this.arraysEqual(c.hierarchy_ids ?? [], hierarchyIds)
        );

        if (exactMatch) {
            return { hasConflict: false, exactMatch };
        }

        if (potentialConflicts.length > 0) {
            return {
                hasConflict: true,
                conflictingIds: potentialConflicts.map(c => c.id.toString()),
            };
        }

        return { hasConflict: false };
    }

    async createNewConfigurationVersion(existingConfig: any, updatedData: ExpenseConfigurationAttributes, userId: string, transaction: any): Promise<any> {
        await existingConfig.update({ latest: false, is_enabled: false }, { transaction });

        const oldRevision = Number(existingConfig.revision ?? 0);
        const newRevision = oldRevision + 1;

        return await ExpenseConfigurationModel.create(
            {
                ...existingConfig.toJSON(),
                ...updatedData,
                id: undefined,
                revision: newRevision,
                latest: true,
                updated_by: userId,
                updated_on: Date.now(),
                created_by: existingConfig.created_by,
                created_on: existingConfig.created_on,
                entity_id: existingConfig.entity_id,
            },
            { transaction }
        );
    }

    async createExpenseTypeMappings(program_id: string, expenseConfigId: string, expenseTypes: string[], transaction: any): Promise<void> {
        if (expenseTypes.length === 0) return;

        const bulkMappings = expenseTypes.map(expenseTypeId => ({
            program_id,
            expense_config_id: expenseConfigId,
            expense_type_id: expenseTypeId,
        }));

        await ExpenseTypeMapping.bulkCreate(bulkMappings, { transaction });
    }

    async enableExpenseConfiguration({
        request,
        user,
        traceId
    }: {
        request: FastifyRequest;
        user: { sub: string; preferred_username: string };
        traceId: string;
    }) {
        try {
            const { program_id } = request.params as { program_id: string };
            const { id, is_enabled } = request.body as { id: string; is_enabled: boolean };

            const [updatedCount] = await ExpenseConfigurationModel.update(
                {
                    is_enabled: is_enabled,
                    updated_by: user.sub,
                    updated_on: Date.now(),
                },
                { where: { program_id, id } }
            );

            if (updatedCount > 0) {
                return {
                    status: 200,
                    response: {
                        status_code: 200,
                        message: 'Expense configuration updated successfully.',
                        trace_id: traceId,
                        expense_config: id,
                    }
                };
            }
        } catch (error: any) {
            return {
                status: 500,
                response: {
                    status_code: 500,
                    message: 'An error occurred while deleting expense configuration.',
                    trace_id: traceId,
                    error: error.message
                }
            };
        }
    }

    async getAllExpenseConfigurationHierarchies({
        program_id,
        traceId
    }: {
        program_id: string;
        traceId: string;
    }) {
        try {
            const query = getAllExpenseConfigHierarchies;
            const results: any[] = await sequelize.query(query, {
                replacements: { program_id },
                type: QueryTypes.SELECT,
            });
            const hierarchyIds = results.flatMap((row) => row.hierarchy_ids ?? []);
            return {
                status: 200,
                response: {
                    status_code: 200,
                    trace_id: traceId,
                    message: hierarchyIds.length
                        ? 'Hierarchy IDs retrieved successfully.'
                        : 'No hierarchy IDs found for the specified program.',
                    hierarchies: hierarchyIds,
                }
            };
        } catch (error: any) {
            console.error("Error retrieving hierarchy IDs:", error);
            return {
                status: 500,
                response: {
                    status_code: 500,
                    message: 'Internal Server Error',
                    trace_id: traceId,
                    error: error.message,
                }
            };
        }
    }

    async expenseConfigurationAdvancedFilter({
        request,
        user,
        traceId
    }: {
        request: FastifyRequest;
        user: any;
        traceId: string;
    }) {
        try {
            const { program_id } = request.params as { program_id: string };
            const { page = 1, limit = 10, name, is_enabled, updated_on, hierarchy_ids } = request.body as { page: number; limit: number; name?: string; is_enabled?: string | boolean; updated_on?: string; hierarchy_ids?: string[] };
            const offset = (page - 1) * limit;
            const whereCondition: any = {
                program_id,
                is_deleted: false,
                latest: true,
            };
            if (name) {
                whereCondition.name = { [Op.like]: `%${name}%` };
            }
            if (is_enabled !== undefined) {
                whereCondition.is_enabled = is_enabled === true || is_enabled === "true";
            }
            if (updated_on) {
                const [start, end] = (Array.isArray(updated_on)
                    ? updated_on.map(Number)
                    : updated_on.split(',').map(d => new Date(d.trim()).getTime())
                ).filter(n => !isNaN(n));

                if (start && end) {
                    whereCondition.updated_on = { [Op.between]: [start, end] };
                } else if (start) {
                    whereCondition.updated_on = { [Op.between]: [start, start + 86400000 - 1] };
                } else if (end) {
                    whereCondition.updated_on = { [Op.lte]: end };
                }
            }
            const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);
            const allConditions = [];
            const body = request.body as any;
            const hierarchyFilter: string[] = Array.isArray(hierarchy_ids) && hierarchy_ids.length
                ? hierarchy_ids
                : Array.isArray(body?.hierarchy) && body.hierarchy.length
                    ? body.hierarchy
                    : [];

            if (hierarchyFilter.length > 0) {
                whereCondition[Op.or] = hierarchyFilter.map((id: string) =>
                    Sequelize.where(
                        Sequelize.literal(`JSON_CONTAINS(hierarchy_ids, '"${id}"')`),
                        true
                    )
                );
            }
            if (Array.isArray(mspHierarchyIds) && mspHierarchyIds.length > 0) {
                const mspHierarchyChecks = mspHierarchyIds.map((hierarchyId: string) =>
                    sequelize.literal(`JSON_CONTAINS(hierarchy_ids, '"${hierarchyId}"')`)
                );
                allConditions.push({
                    [Op.or]: [
                        ...mspHierarchyChecks,
                        { hierarchy_ids: null },
                        sequelize.literal(`hierarchy_ids = '[]'`),
                        { hierarchy_ids: '' }
                    ]
                });
            }

            if (allConditions.length > 0) {
                whereCondition[Op.and] = allConditions.length === 1 ? allConditions[0] : { [Op.and]: allConditions };
            }
            whereCondition.latest = true;
            const { count, rows: expenseConfigList } = await ExpenseConfigurationModel.findAndCountAll({
                where: whereCondition,
                offset,
                limit,
                order: [
                    ['is_enabled', 'DESC'], // Sort enabled configurations first
                    ['created_on', 'DESC']  // Then by creation date (newest first)
                ],
            });
            const populatedExpenseConfig = await Promise.all(
                expenseConfigList.map(async (config) => {
                    const configJSON = config.toJSON();
                    let hierarchyDetails: { id: any; name: any }[] = [];
                    if (Array.isArray(configJSON.hierarchy_ids) && configJSON.hierarchy_ids.length > 0) {
                        const hierarchies = await Hierarchies.findAll({
                            where: { id: { [Op.in]: configJSON.hierarchy_ids } },
                            attributes: ['id', 'name'],
                        });
                        hierarchyDetails = hierarchies.map((h: any) => ({ id: h.id, name: h.name }));
                    }
                    return {
                        ...configJSON,
                        hierarchy_ids: hierarchyDetails,
                    };
                })
            );
            return {
                status: 200,
                response: {
                    status_code: 200,
                    message: populatedExpenseConfig.length > 0
                        ? 'Expense configuration fetched successfully.'
                        : 'No expense configuration found.',
                    trace_id: traceId,
                    totalRecords: count,
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    pageSize: limit,
                    data: populatedExpenseConfig,
                }
            };
        } catch (error) {
            return {
                status: 500,
                response: {
                    status_code: 500,
                    message: 'Internal Server Error',
                    trace_id: traceId,
                    error: (error as Error).message,
                }
            };
        }
    }

    async getExpenseTypesByProgramIdAndHierarchies({
        program_id,
        hierarchy_ids,
        traceId
    }: {
        program_id: string;
        hierarchy_ids: string;
        traceId: string;
    }) {
        try {
            const hierarchyIdsArray = hierarchy_ids ? hierarchy_ids.split(",") : [];
            const query = getExpenseByHierarchy(hierarchyIdsArray);
            const replacements = [program_id, ...hierarchyIdsArray];
            const results = await sequelize.query(query, {
                replacements,
                type: QueryTypes.SELECT
            });
            return {
                status: 200,
                response: {
                    status_code: 200,
                    trace_id: traceId,
                    message: 'Expense types fetched successfully.',
                    data: results,
                }
            };
        } catch (error) {
            return {
                status: 500,
                response: {
                    status_code: 500,
                    trace_id: traceId,
                    message: 'An error occurred while fetching expense types.',
                    error,
                }
            };
        }
    }

    async getExpenseConfigByExpenseType({
        request,
        traceId
    }: {
        request: FastifyRequest;
        traceId: string;
    }) {
        try {
            const { program_id } = request.params as { program_id: string };
            const { hierarchy_ids, expense_type_ids } = request.query as { hierarchy_ids: string; expense_type_ids: string };
            const whereCondition: any = {
                program_id,
                is_deleted: false,
                is_enabled: true,
                latest: true
            };

            if (hierarchy_ids) {
                const ids = hierarchy_ids.split(',').map(id => id.trim());
                whereCondition[Op.and] = ids.map(id =>
                    Sequelize.where(
                        Sequelize.literal(`JSON_CONTAINS(hierarchy_ids, '["${id}"]')`),
                        true));
            }

            if (expense_type_ids) {
                const typeIds = expense_type_ids.split(',').map(id => id.trim());
                const mappings = await ExpenseTypeMapping.findAll({
                    where: {
                        expense_type_id: { [Op.in]: typeIds },
                        program_id,
                    },
                    attributes: ['expense_config_id'],
                });
                const expenseConfigIds = mappings.map((m: any) => m.expense_config_id);
                whereCondition.id = { [Op.in]: expenseConfigIds };
            }

            // Find the single matching expense configuration
            const expenseConfig = await ExpenseConfigurationModel.findOne({
                where: whereCondition,
                order: [['created_on', 'DESC']],
            });
            // If no configuration found, return null
            if (!expenseConfig) {
                return {
                    status: 200,
                    response: {
                        status_code: 200,
                        message: 'No expense configuration found.',
                        trace_id: traceId,
                        data: null,
                    }
                };
            }

            // Process the single expense config
            const configJSON = expenseConfig.toJSON();
            const hierarchies = await Hierarchies.findAll({
                where: { id: { [Op.in]: configJSON.hierarchy_ids ?? [] } },
                attributes: ['id', 'name'],
            });
            const master_data_types = await FoundationalDataTypes.findAll({
                where: { id: { [Op.in]: configJSON.master_data_types ?? [] } },
                attributes: ['id', 'name'],
            });

            const expenseTypes = await ExpenseTypeMapping.findAll({
                where: {
                    expense_config_id: configJSON.id,
                    program_id: configJSON.program_id,
                },
                include: [{
                    model: ExpenseTypeModel,
                    as: 'expense_type',
                    attributes: { exclude: ["program_id", "created_on", "updated_on", "created_by", "updated_by"], },
                }],
            });

            let populatedProjects = null;
            const projects = configJSON.projects;

            if (projects?.source && projects.options) {
                let optionsArray: string[] = [];
                if (Array.isArray(projects.options)) {
                    optionsArray = projects.options;
                } else if (typeof projects.options === "string") {
                    optionsArray = projects.options.includes(",")
                        ? projects.options.split(",").map((id: string) => id.trim())
                        : [projects.options];
                }
                let records: any[] = [];

                if (projects.source === "master_data_type") {
                    records = await FoundationalDataTypes.findAll({
                        where: { id: { [Op.in]: optionsArray } },
                        attributes: ['id', 'name'],
                    });
                } else if (projects.source === "hierarchy") {
                    records = await Hierarchies.findAll({
                        where: { id: { [Op.in]: optionsArray } },
                        attributes: ['id', 'name'],
                    });
                } else if (projects.source === "custom_field") {
                    records = await CustomField.findAll({
                        where: { id: { [Op.in]: optionsArray } },
                        attributes: ['id', 'name'],
                    });
                }

                populatedProjects = {
                    source: projects.source,
                    options: records.map((r: any) => ({
                        id: r.id,
                        name: r.name,
                    })),
                };
            }

            const result = {
                ...configJSON,
                hierarchy_ids: hierarchies.map(h => ({ id: h.id, name: h.name })),
                master_data_types: master_data_types.map(m => ({ id: m.id, name: m.name })),
                expenseTypes: expenseTypes.reduce((acc: any, curr: any) => {
                    const expense = curr.expense_type?.dataValues || curr.expense_type || {};
                    const category = expense.category || 'uncategorized';
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(expense);
                    return acc;
                }, {}),
                projects: populatedProjects,
            };

            return {
                status: 200,
                response: {
                    status_code: 200,
                    message: result ? 'Expense configuration fetched.' : 'No expense configuration found.',
                    trace_id: traceId,
                    data: result,
                }
            };

        } catch (error) {
            return {
                status: 500,
                response: {
                    status_code: 500,
                    message: 'Internal Server Error',
                    trace_id: traceId,
                    error: (error as Error).message,
                }
            };
        }
    }
}

export default new ExpenseConfigurationService(); 