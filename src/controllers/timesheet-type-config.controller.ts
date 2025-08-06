import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import { TimesheetTypeConfigInterface } from '../interfaces/timesheet-config.interface';
import TimesheetTypeConfig from '../models/timesheet-type-config.model';
import { sequelize } from '../config/instance';
import TimesheetExpenseRuleGroup from '../models/timesheet-expense-rule-group.model';
import FoundationalDataTypes from '../models/master-datatypes.model';
import IndustriesModel from '../models/labour-category.model';
import { Op, QueryTypes } from 'sequelize';
import { timesheetConfigAdvancedFilter, timesheetConfigAdvancedGetAllFilter } from '../utility/queries';
import hierarchies from '../models/hierarchies.model';
import { decodeToken } from '../middlewares/verifyToken';
import generateSlug from '../plugins/slugGenerate';
import GlobalRepository from '../repositories/global.repository';

export const createTimesheetTypeConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const data = request.body as TimesheetTypeConfigInterface;
        const user=request?.user;
        const userId = user?.sub;

        if (data.allow_timesheet_to_be_submitted) {
            data.allow_timesheet_to_be_submitted = data.allow_timesheet_to_be_submitted
                .toLowerCase()
                .replace(/\s+/g, '_');
        }

        const slug = generateSlug(data.title ?? '', { lowercase: true, removedspecial: true });

        const existingConfigConditions = [
            { title: data.title },
            { slug },
        ];

        for (const condition of existingConfigConditions) {
            const existingConfig = await TimesheetTypeConfig.findOne({
                where: {
                    program_id,
                    ...condition,
                },
            });
            if (existingConfig) {
                return reply.status(409).send({
                    status_code: 409,
                    trace_id: traceId,
                    message: `Timesheet type config with the same ${Object.keys(condition)[0]} already exists.`,
                });
            }
        }

        const newConfig = await TimesheetTypeConfig.create({
            program_id,
            slug,
            created_by: userId,
            updated_by: userId,
            ...data,
        });

        return reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            message: 'Timesheet type config created successfully.',
            id: newConfig.id,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Error while creating timesheet type config.',
            error: error.message,
        });
    }
};

export const getAllTimesheetTypeConfigs = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();

    try {
        const { program_id } = request.params as { program_id: string };
        const { page = '1', limit = '10' } = request.query as { page: string; limit: string };

        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const offset = (pageNumber - 1) * pageSize;

        const searchConditions: Record<string, any> = { is_deleted: false };
        if (program_id) searchConditions.program_id = program_id;

        const { count: totalRecords } = await sequelize.models.TimesheetTypeConfig.findAndCountAll({
            where: searchConditions,
            limit: pageSize,
            offset: offset,
        });

        const configs = await sequelize.query(
            `SELECT
                ttc.id,
                ttc.title,
                ttc.is_enabled,
                ttc.updated_on,
                ttc.work_start_day,
                ttc.timesheet_format,
                ttc.allocations,
                ttc.timesheet_rounding,
                ttc.break,
                ttc.slug,
                ttc.is_modification_rule,
                ttc.is_all_hierarchy_associated ,
                JSON_OBJECT('id', ttc.break_rule_group, 'name', terg_break.rule_group_name) AS break_rule_group,
                JSON_OBJECT('id', ttc.timesheet_rule_group, 'name', terg_timesheet.rule_group_name) AS timesheet_rule_group,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', h.id, 'name', h.name))
                 FROM hierarchies h
                 WHERE JSON_CONTAINS(ttc.hierarchies, JSON_QUOTE(h.id))) AS hierarchies,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', lc.id, 'name', lc.name))
                 FROM labour_category lc
                 WHERE JSON_CONTAINS(ttc.labor_category, JSON_QUOTE(lc.id))) AS labor_category
            FROM timesheet_type_config ttc
            LEFT JOIN timesheet_expense_rule_groups terg_break ON ttc.break_rule_group = terg_break.id
            LEFT JOIN timesheet_expense_rule_groups terg_timesheet ON ttc.timesheet_rule_group = terg_timesheet.id
            WHERE ttc.is_deleted = false
            AND (ttc.program_id = ? OR ? IS NULL)
            ORDER BY ttc.updated_on DESC
            LIMIT ? OFFSET ?`,
            { replacements: [program_id, program_id, pageSize, offset], type: QueryTypes.SELECT }
        );

        reply.status(200).send({
            status_code: 200,
            message: 'Timesheet type config fetched successfully',
            trace_id: traceId,
            items_per_page: pageSize,
            current_page: pageNumber,
            total_records: totalRecords,
            data: configs
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Error while fetching timesheet type configs.',
            error: error.message,
        });
    }
};


export const getTimesheetTypeConfigById = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();

    try {
        const { id, program_id } = request.params as { id: string; program_id: string };

        const config = await TimesheetTypeConfig.findOne({
            where: { id, program_id, is_deleted: false },
        });

        if (!config) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet Type Config not found.',
                trace_id: traceId,
                config: [],
            });
        }

        const hierarchyIds = config.hierarchies || [];
        const laborCategoryIds = config.labor_category || [];
        const ruleGroupId = config.timesheet_rule_group || null;
        const masterDataTypeIds = config.allocations?.master_data_types?.value || [];
        const breakRuleGroupId = config.break_rule_group || null;

        const projectOptionsIds = config.project?.config?.options || [];

        const [
            hierarchiesData,
            laborCategories,
            ruleGroups,
            masterDataTypes,
            breakRuleGroup,
            projectOptions
        ] = await Promise.all([
            hierarchyIds.length > 0
                ? hierarchies.findAll({ where: { id: hierarchyIds }, attributes: ['id', 'name'] })
                : [],
            laborCategoryIds.length > 0
                ? IndustriesModel.findAll({ where: { id: laborCategoryIds }, attributes: ['id', 'name'] })
                : [],
            ruleGroupId
                ? TimesheetExpenseRuleGroup.findOne({ where: { id: ruleGroupId }, attributes: ['id', 'rule_group_name'] })
                : null,
            masterDataTypeIds.length > 0
                ? FoundationalDataTypes.findAll({ where: { id: masterDataTypeIds }, attributes: ['id', 'name'] })
                : [],
            breakRuleGroupId
                ? TimesheetExpenseRuleGroup.findOne({ where: { id: breakRuleGroupId }, attributes: ['id', 'rule_group_name'] })
                : null,
            projectOptionsIds.length > 0
                ? FoundationalDataTypes.findAll({ where: { id: projectOptionsIds }, attributes: ['id', 'name'] })
                : []
        ]);

        const ruleGroupData = ruleGroups ? ruleGroups.toJSON() : null;
        const breakRuleGroupData = breakRuleGroup ? breakRuleGroup.toJSON() : null;

        const data = {
            ...config.toJSON(),
            input_format: config.input_format,
            hierarchies: hierarchiesData.map((hierarchy) => hierarchy.toJSON()),
            labor_category: laborCategories.map((category) => category.toJSON()),
            timesheet_rule_group: ruleGroupData ? {
                id: ruleGroupData.id,
                name: ruleGroupData.rule_group_name
            } : null,
            break_rule_group: breakRuleGroupData ? {
                id: breakRuleGroupData.id,
                name: breakRuleGroupData.rule_group_name
            } : null,
            allocations: {
                ...config.allocations,
                master_data_types: {
                    value: masterDataTypes.map((dataType) => dataType.toJSON()),
                    is_allow: config.allocations?.master_data_types?.is_allow || false,
                },
            },
            project: {
                ...config.project,
                config: {
                    ...config.project?.config,
                    options: projectOptions.map((option) => option.toJSON())
                }
            }
        };

        reply.status(200).send({
            status_code: 200,
            message: 'Timesheet Type Config found successfully.',
            config: data,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching Timesheet Type Config.',
            error: error.message,
            trace_id: traceId,
        });
    }
};


export const updateTimesheetTypeConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
     const user=request?.user;
    const userId = user?.sub;
    try {
        const { id, program_id } = request.params as { id: string; program_id: string };
        const configData = request.body as TimesheetTypeConfigInterface;

        const existingConfig = await TimesheetTypeConfig.findOne({
            where: {
                title: configData.title,
                program_id,
                id: { [Op.ne]: id },
            },
        });

        if (existingConfig) {
            return reply.status(409).send({
                status_code: 409,
                message: 'Timesheet Type Config name already exists for the given program.',
                trace_id: traceId,
            });
        }

        const config = await TimesheetTypeConfig.findOne({ where: { id, is_deleted: false } });
        if (!config) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet Type Config not found.',
                trace_id: traceId,
                config: [],
            });
        }
        await config.update({
            program_id,
            ...configData,
            updated_by: userId,
            updated_on: Date.now(),
        }, { transaction });
        await transaction.commit();
        reply.status(200).send({
            status_code: 200,
            message: 'Timesheet Type Config updated successfully.',
            trace_id: traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'Error updating Timesheet Type Config.',
            error: error?.message || 'Unknown error',
            trace_id: traceId,
        });
    }
};

export const deleteTimesheetTypeConfig = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    let { name } = request.body as { name: string };
    name = name.trim();
    const user=request?.user;
    const userId = user?.sub
    try {
        const { id } = request.params as { id: string };
        const config = await TimesheetTypeConfig.findOne({ where: { id, is_deleted: false } });

        if (!config) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet Type Config not found.',
                trace_id: traceId,
            });
        }

        await config.update({ is_enabled: false, is_deleted: true, updated_by: userId, });

        reply.status(200).send({
            status_code: 200,
            message: 'Timesheet Type Config deleted successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error deleting Timesheet Type Config.',
            error: error,
            trace_id: traceId,
        });
    }
};

export async function timesheetTypeConfigFilter(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const user = request?.user
    try {
        const { program_id } = request.params as { program_id: string };
        const {
            id,
            title,
            hierarchy_ids,
            labor_category,
            is_enabled,
            timesheet_rule_group,
            timesheet_format,
            allocation_method,
            page,
            limit,
        } = request.body as { id: string; title: string; hierarchy_ids: string[]; labor_category: string; is_enabled: string; timesheet_rule_group: string; timesheet_format: string; allocation_method: string; page: string; limit: string };

        const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);
        let isEnabledFilter;
        if (typeof is_enabled === 'string') {
            isEnabledFilter = is_enabled === 'true' ? 1 : 0;
        } else if (is_enabled === true) {
            isEnabledFilter = 1;
        } else if (is_enabled === false) {
            isEnabledFilter = 0;
        } else {
            isEnabledFilter = undefined;
        }

        const pageNumber = parseInt(page ?? '1');
        const limitNumber = parseInt(limit ?? '10');
        const offset = (pageNumber - 1) * limitNumber;
        const query = timesheetConfigAdvancedFilter(
            Boolean(id),
            Boolean(title),
            hierarchy_ids || [],
            Array.isArray(labor_category) ? labor_category : labor_category ? [labor_category] : [],
            Boolean(timesheet_rule_group),
            Boolean(timesheet_format),
            Boolean(allocation_method),
            isEnabledFilter !== undefined,
            mspHierarchyIds
        );

        const replacements: Record<string, any> = {
            program_id,
            id,
            title: title ? `%${title}%` : undefined,
            timesheet_rule_group,
            timesheet_format,
            allocation_method,
            limit: limitNumber,
            offset,
            is_enabled: isEnabledFilter,
        };

        if (Array.isArray(labor_category)) {
            labor_category.forEach((laborCategoryId, index) => {
                replacements[`labor_category_id${index}`] = laborCategoryId;
            });
        } else if (labor_category) {
            replacements[`labor_category_id0`] = labor_category;
        }

        hierarchy_ids?.forEach((hierarchyId, index) => {
            replacements[`hierarchy_id${index}`] = hierarchyId;
        });

        if (mspHierarchyIds && mspHierarchyIds.length > 0) {
            mspHierarchyIds.forEach((hierarchyId: any, index: any) => {
                replacements[`msp_hierarchy_id${index}`] = hierarchyId;
            });
        }

        const data = await sequelize.query<{ total_count: any }>(query, {
            replacements,
            type: QueryTypes.SELECT,
            logging: true
        });

        const totalRecords = data.length > 0 ? data[0].total_count : 0;

        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: data.length > 0 ? 'Timesheet Type Config fetched successfully.' : 'No records found.',
            total_records: totalRecords,
            page: pageNumber,
            limit: limitNumber,
            items: data,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
}

export const getAllRelatedDataByProgram = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();

    try {
        const { program_id } = request.params as { program_id: string };
        const configs = await TimesheetTypeConfig.findAll({
            where: { program_id, is_deleted: false },
            attributes: ['hierarchies', 'labor_category', 'timesheet_rule_group'],
        });
        const hierarchyIds = [...new Set(configs.flatMap(config => config.hierarchies || []))];
        const laborIds = [...new Set(configs.flatMap(config => config.labor_category || []))];
        const ruleGroupIds = [
            ...new Set(configs.flatMap(config => config.timesheet_rule_group || []))];
        const [hierarchiesData, laborsData, ruleGroupsData] = await Promise.all([
            hierarchyIds.length ? hierarchies.findAll({ where: { id: hierarchyIds }, attributes: ['id', 'name'] }) : [],
            laborIds.length ? IndustriesModel.findAll({ where: { id: laborIds }, attributes: ['id', 'name'] }) : [],
            ruleGroupIds.length ? TimesheetExpenseRuleGroup.findAll({ where: { id: ruleGroupIds }, attributes: ['id', 'rule_group_name'], }) : [],]);
        const data = {
            hierarchies: hierarchiesData.map(hierarchy => ({ id: hierarchy.id, name: hierarchy.name })),
            labor_categories: laborsData.map(labor => ({ id: labor.id, name: labor.name })),
            timesheet_rule_groups: ruleGroupsData.map(ruleGroup => ({ id: ruleGroup.id, name: ruleGroup.rule_group_name, })),
        };
        reply.status(200).send({
            status_code: 200,
            message: "Dropdown data fetched successfully",
            trace_id: traceId,
            data,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Error while fetching related data.',
            error: error.message,
        });
    }
};

export async function timesheetTypeConfigGetAllFilter(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const {
            id,
            title,
            hierarchy_ids,
            labor_category,
            is_enabled,
            timesheet_rule_group,
            timesheet_format,
            allocation_method,
            page,
            limit,
        } = request.body as { id: string; title: string; hierarchy_ids: string[]; labor_category: string; is_enabled: string; timesheet_rule_group: string; timesheet_format: string; allocation_method: string; page: string; limit: string };

        const isEnabledFilter =
            typeof is_enabled === 'string'
                ? is_enabled === 'true'
                    ? 1
                    : 0
                : is_enabled === true
                    ? 1
                    : is_enabled === false
                        ? 0
                        : undefined;

        const pageNumber = page ? parseInt(page) : undefined;
        const limitNumber = limit ? parseInt(limit) : undefined;
        const offset = pageNumber && limitNumber ? (pageNumber - 1) * limitNumber : undefined;

        const query = timesheetConfigAdvancedGetAllFilter(
            Boolean(id),
            Boolean(title),
            hierarchy_ids || [],
            Array.isArray(labor_category) ? labor_category : labor_category ? [labor_category] : [],
            Boolean(timesheet_rule_group),
            Boolean(timesheet_format),
            Boolean(allocation_method),
            isEnabledFilter !== undefined,
            limitNumber !== undefined,
            offset !== undefined
        );

        const replacements: Record<string, any> = {
            program_id,
            id,
            title: title ? `%${title}%` : undefined,
            timesheet_rule_group,
            timesheet_format,
            allocation_method,
            limit: limitNumber,
            offset,
            is_enabled: isEnabledFilter,
        };

        if (limitNumber !== undefined) replacements.limit = limitNumber;
        if (offset !== undefined) replacements.offset = offset;
        if (Array.isArray(labor_category)) {
            labor_category.forEach((laborCategoryId, index) => {
                replacements[`labor_category_id${index}`] = laborCategoryId;
            });
        } else if (labor_category) {
            replacements[`labor_category_id0`] = labor_category;
        }

        hierarchy_ids?.forEach((hierarchyId, index) => {
            replacements[`hierarchy_id${index}`] = hierarchyId;
        });

        const data = await sequelize.query<{ total_count: any }>(query, {
            replacements,
            type: QueryTypes.SELECT,
        });

        const totalRecords = data.length > 0 ? data[0].total_count : 0;

        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: data.length > 0 ? 'Timesheet Type Config fetched successfully.' : 'No records found.',
            total_records: totalRecords,
            page: pageNumber,
            limit: limitNumber,
            items: data,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
}