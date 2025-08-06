import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import TimesheetExpenseRuleGroup from '../models/timesheet-expense-rule-group.model';
import { TimesheetExpenseRuleGroupData } from '../interfaces/timesheet-expense-rule-group.interface';
import TimesheetExpenseRuleModel from '../models/timesheet-expense-rule.model';
import { decodeToken } from '../middlewares/verifyToken';
import RateType from '../models/rate-type.model';
import { Op } from 'sequelize';
import { fetchTimesheetExpenseRuleGroups } from '../utility/queries';
import TimesheetExpenseRuleMapping from '../models/timesheet-expense-rule.mapping';

export const createTimesheetExpenseRuleGroup = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    try {
     const user=request?.user;
        const userId = user?.sub;
        const { program_id } = request.params as { program_id: string };
        const { timesheet_expense_rules,rule_group_name, ...data } = request.body as any;
        const existingRuleGroup = await TimesheetExpenseRuleGroup.findOne({
            where: {
                program_id,
                rule_group_name,
                is_deleted: false
            }
        });

        if (existingRuleGroup) {
            return reply.status(409).send({
                status_code: 409,
                message: 'Rule group name already exists.',
                trace_id: traceId,
            });
        }

        const newConfig = await TimesheetExpenseRuleGroup.create({
            program_id,
            rule_group_name,
            ...data,
            updated_by: userId,
            created_by: userId,
        });

        if (Array.isArray(timesheet_expense_rules)) {
            for (const expenseRuleId of timesheet_expense_rules) {
                await TimesheetExpenseRuleMapping.create({
                    expense_rule_group_id: newConfig.id,
                    expense_rule_id: expenseRuleId,
                    program_id,
                });
            }
        }

        reply.status(201).send({
            status_code: 201,
            id: newConfig.id,
            message: 'Timesheet expense rule group created successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error creating rule group.',
            error,
            trace_id: traceId,
        });
    }
};

export const getAllTimesheetExpenseRuleGroups = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();

    try {
        const { program_id } = request.params as { program_id: string };
        const { page = 1, limit = 10, rule_category, is_enabled, rule_group_name, order = 'created_on DESC', rule_type } = request.query as {
            page?: string | number;
            limit?: string | number;
            rule_category?: string;
            rule_group_name?: string;
            rule_type?: string
            is_enabled?: string;
            order?: string;
        };

        const pageNumber = parseInt(page as unknown as string, 10);
        const limitNumber = parseInt(limit as unknown as string, 10);
        const offset = (pageNumber - 1) * limitNumber;

        const { ruleGroups, totalRecords } = await fetchTimesheetExpenseRuleGroups(
            program_id,
            rule_category,
            rule_group_name,
            rule_type,
            is_enabled,
            limitNumber,
            offset,
            order
        );

        reply.status(200).send({
            status_code: 200,
            message: "Rule groups retrieved successfully.",
            items_per_page: limitNumber,
            total_records: totalRecords,
            page,
            limit,
            timesheet_expense_rule_group: ruleGroups,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            message: "Error fetching timesheet expense rule groups.",
            error: error.message,
            trace_id: traceId,
        });
    }
};

export const getTimesheetExpenseRuleGroupById = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string; program_id: string };
        const ruleGroup = await TimesheetExpenseRuleGroup.findOne({
            where: { id, is_deleted: false, program_id },
        });

        if (!ruleGroup) {
            return reply.status(200).send({
                status_code: 200,
                message: "Timesheet expense rule group not found.",
                trace_id: traceId,
            });
        }

        const expenseRuleMappings = await TimesheetExpenseRuleMapping.findAll({
            where: { expense_rule_group_id: id },
            attributes: ['expense_rule_id'],
        });

        const timesheetExpenseRuleIds = expenseRuleMappings.map(mapping => mapping.expense_rule_id);

        if (timesheetExpenseRuleIds.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                timesheet_expense_rule_group: ruleGroup,
                message: "No timesheet expense rules associated with this group.",
                trace_id: traceId,
            });
        }

        const populatedRules = await TimesheetExpenseRuleModel.findAll({
            where: {
                id: { [Op.in]: timesheetExpenseRuleIds },
                is_enabled: true,
            },
            attributes: [
                "id",
                "rule_name",
                "is_enabled",
                "program_id",
                "rule_type",
                "is_paid_break",
                "break_type",
                "rule_duration",
                "expense_line_item",
                "apply_rate_type",
                "is_penalty_rule_enabled",
                "penalty_rules",
                "conditions",
                "weekend_days",
                "rule_category",
            ],
        });

        const applyRateTypeIds = Array.from(
            new Set([
                ...populatedRules
                    .flatMap((rule) => rule.apply_rate_type || []),
                ...populatedRules
                    .flatMap((rule) =>
                        rule.penalty_rules?.apply_rate_type
                            ? [rule.penalty_rules.apply_rate_type]
                            : []
                    ),
            ])
        );

        let rateTypes: any[] = [];
        if (applyRateTypeIds.length > 0) {
            rateTypes = await RateType.findAll({
                where: {
                    id: { [Op.in]: applyRateTypeIds },
                },
                attributes: ["id", "name"],
            });
        }

        const rulesWithRateTypes = populatedRules.map((rule) => {
            const ruleApplyRateTypes = Array.isArray(rule.apply_rate_type)
                ? rateTypes.filter((rateType) => rule.apply_rate_type.includes(rateType.id))
                : [];

            const penaltyRateTypeDetails = rule.penalty_rules?.apply_rate_type
                ? rateTypes.find((rateType) => rateType.id === rule.penalty_rules.apply_rate_type) || null
                : null;

            return {
                ...rule.toJSON(),
                apply_rate_type: ruleApplyRateTypes,
                penalty_rules: {
                    ...rule.penalty_rules,
                    apply_rate_type: penaltyRateTypeDetails,
                },
            };
        });

        const data = {
            ...ruleGroup.toJSON(),
            timesheet_expense_rules: rulesWithRateTypes,
        };

        return reply.status(200).send({
            status_code: 200,
            timesheet_expense_rule_group: data,
            message: "Timesheet expense rule group retrieved successfully.",
            trace_id: traceId,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "Error fetching rule group.",
            error: error.message,
            trace_id: traceId,
        });
    }
};
export async function updateTimesheetExpenseRuleGroup(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { id, program_id } = request.params as { id: string, program_id: string };
    const updates = request.body as Partial<TimesheetExpenseRuleGroupData>;
 

    try {
        const user=request?.user;
        const userId = user?.sub;

        if (updates.rule_group_name) {
            const existingGroup = await TimesheetExpenseRuleGroup.findOne({
                where: {
                    rule_group_name: updates.rule_group_name,
                    program_id,
                    id: { [Op.ne]: id },
                },
            });

            if (existingGroup) {
                return reply.status(409).send({
                    status_code: 409,
                    message: 'Timesheet expense rule group with this name already exists.',
                    trace_id: traceId,
                });
            }
        }

        const [updatedCount] = await TimesheetExpenseRuleGroup.update({
            ...updates, updated_by: userId, updated_on: Date.now()
        }, {
            where: { id, program_id },
        });
        if (updatedCount === 0) {
            return reply.status(200).send({
                message: 'Timesheet expense rule group not found.',
                trace_id: traceId,
            });
        }

        if (Array.isArray(updates.timesheet_expense_rules)) {
            await TimesheetExpenseRuleMapping.destroy({
                where: { expense_rule_group_id: id }
            });
            for (const expenseRuleId of updates.timesheet_expense_rules) {
                await TimesheetExpenseRuleMapping.create({
                    expense_rule_group_id: id,
                    expense_rule_id: expenseRuleId,
                    program_id,
                });
            }
        }

        return reply.status(200).send({
            status_code: 200,
            message: 'Timesheet expense rule group updated successfully.',
            trace_id: traceId,
        });
    } catch (error:any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
}

export const deleteTimesheetExpenseRuleGroup = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const user=request?.user;
        const userId = user?.sub;
        const ruleGroup = await TimesheetExpenseRuleGroup.findOne({ where: { id, is_deleted: false } });
        if (!ruleGroup) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Timesheet expense rule group not found.',
                trace_id: traceId,
            });
        }
        await ruleGroup.update({ is_deleted: true, is_enabled: false, updated_by: userId });
        reply.status(200).send({
            status_code: 200,
            message: 'Timesheet expense rule group deleted successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error deleting rule group.',
            error,
            trace_id: traceId,
        });
    }

};


export const filterTimesheetExpenseRuleGroups = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();

    try {
        const { program_id } = request.params as { program_id: string };
        let { rule_category, rule_group_name, rule_type, is_enabled, order = 'created_on DESC', page = 1, limit = 10 } = request.body as { rule_category: string, rule_group_name: string, rule_type: string, is_enabled: string, order: string, page: string | number, limit: string | number };

        if (typeof is_enabled === "boolean") {
            is_enabled = is_enabled ? "1" : "0";
        }

        const pageNumber = parseInt(page as unknown as string, 10);
        const limitNumber = parseInt(limit as unknown as string, 10);
        const offset = (pageNumber - 1) * limitNumber;

        const { ruleGroups, totalRecords } = await fetchTimesheetExpenseRuleGroups(
            program_id,
            rule_category,
            rule_group_name,
            rule_type,
            is_enabled,
            limitNumber,
            offset,
            order
        );

        reply.status(200).send({
            status_code: 200,
            message: "Rule groups retrieved successfully.",
            items_per_page: limitNumber,
            total_records: totalRecords,
            page: pageNumber,
            limit: limitNumber,
            timesheet_expense_rule_group: ruleGroups,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            message: "Error fetching timesheet expense rule groups.",
            error: error.message,
            trace_id: traceId,
        });
    }
};
