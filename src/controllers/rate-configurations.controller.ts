import { FastifyRequest, FastifyReply } from 'fastify';
import RateConfigurationsModel from '../models/rate-configurations.model';
import { accuracyType, BaseRate, Category, Expense, MinMaxRate, RateCardDecisionRecord, RateConfiguration, RateConfigurationHierarchyRelation, RateConfigurationsInterface, RateDifferential, RateType, ShiftTypeObj } from '../interfaces/rate-configurations.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import RateConfigurationHierarchies from '../models/rate_configuration_hierarchies.model';
import RateConfigurationJobTemplates from '../models/rate-configuration-job-templates.model';
import RateConfigurationBaseRateTypes from '../models/rate-configuration-base-rate-types.model';
import RateConfigurationRateTypes from '../models/rate-configuration-rate-types.model';
import RateConfigurationRateDifferentials from '../models/rate-configuration-rate-differentials.model';
import { sequelize } from '../config/instance';
import jobTemplateModel from '../models/job-template.model';
import rateType from '../models/rate-type.model';
import hierarchies from '../models/hierarchies.model';
import picklistItemModel from '../models/picklist-item.model';
import { getAllRateConfigurationsQuery, rateCardMinRateMaxRate, rateConfigHierarchiesAndJobTemplates, rateConfigurationsFilterQuery, sameHierarchieRateConfiguration, sameRateConfiguration } from '../utility/queries';
import { QueryTypes, Op } from 'sequelize';
import ShiftType from '../models/shift-type.model';
import RateConfigurationExpenses from '../models/rate-configuration-expenses.model';
import ExpenseTypeModel from '../models/expense-type.model';
import RateConfigurationsRepository from '../repositories/rate-configurations.repository';
import shiftTypeConfiguration from '../models/shift-type-configuration.model';

export const createRateConfigurations = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const rateConfigurationsPayload = request.body as Partial<RateConfigurationsInterface>;
    const transaction = await sequelize.transaction();

    try {
        const user = request?.user;
        const userId = user?.sub;
        if (rateConfigurationsPayload.hierarchies && rateConfigurationsPayload.job_templates) {
            const existingConfigurations = await sequelize.query(sameRateConfiguration, {
                replacements: {
                    program_id,
                    hierarchies: rateConfigurationsPayload.hierarchies || [],
                    job_templates: rateConfigurationsPayload.job_templates || [],
                    job_type: rateConfigurationsPayload.job_type ?? null,
                },
                type: QueryTypes.SELECT,
                transaction
            });
            if (existingConfigurations.length > 0) {
                await transaction.rollback();
                return reply.status(409).send({
                    status_code: 409,
                    message: 'Rate configurations with the same hierarchy job template and job type already exist.',
                    trace_id: traceId,
                });
            }
        }
        const rateData = await RateConfigurationsModel.create({
            program_id,
            name: rateConfigurationsPayload.name,
            is_shift_rate: rateConfigurationsPayload.is_shift_rate,
            job_type: rateConfigurationsPayload.job_type,
            created_by: userId,
            updated_by: userId
        }, { transaction });

        if (rateConfigurationsPayload.hierarchies) {
            for (const hierarchyId of rateConfigurationsPayload.hierarchies) {
                if (hierarchyId) {
                    await RateConfigurationHierarchies.create({
                        rate_configuration_id: rateData.id,
                        hierarchy_id: hierarchyId,
                        created_by: userId,
                        updated_by: userId
                    }, { transaction });
                }
            }
        }

        if (rateConfigurationsPayload.job_templates) {
            for (const jobTemplateId of rateConfigurationsPayload.job_templates) {
                if (jobTemplateId) {
                    await RateConfigurationJobTemplates.create({
                        rate_configuration_id: rateData.id,
                        job_template_id: jobTemplateId,
                        created_by: userId,
                        updated_by: userId
                    }, { transaction });
                }
            }
        }

        if (rateConfigurationsPayload.expenses) {
            for (const expense of rateConfigurationsPayload.expenses) {
                if (expense.expense_type_id) {
                    await RateConfigurationExpenses.create({
                        rate_configuration_id: rateData.id,
                        expense_type_id: expense.expense_type_id,
                        unit_of_measure: expense.unit_of_measure,
                        unit_lable: expense.unit_lable,
                        rate: expense.rate,
                        max_limit: expense.max_limit,
                        created_by: userId,
                        updated_by: userId
                    }, { transaction });
                }
            }
        }

        const baseRatePayloads = rateConfigurationsPayload.rate_configuration || [];
        for (const baseRatePayload of baseRatePayloads) {
            const baseRate = baseRatePayload.base_rate;
            if (baseRate?.rate_type_id) {
                const baseRateResult = await RateConfigurationBaseRateTypes.create({
                    rate_configuration_id: rateData.id,
                    rate_type_id: baseRate.rate_type_id,
                    seq_number: baseRate.seq_number,
                    created_by: userId,
                    updated_by: userId
                }, { transaction });

                const rates = baseRatePayload.rate || [];
                for (const rate of rates) {
                    if (rate.rate_type_id) {
                        const rateTypeRecord = await RateConfigurationRateTypes.create({
                            base_rate_type_id: baseRateResult.id,
                            rate_type_id: rate.rate_type_id,
                            seq_number: rate.seq_number,
                            created_by: userId,
                            updated_by: userId
                        }, { transaction });

                        if (Array.isArray(rate.bill_rate)) {
                            for (const billRate of rate.bill_rate) {
                                await RateConfigurationRateDifferentials.create({
                                    rate_id: rateTypeRecord.id,
                                    differential_on: billRate.differential_on,
                                    differential_type: billRate.differential_type,
                                    differential_value: billRate.differential_value,
                                    unit_of_measure: billRate.unit_of_measure,
                                    currency: billRate.currency,
                                    type: 'BILL_RATE',
                                    created_by: userId,
                                    updated_by: userId
                                }, { transaction });
                            }
                        }
                        if (Array.isArray(rate.bill_rate)) {
                            for (const payRate of rate.pay_rate) {
                                await RateConfigurationRateDifferentials.create({
                                    rate_id: rateTypeRecord.id,
                                    differential_on: payRate.differential_on,
                                    differential_type: payRate.differential_type,
                                    differential_value: payRate.differential_value,
                                    unit_of_measure: payRate.unit_of_measure,
                                    currency: payRate.currency,
                                    type: 'PAY_RATE',
                                    created_by: userId,
                                    updated_by: userId
                                }, { transaction });
                            }
                        }
                    }
                }
            }
        }

        await transaction.commit();

        reply.status(201).send({
            status_code: 201,
            message: 'Rate configurations created successfully.',
            rate_type_category_id: rateData.id,
            trace_id: traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'Error while creating rate configurations.',
            error: error.message,
            trace_id: traceId,
        });
    }
};

export const updateRateConfigurations = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const { program_id, id } = request.params as { program_id: string; id: string };
    const rateConfigurationsPayload = request.body as Partial<RateConfigurationsInterface>;
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
    try {
        const user = request?.user;
        const userId = user?.sub;
        const existingRateConfig = await RateConfigurationsModel.findOne({
            where: { program_id, id, is_deleted: false },
        });

        if (!existingRateConfig) {
            return reply.status(404).send({
                message: 'Rate configurations not found.',
                trace_id: traceId,
            });
        }
        if (rateConfigurationsPayload.hierarchies && rateConfigurationsPayload.job_templates) {
            const existingConfigurations = await sequelize.query(sameHierarchieRateConfiguration, {
                replacements: {
                    program_id,
                    hierarchies: rateConfigurationsPayload.hierarchies || [],
                    job_templates: rateConfigurationsPayload.job_templates || [],
                    job_type: rateConfigurationsPayload.job_type ?? null,
                    id
                },
                type: QueryTypes.SELECT,
                transaction
            });

            if (existingConfigurations.length > 0) {
                await transaction.rollback();
                return reply.status(409).send({
                    status_code: 409,
                    message: 'Rate configurations with the same hierarchy and job template already exist.',
                    trace_id: traceId,
                });
            }
        }
        await existingRateConfig.update(
            {
                name: rateConfigurationsPayload.name,
                is_shift_rate: rateConfigurationsPayload.is_shift_rate,
                updated_on: Date.now(),
                is_enabled: rateConfigurationsPayload.is_enabled,
                updated_by: userId,
                job_type: rateConfigurationsPayload.job_type
            },
            { transaction }
        );

        if (rateConfigurationsPayload.hierarchies) {
            await RateConfigurationHierarchies.destroy({
                where: { rate_configuration_id: id },
                transaction,
            });

            await Promise.all(
                rateConfigurationsPayload.hierarchies.map((hierarchyId: any) =>
                    RateConfigurationHierarchies.create(
                        { rate_configuration_id: id, hierarchy_id: hierarchyId },
                        { transaction }
                    )
                )
            );
        }

        if (rateConfigurationsPayload.job_templates) {
            await RateConfigurationJobTemplates.destroy({
                where: { rate_configuration_id: id },
                transaction,
            });

            await Promise.all(
                rateConfigurationsPayload.job_templates.map((jobTemplateId: any) =>
                    RateConfigurationJobTemplates.create(
                        { rate_configuration_id: id, job_template_id: jobTemplateId },
                        { transaction }
                    )
                )
            );
        }
        if (rateConfigurationsPayload.expenses) {
            await RateConfigurationExpenses.destroy({
                where: { rate_configuration_id: id },
                transaction,
            });

            for (const expense of rateConfigurationsPayload.expenses) {
                if (expense.expense_type_id) {
                    await RateConfigurationExpenses.create({
                        rate_configuration_id: id,
                        expense_type_id: expense.expense_type_id,
                        unit_of_measure: expense.unit_of_measure,
                        unit_lable: expense.unit_lable,
                        rate: expense.rate,
                        max_limit: expense.max_limit,
                        created_by: userId,
                        updated_by: userId
                    }, { transaction });
                }
            }
        }

        if (rateConfigurationsPayload.rate_configuration) {
            await RateConfigurationBaseRateTypes.destroy({
                where: { rate_configuration_id: id },
                transaction,
            });

            for (const baseRatePayload of rateConfigurationsPayload.rate_configuration) {
                const { base_rate, rate } = baseRatePayload;

                let baseRateResult;
                if (base_rate) {
                    [baseRateResult] = await RateConfigurationBaseRateTypes.upsert(
                        {
                            id: base_rate.id,
                            rate_configuration_id: id,
                            rate_type_id: base_rate.rate_type_id,
                            seq_number: base_rate.seq_number
                        },
                        { transaction }
                    );
                }

                if (rate && Array.isArray(rate)) {
                    await RateConfigurationRateTypes.destroy({
                        where: { base_rate_type_id: baseRateResult?.id },
                        transaction,
                    });

                    for (const rateItem of rate) {
                        const [rateTypeRecord] = await RateConfigurationRateTypes.upsert(
                            {
                                id: rateItem.id,
                                base_rate_type_id: baseRateResult?.id,
                                rate_type_id: rateItem.rate_type_id,
                                seq_number: rateItem.seq_number
                            },
                            { transaction }
                        );

                        if (Array.isArray(rateItem.bill_rate)) {
                            await RateConfigurationRateDifferentials.destroy({
                                where: { rate_id: rateTypeRecord?.id, type: 'BILL_RATE' },
                                transaction,
                            });
                            for (const billRate of rateItem.bill_rate) {
                                await RateConfigurationRateDifferentials.upsert(
                                    {
                                        id: billRate.id,
                                        rate_id: rateTypeRecord.id,
                                        differential_on: billRate.differential_on,
                                        differential_type: billRate.differential_type,
                                        differential_value: billRate.differential_value,
                                        unit_of_measure: billRate.unit_of_measure,
                                        currency: billRate.currency,
                                        type: 'BILL_RATE',
                                    },
                                    { transaction }
                                );
                            }
                        }

                        if (Array.isArray(rateItem.pay_rate)) {
                            await RateConfigurationRateDifferentials.destroy({
                                where: { rate_id: rateTypeRecord?.id, type: 'PAY_RATE' },
                                transaction,
                            });
                            for (const payRate of rateItem.pay_rate) {
                                await RateConfigurationRateDifferentials.upsert(
                                    {
                                        id: payRate.id,
                                        rate_id: rateTypeRecord.id,
                                        differential_on: payRate.differential_on,
                                        differential_type: payRate.differential_type,
                                        differential_value: payRate.differential_value,
                                        unit_of_measure: payRate.unit_of_measure,
                                        currency: payRate.currency,
                                        type: 'PAY_RATE',
                                    },
                                    { transaction }
                                );
                            }
                        }
                    }
                }
            }
        }

        await transaction.commit();

        reply.status(200).send({
            status_code: 200,
            message: 'Rate configurations updated successfully.',
            trace_id: traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            message: 'An error occurred while updating the rate configurations.',
            error: error.message,
            trace_id: traceId,
        });
    }
};

export const deleteRateConfigurations = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const data = await RateConfigurationsModel.findOne({
            where: { program_id, id, is_deleted: false },
        });

        if (!data) {
            return reply.status(200).send({
                message: 'Rate configurations data not found.',
                trace_id: traceId,
                rate_configurations: []
            });
        }
        await data.update({ is_enabled: false, is_deleted: true });
        reply.status(200).send({
            status_code: 200,
            rate_type_category_id: id,
            trace_id: traceId,
            message: 'Rate configurations deleted successfully.'
        });
    } catch (error: any) {
        reply.status(500).send({
            message: 'Error deleting rate configurations ',
            error: error.message,
            trace_id: traceId
        });
    }
}

export async function getAllRateConfigurations(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const query = request.query as { page?: string; limit?: string; name?: string; job_template_id?: string; hierarchy_id?: string; rate_type?: string; is_enabled?: string; is_shift_rate?: string; updated_on?: string };

        const page = parseInt(query.page ?? "1", 10);
        const limit = parseInt(query.limit ?? "10", 10);
        const offset = (page - 1) * limit;

        const isEnabled = parseBoolean(query.is_enabled);
        const isShiftRate = parseBoolean(query.is_shift_rate);
        const { startDate, endDate } = parseDateRange(query.updated_on);

        const replacements: any = {
            program_id,
            name: query.name ?? null,
            job_template_id: query.job_template_id ?? null,
            hierarchy_id: query.hierarchy_id ?? null,
            rate_type: query.rate_type ?? null,
            is_enabled: isEnabled,
            is_shift_rate: isShiftRate,
            startDate,
            endDate,
            limit,
            offset,
        };

        const rateConfigurationsWithDetails: { base_rates?: { id: string; name: string; rate_types?: { id: string; name: string }[] }[] }[] = await getAllRateConfigurationsQuery(replacements);

        const result = await sequelize.query<{ total_count: any }>(
            `SELECT COUNT(*) AS total_count FROM rate_configurations AS rc WHERE rc.is_deleted = 0 AND rc.program_id = :program_id`,
            {
                replacements: { program_id: replacements.program_id },
                type: QueryTypes.SELECT,
            }
        );

        const totalCount = result[0]?.total_count ?? 0;

        if (!rateConfigurationsWithDetails.length) {
            return reply.status(200).send({
                status_code: 200,
                message: "Rate configurations not found.",
                trace_id: traceId,
                rate_configurations: [],
            });
        }

        const transformedData = rateConfigurationsWithDetails.map((config) => ({
            ...config,
            base_rates: config.base_rates?.flatMap((rate) => [
                { id: rate.id, name: rate.name },
                ...(rate.rate_types ?? []).map((type) => ({
                    id: type.id,
                    name: type.name,
                })),
            ]) ?? [],
        }));

        return reply.status(200).send({
            status_code: 200,
            message: "Rate configurations fetched successfully.",
            trace_id: traceId,
            items_per_page: limit,
            total_records: totalCount,
            rate_configurations: transformedData,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error: error.message,
            trace_id: traceId,
        });
    }
}

function parseBoolean(value: any): number | undefined {
    if (typeof value === "string") {
        return value.toLowerCase() === "true" ? 1 : 0;
    }
    if (typeof value === "boolean") {
        return value ? 1 : 0;
    }
    return undefined;
}

function parseDateRange(dateRange: string | undefined): { startDate?: number; endDate?: number } {
    if (!dateRange) return {};

    const parseTimestamp = (ts: string, isStart: boolean): number | undefined => {
        const num = Number(ts.trim());
        if (isNaN(num)) return undefined;
        const date = new Date(num);
        date.setHours(isStart ? 0 : 23, isStart ? 0 : 59, isStart ? 0 : 59, isStart ? 0 : 999);
        return date.getTime();
    };

    const dates = dateRange.split(",").filter(Boolean);

    if (dates.length === 1) {
        const ts = dates[0];
        const startDate = parseTimestamp(ts, true);
        const endDate = parseTimestamp(ts, false);
        return startDate !== undefined && endDate !== undefined ? { startDate, endDate } : {};
    }

    if (dates.length === 2) {
        const startDate = parseTimestamp(dates[0], true);
        const endDate = parseTimestamp(dates[1], false);
        return startDate !== undefined && endDate !== undefined ? { startDate, endDate } : {};
    }
    return {};
}
export async function getRateConfigurationById(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };

        const rateConfiguration = await RateConfigurationsModel.findOne({
            where: { program_id, id },
            attributes: ['id', 'program_id', 'name', 'is_shift_rate', 'is_enabled', 'created_on', 'updated_on', 'job_type'],
        });

        if (!rateConfiguration) {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'Rate configuration not found.',
                rate_configurations: null,
            });
        }

        const hierarchie = await RateConfigurationHierarchies.findAll({
            where: { rate_configuration_id: id },
            include: [
                {
                    model: hierarchies,
                    as: 'hierarchy',
                    attributes: ['id', 'name'],
                },
            ],
        }).then((data) => data.map((item) => item.hierarchy));

        const jobTemplates = await RateConfigurationJobTemplates.findAll({
            where: { rate_configuration_id: id },
            include: [
                {
                    model: jobTemplateModel,
                    as: 'job_template',
                    attributes: ['id', 'template_name'],
                },
            ],
        }).then((data) =>
            data.map((item) => ({
                id: item.job_template?.id,
                name: item.job_template?.template_name,
            }))
        );

        const expenseTypes = await RateConfigurationExpenses.findAll({
            where: { rate_configuration_id: id },
            attributes: ['id', 'unit_of_measure', 'unit_lable', 'rate', 'max_limit'],
            include: [
                {
                    model: ExpenseTypeModel,
                    as: 'expense_type',
                    attributes: ['id', 'name'],
                },
            ],
        })

        const baseRates = await RateConfigurationBaseRateTypes.findAll({
            where: { rate_configuration_id: id },
            include: [
                {
                    model: rateType,
                    as: 'rate_type',
                    attributes: ['id', 'name', 'abbreviation', 'rate_type_category', 'is_base_rate', 'shift_type', 'rate'],
                },
            ],
            attributes: ['id', 'seq_number']
        });

        const rateConfigurationDetails = await Promise.all(
            baseRates.map(async (baseRate) => {
                const rateTypeCategory = baseRate.rate_type?.rate_type_category
                    ? await picklistItemModel.findOne({
                        where: { id: baseRate.rate_type.rate_type_category },
                        attributes: ['id', 'value', 'label'],
                    })
                    : null;

                const rates = await RateConfigurationRateTypes.findAll({
                    where: { base_rate_type_id: baseRate.id },
                    include: [
                        {
                            model: rateType,
                            as: 'rate_type',
                            attributes: ['id', 'name', 'abbreviation', 'rate_type_category', 'is_base_rate', 'shift_type'],
                        },
                    ],
                    attributes: ['id', 'seq_number']
                });

                const rateDetails = await Promise.all(
                    rates.map(async (rate) => {
                        const rateTypeCategory = rate.rate_type?.rate_type_category
                            ? await picklistItemModel.findOne({
                                where: { id: rate.rate_type.rate_type_category },
                                attributes: ['id', 'value', 'label'],
                            })
                            : null;

                        const billRates = await RateConfigurationRateDifferentials.findAll({
                            where: { rate_id: rate.id, type: 'BILL_RATE' },
                            attributes: ['differential_on', 'differential_type', 'differential_value', 'type', 'unit_of_measure', 'currency'],
                        });

                        const payRates = await RateConfigurationRateDifferentials.findAll({
                            where: { rate_id: rate.id, type: 'PAY_RATE' },
                            attributes: ['differential_on', 'differential_type', 'differential_value', 'type', 'unit_of_measure', 'currency'],
                        });

                        return {
                            rate_type: rate.rate_type
                                ? {
                                    ...rate.rate_type.get(),
                                    rate_type_category: rateTypeCategory,
                                }
                                : null,
                            seq_number: rate.seq_number,
                            bill_rate: billRates,
                            pay_rate: payRates,
                        };
                    })
                );

                return {
                    base_rate: baseRate.rate_type
                        ? {
                            ...baseRate.rate_type.get(),
                            rate_type_category: rateTypeCategory,
                        }
                        : null,
                    seq_number: Number(baseRate.get('seq_number')),
                    rate: rateDetails,
                };
            })
        );

        const response = {
            program_id: rateConfiguration.program_id,
            name: rateConfiguration.name,
            job_type: rateConfiguration.job_type,
            is_enabled: rateConfiguration.is_enabled,
            is_shift_rate: rateConfiguration.is_shift_rate,
            created_on: rateConfiguration.created_on,
            updated_on: rateConfiguration.updated_on,
            hierarchie,
            job_templates: jobTemplates,
            expenses: expenseTypes,
            rate_configuration: rateConfigurationDetails,
        };

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Rate configuration fetched successfully.',
            rate_configurations: response,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'An error occurred while fetching rate configurations.',
            error: error.message,
        });
    }
}

export async function getAllRateConfigurationRates(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const {
            hierarchie_id,
            job_templates,
            is_shift_rate,
            currency_id,
            unit_of_measure,
            labor_category_id,
            ot_exempt,
            job_type
        } = request.query as {
            hierarchie_id: string;
            job_templates: string;
            is_shift_rate: string;
            currency_id: string;
            unit_of_measure: string;
            labor_category_id: string;
            ot_exempt: string;
            job_type: string;
        };

        const hierarchyIds = hierarchie_id?.split(',') || [];
        const jobTemplateIds = job_templates?.split(',') || [];

        // Parallel execution of independent queries
        const [rateCardDecisionRecords, matchingRateConfigurations] = await Promise.all([
            sequelize.query<RateCardDecisionRecord>(rateCardMinRateMaxRate, {
                replacements: {
                    hierarchyIds,
                    jobTemplateIds,
                    unit_of_measure,
                    currency_id,
                    labor_category_id,
                    job_type: job_type ?? null,
                    program_id
                },
                type: QueryTypes.SELECT,
            }),
            RateConfigurationsRepository.getRateConfigurationsByProgramId(
                program_id,
                is_shift_rate,
                hierarchyIds,
                jobTemplateIds,
                job_type
            )
        ]);

        // Handle standard base rate case early
        if (!matchingRateConfigurations.length) {
            return await handleStandardBaseRateCase({
                program_id,
                is_shift_rate,
                hierarchyIds,
                jobTemplateIds,
                rateCardDecisionRecords,
                traceId,
                unit_of_measure,
                currency_id,
                labor_category_id,
                ot_exempt,
                reply
            });
        }

        const rateConfigurationIds = matchingRateConfigurations.map((rc: any) => rc.id);

        // Batch all data fetching operations
        const [
            hierarchyRelations,
            allExpenses,
            allBaseRates
        ] = await Promise.all([
            RateConfigurationHierarchies.findAll({
                where: {
                    rate_configuration_id: rateConfigurationIds,
                    hierarchy_id: hierarchyIds
                },
                include: [{
                    model: hierarchies,
                    as: 'hierarchy',
                    attributes: ['id', 'name']
                }]
            }) as unknown as RateConfigurationHierarchyRelation[],

            RateConfigurationExpenses.findAll({
                where: { rate_configuration_id: rateConfigurationIds },
                attributes: ['id', 'rate_configuration_id', 'unit_of_measure', 'unit_lable', 'rate', 'max_limit'],
                include: [{
                    model: ExpenseTypeModel,
                    as: 'expense_type',
                    attributes: ['id', 'name']
                }]
            }) as unknown as Expense[],

            RateConfigurationBaseRateTypes.findAll({
                where: { rate_configuration_id: rateConfigurationIds },
                include: [{
                    model: rateType,
                    as: 'rate_type',
                    where: { is_base_rate: true },
                    attributes: ['id', 'name', 'abbreviation', 'rate_type_category', 'is_base_rate', 'shift_type']
                }]
            }) as unknown as BaseRate[]
        ]);

        // Use Maps for better performance
        const hierarchiesByConfiguration = new Map<string, Array<{ id: string, name: string }>>();
        const expensesByConfiguration = new Map<string, Array<Expense>>();
        const baseRatesByConfigId = new Map<string, Array<BaseRate>>();

        // Efficient grouping using forEach instead of reduce
        hierarchyRelations.forEach(relation => {
            if (relation.hierarchy) {
                const existing = hierarchiesByConfiguration.get(relation.rate_configuration_id) || [];
                existing.push({
                    id: relation.hierarchy.id,
                    name: relation.hierarchy.name
                });
                hierarchiesByConfiguration.set(relation.rate_configuration_id, existing);
            }
        });

        allExpenses.forEach(expense => {
            const existing = expensesByConfiguration.get(expense.rate_configuration_id) || [];
            existing.push(expense);
            expensesByConfiguration.set(expense.rate_configuration_id, existing);
        });

        allBaseRates.forEach(baseRate => {
            const existing = baseRatesByConfigId.get(baseRate.rate_configuration_id) || [];
            existing.push(baseRate);
            baseRatesByConfigId.set(baseRate.rate_configuration_id, existing);
        });

        // Collect all unique IDs for batch fetching
        const allRateTypeCategoryIds = new Set<string>();
        const allShiftTypeIds = new Set<string>();

        allBaseRates.forEach(baseRate => {
            if (baseRate.rate_type?.rate_type_category) {
                allRateTypeCategoryIds.add(baseRate.rate_type.rate_type_category);
            }
            if (baseRate.rate_type?.shift_type) {
                allShiftTypeIds.add(baseRate.rate_type.shift_type);
            }
        });

        const baseRateIds = allBaseRates.map(baseRate => baseRate.id);

        // Fetch rate types and update category/shift type collections
        const allRateTypes = await RateConfigurationRateTypes.findAll({
            where: { base_rate_type_id: baseRateIds },
            include: [{
                model: rateType,
                as: 'rate_type',
                where: { is_base_rate: false, is_enabled: true },
                attributes: ['id', 'name', 'abbreviation', 'rate_type_category', 'is_base_rate', 'shift_type']
            }],
            attributes: ['id', 'base_rate_type_id', 'seq_number']
        }) as unknown as RateType[];

        // Add rate type categories and shift types from allRateTypes
        allRateTypes.forEach(rate => {
            if (rate.rate_type?.rate_type_category) {
                allRateTypeCategoryIds.add(rate.rate_type.rate_type_category);
            }
            if (rate.rate_type?.shift_type) {
                allShiftTypeIds.add(rate.rate_type.shift_type);
            }
        });

        const rateIds = allRateTypes.map(rate => rate.id);

        // Batch fetch all remaining data
        const [
            rateTypeCategories,
            shiftTypes,
            allBillRates,
            allPayRates
        ] = await Promise.all([
            picklistItemModel.findAll({
                where: { id: Array.from(allRateTypeCategoryIds) },
                attributes: ['id', 'value', 'label']
            }) as unknown as Category[],

            ShiftType.findAll({
                where: {
                    id: Array.from(allShiftTypeIds),
                    is_enabled: true
                },
                attributes: ['id', 'shift_type_name', 'shift_format'],
            include: [
                {
                model: shiftTypeConfiguration,
                as: 'shift_type_configuration',
                attributes: ['time_duration', 'shift_type_time']
                }
            ],
            }) as unknown as ShiftTypeObj[],

            RateConfigurationRateDifferentials.findAll({
                where: {
                    rate_id: rateIds,
                    type: 'BILL_RATE',
                    [Op.or]: [
                        { currency: currency_id, unit_of_measure: unit_of_measure },
                        { currency: null, unit_of_measure: null }
                    ]
                },
                attributes: ['id', 'rate_id', 'differential_on', 'differential_type', 'differential_value', 'currency', 'unit_of_measure']
            }) as unknown as RateDifferential[],

            RateConfigurationRateDifferentials.findAll({
                where: {
                    rate_id: rateIds,
                    type: 'PAY_RATE',
                    [Op.or]: [
                        { currency: currency_id, unit_of_measure: unit_of_measure },
                        { currency: null, unit_of_measure: null }
                    ]
                },
                attributes: ['id', 'rate_id', 'differential_on', 'differential_type', 'differential_value', 'currency', 'unit_of_measure']
            }) as unknown as RateDifferential[]
        ]);

        // Create lookup maps for better performance
        const rateTypeCategoriesMap = new Map(rateTypeCategories.map(category => [category.id, category]));
        const shiftTypesMap = new Map(shiftTypes.map(type => [type.id, type]));

        // Validate rates early
        const missingRates = allRateTypes.filter(rateType => {
            const hasBillRates = allBillRates.some(billRate => billRate.rate_id === rateType.id);
            const hasPayRates = allPayRates.some(payRate => payRate.rate_id === rateType.id);
            return !hasBillRates || !hasPayRates;
        });

        if (missingRates.length > 0) {
            const missingRateNames = missingRates.map(rate => rate.rate_type?.name ?? rate.id).join(", ");
            return reply.status(400).send({
                status_code: 400,
                message: `Bill rates and pay rates differentials not found for the following rate types: ${missingRateNames}. Please check with your administrator.`,
                trace_id: traceId
            });
        }

        // Group data using Maps for better performance
        const billRatesByRateId = new Map<string, Array<RateDifferential>>();
        const payRatesByRateId = new Map<string, Array<RateDifferential>>();
        const rateTypesByBaseRateId = new Map<string, Array<RateType>>();

        allBillRates.forEach(billRate => {
            const existing = billRatesByRateId.get(billRate.rate_id) || [];
            existing.push(billRate);
            billRatesByRateId.set(billRate.rate_id, existing);
        });

        allPayRates.forEach(payRate => {
            const existing = payRatesByRateId.get(payRate.rate_id) || [];
            existing.push(payRate);
            payRatesByRateId.set(payRate.rate_id, existing);
        });

        allRateTypes.forEach(rateType => {
            const existing = rateTypesByBaseRateId.get(rateType.base_rate_type_id) || [];
            existing.push(rateType);
            rateTypesByBaseRateId.set(rateType.base_rate_type_id, existing);
        });

        // Extract differential calculation logic
        const calculateDifferentialValue = (
            differential: RateDifferential,
            rateTypeCategory: Category | null,
            ot_exempt: string
        ): number => {
            if (ot_exempt === "true" && (rateTypeCategory?.value === "other" || rateTypeCategory?.value === "shift")) {
                return differential.differential_value;
            }
            return ot_exempt === "true" ? 1 : differential.differential_value;
        };

        const calculateRates = (
            differentials: RateDifferential[],
            matchingDecisionRecord: MinMaxRate,
            rateTypeCategory: Category | null,
            currency_id: string,
            unit_of_measure: string,
            ot_exempt: string
        ) => {
            return differentials.map(differential => {
                let differential_value = calculateDifferentialValue(differential, rateTypeCategory, ot_exempt);

                if (
                    differential.differential_type === "Fixed Differential" &&
                    (differential.currency !== currency_id || differential.unit_of_measure !== unit_of_measure)
                ) {
                    differential_value = 0;
                }

                const minRate = differential.differential_type === "Factor Differential"
                    ? (matchingDecisionRecord.min_rate.amount * differential_value).toFixed(8)
                    : (matchingDecisionRecord.min_rate.amount + differential_value).toFixed(8);

                const maxRate = differential.differential_type === "Factor Differential"
                    ? (matchingDecisionRecord.max_rate.amount * differential_value).toFixed(8)
                    : (matchingDecisionRecord.max_rate.amount + differential_value).toFixed(8);

                return {
                    ...differential.get(),
                    differential_value: Number(differential_value.toFixed(8)),
                    min_rate: minRate,
                    max_rate: maxRate,
                };
            });
        };

        // Collect ALL rate details across configurations first
        const allRateDetailsAcrossConfigs: any[] = [];

        // Process configurations first to collect all rate details
        const tempResponses = await Promise.all(
            matchingRateConfigurations.map(async (rateConfiguration: any) => {
                const configId = rateConfiguration.id;
                const baseRatesForConfig = baseRatesByConfigId.get(configId) || [];

                // Process each base rate to get all rate details
                const rateDetailsForConfig = await Promise.all(
                    baseRatesForConfig.map(async (baseRate) => {
                        const baseRateTypeId = baseRate.rate_type?.id;
                        const extractedHierarchyIds = hierarchiesByConfiguration.get(configId)?.map(h => h.id) || [];

                        const matchingDecisionRecord = await calculateMinMaxRates(
                            rateCardDecisionRecords,
                            extractedHierarchyIds,
                            baseRateTypeId,
                            program_id
                        );

                        const ratesForBaseRate = rateTypesByBaseRateId.get(baseRate.id) || [];

                        return ratesForBaseRate.map(rate => {
                            const rateCategory = rate.rate_type?.rate_type_category
                                ? rateTypeCategoriesMap.get(rate.rate_type.rate_type_category)
                                : null;

                            const rateShiftType = rate.rate_type?.shift_type
                                ? shiftTypesMap.get(rate.rate_type.shift_type)
                                : null;

                            const billRates = calculateRates(
                                billRatesByRateId.get(rate.id) || [],
                                matchingDecisionRecord,
                                rateCategory || null,
                                currency_id,
                                unit_of_measure,
                                ot_exempt
                            );

                            const payRates = calculateRates(
                                payRatesByRateId.get(rate.id) || [],
                                matchingDecisionRecord,
                                rateCategory || null,
                                currency_id,
                                unit_of_measure,
                                ot_exempt
                            );

                            return {
                                rate_type: {
                                    ...rate.rate_type?.get(),
                                    rate_type_category: rateCategory,
                                    shift_type: formatShiftType(rateShiftType),
                                },
                                seq_number: rate.seq_number,
                                bill_rate: billRates,
                                pay_rate: payRates
                            };
                        });
                    })
                );

                // Flatten and add to global collection
                allRateDetailsAcrossConfigs.push(...rateDetailsForConfig.flat());

                return { configId, rateDetailsForConfig };
            })
        );

        // Create a global collection of shift-applicable rates
        const globalShiftApplicableRates = allRateDetailsAcrossConfigs.filter(rate =>
            rate.rate_type?.rate_type_category?.value !== 'shift' &&
            rate.bill_rate.some((billRate: any) => billRate.differential_on === 'shift') &&
            rate.pay_rate.some((payRate: any) => payRate.differential_on === 'shift')
        );

        // Process configurations with access to global shift rates
        const responses = await Promise.all(
            matchingRateConfigurations.map(async (rateConfiguration: any, index: number) => {
                const configId = rateConfiguration.id;
                const hierarchiesForConfig = hierarchiesByConfiguration.get(configId) || [];
                const expensesForConfig = expensesByConfiguration.get(configId) || [];
                const baseRatesForConfig = baseRatesByConfigId.get(configId) || [];
                const { rateDetailsForConfig } = tempResponses[index];

                const rateConfigurationDetails = await Promise.all(
                    baseRatesForConfig.map(async (baseRate, baseIndex) => {
                        const baseRateTypeId = baseRate.rate_type?.id;
                        const extractedHierarchyIds = hierarchiesForConfig.map(h => h.id);

                        const matchingDecisionRecord = await calculateMinMaxRates(
                            rateCardDecisionRecords,
                            extractedHierarchyIds,
                            baseRateTypeId,
                            program_id
                        );

                        const rateTypeCategory = baseRate.rate_type?.rate_type_category
                            ? rateTypeCategoriesMap.get(baseRate.rate_type.rate_type_category)
                            : null;

                        const shiftType = baseRate.rate_type?.shift_type
                            ? shiftTypesMap.get(baseRate.rate_type.shift_type)
                            : null;

                        const rateDetails = rateDetailsForConfig[baseIndex] || [];

                        // Filter rates for base rate (non-shift rates that apply to the base rate's category)
                        const filteredRateType = rateDetails.filter((rate: any) =>
                            rate.rate_type?.rate_type_category?.value !== 'shift' &&
                            rate.bill_rate.some((billRate: any) => billRate.differential_on === rateTypeCategory?.value)
                        );

                        // Get all non-shift rates from current config
                        const allNonShiftRates = rateDetails.filter((rate: any) =>
                            rate.rate_type?.rate_type_category?.value !== 'shift'
                        );

                        // Filter non-base shift rates and add their applicable rates
                        const filteredRate = rateDetails
                            .filter((rate: any) =>
                                rate.rate_type?.is_base_rate === false &&
                                rate.rate_type?.rate_type_category?.value === 'shift'
                            )
                            .map((rate: any) => {
                                // For shift rates, use the global collection of shift-applicable rates
                                const applicableRates = globalShiftApplicableRates.length > 0
                                    ? globalShiftApplicableRates
                                    : allNonShiftRates.filter((nonShiftRate: any) =>
                                        nonShiftRate.bill_rate.some((billRate: any) => billRate.differential_on === 'shift') &&
                                        nonShiftRate.pay_rate.some((payRate: any) => payRate.differential_on === 'shift')
                                    );

                                return {
                                    ...rate,
                                    rates: applicableRates
                                };
                            });

                        return {
                            base_rate: {
                                rate_type: {
                                    ...baseRate.rate_type?.get(),
                                     shift_type: formatShiftType(shiftType),
                                    rate_type_category: rateTypeCategory,
                                    min_rate: {
                                        amount: matchingDecisionRecord.min_rate.amount.toFixed(8),
                                        is_changeable: matchingDecisionRecord.min_rate.is_changeable,
                                        is_reduceable: matchingDecisionRecord.min_rate.is_reduceable,
                                    },
                                    max_rate: {
                                        amount: matchingDecisionRecord.max_rate.amount.toFixed(8),
                                        is_changeable: matchingDecisionRecord.max_rate.is_changeable,
                                        is_reduceable: matchingDecisionRecord.max_rate.is_reduceable,
                                    },
                                },
                                seq_number: baseRate.seq_number,
                                rates: filteredRateType,
                            },
                            rate: filteredRate
                        };
                    })
                );

                return {
                    name: rateConfiguration.name,
                    is_shift_rate: Number(rateConfiguration.is_shift_rate) === 1,
                    hierarchies: hierarchiesForConfig,
                    expense_types: expensesForConfig,
                    rate_configuration: rateConfigurationDetails,
                };
            })
        );

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Rate configurations fetched successfully.',
            rate_configurations: responses,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: error.message
        });
    }
}
function formatShiftType(shiftType: any) {
  if (!shiftType) return null;

  return {
    id: shiftType.id,
    shift_type_name: shiftType.shift_type_name,
    shift_format: shiftType.shift_format,
    ...(shiftType.shift_type_configuration
      ? {
          time_duration: shiftType.shift_type_configuration.time_duration,
          shift_type_time: shiftType.shift_type_configuration.shift_type_time
        }
      : {})
  };
}
// Helper function remains the same
async function calculateMinMaxRates(
    rateCardDecisionRecords: RateCardDecisionRecord[],
    hierarchyIds: string[],
    baseRateTypeId: any,
    program_id: string
): Promise<MinMaxRate> {
    let matchingDecisionRecords = rateCardDecisionRecords.filter(record =>
        hierarchyIds.includes(record.hierarchy_id as string) && baseRateTypeId.includes(record.rate_type_id)
    );

    if (matchingDecisionRecords.length === 0) {
        matchingDecisionRecords = rateCardDecisionRecords.filter((record: any) =>
            record.hierarchy_id === null
        );
    }

    let minRateRecord = matchingDecisionRecords.length
        ? matchingDecisionRecords.reduce((prev, curr) => (curr.min_rate.amount < prev.min_rate.amount ? curr : prev))
        : null;

    let maxRateRecord = matchingDecisionRecords.length
        ? matchingDecisionRecords.reduce((prev, curr) => (curr.max_rate.amount > prev.max_rate.amount ? curr : prev))
        : null;

    return {
        min_rate: minRateRecord
            ? {
                amount: Number(minRateRecord.min_rate.amount.toFixed(8)),
                is_changeable: minRateRecord.min_rate.is_changeable,
                is_reduceable: minRateRecord.min_rate.is_reduceable
            }
            : { amount: 0.00000000, is_changeable: true, is_reduceable: false },

        max_rate: maxRateRecord
            ? {
                amount: Number(maxRateRecord.max_rate.amount.toFixed(8)),
                is_changeable: maxRateRecord.max_rate.is_changeable,
                is_reduceable: maxRateRecord.max_rate.is_reduceable
            }
            : { amount: 0.00000000, is_changeable: true, is_reduceable: false }
    };
}

// Optimized helper function
async function handleStandardBaseRateCase({
    program_id,
    is_shift_rate,
    hierarchyIds,
    jobTemplateIds,
    rateCardDecisionRecords,
    traceId,
    unit_of_measure,
    currency_id,
    labor_category_id,
    ot_exempt,
    reply
}: {
    program_id: string;
    is_shift_rate: string;
    hierarchyIds: string[];
    jobTemplateIds: string[];
    rateCardDecisionRecords: RateCardDecisionRecord[];
    traceId: string;
    unit_of_measure: string;
    currency_id: string;
    labor_category_id: string;
    ot_exempt: string;
    reply: FastifyReply;
}) {
    // Parallel execution
    const [standardBaseRate, hierarchyDetails] = await Promise.all([
        rateType.findAll({
            where: {
                is_base_rate: true,
                program_id,
                is_enabled: true,
                is_deleted: false,
                is_shift_rate
            },
            attributes: ['id', 'name', 'abbreviation', 'rate_type_category', 'is_base_rate', 'shift_type'],
            order: [['created_on', 'ASC']]
        }),
        hierarchies.findAll({
            where: { id: hierarchyIds },
            attributes: ['id', 'name'],
        })
    ]);

    if (!standardBaseRate.length) {
        return reply.status(400).send({
            status_code: 400,
            trace_id: traceId,
            message: 'No rate configurations found and no standard base rate available.',
            rate_configurations: [],
        });
    }

    if (hierarchyDetails.length === 0) {
        throw new Error("Hierarchies not found.");
    }

    const matchingDecisionRecord = await calculateMinMaxRates(
        rateCardDecisionRecords,
        hierarchyIds,
        standardBaseRate.map(rate => rate.id),
        program_id
    );

    // Batch fetch lookup data
    const rateTypeCategoryIds = standardBaseRate
        .map(rate => rate.rate_type_category)
        .filter(Boolean);

    const shiftTypeIds = standardBaseRate
        .map(rate => rate.shift_type)
        .filter(Boolean);

    const [rateTypeCategories, shiftTypes] = await Promise.all([
        picklistItemModel.findAll({
            where: { id: rateTypeCategoryIds },
            attributes: ['id', 'value', 'label']
        }) as unknown as Category[],

        ShiftType.findAll({
            where: { id: shiftTypeIds },
            attributes: ['id', 'shift_type_name', 'shift_format', 'time_duration', 'shift_type_time']
        }) as unknown as ShiftTypeObj[]
    ]);

    const rateTypeCategoriesMap = new Map(rateTypeCategories.map(category => [category.id, category]));
    const shiftTypesMap = new Map(shiftTypes.map(type => [type.id, type]));

    const rateConfigurations = standardBaseRate.map(baseRate => {
        const rateTypeCategory = baseRate.rate_type_category
            ? rateTypeCategoriesMap.get(baseRate.rate_type_category)
            : null;

        const shiftType = baseRate.shift_type
            ? shiftTypesMap.get(baseRate.shift_type)
            : null;

        return {
            base_rate: {
                rate_type: {
                    ...baseRate.get(),
                    shift_type: shiftType,
                    rate_type_category: rateTypeCategory,
                    min_rate: {
                        amount: matchingDecisionRecord.min_rate.amount.toFixed(8),
                        is_changeable: matchingDecisionRecord.min_rate.is_changeable,
                        is_reduceable: matchingDecisionRecord.min_rate.is_reduceable,
                    },
                    max_rate: {
                        amount: matchingDecisionRecord.max_rate.amount.toFixed(8),
                        is_changeable: matchingDecisionRecord.max_rate.is_changeable,
                        is_reduceable: matchingDecisionRecord.max_rate.is_reduceable,
                    },
                },
                rates: [],
            },
            rate: []
        };
    });

    return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: 'Rate configurations fetched successfully.',
        rate_configurations: [{
            name: null,
            is_shift_rate: is_shift_rate,
            hierarchies: hierarchyDetails,
            rate_configuration: rateConfigurations
        }],
    });
}

export async function getAllHierarchiesAndJobTemplates(request: FastifyRequest, reply: FastifyReply) {
    const { program_id } = request.params as { program_id: string };
    const traceId = generateCustomUUID();

    try {
        const results = await sequelize.query(rateConfigHierarchiesAndJobTemplates, {
            replacements: { program_id },
            type: QueryTypes.SELECT,
        });

        const jobTemplates = [
            ...new Map(
                results
                    .filter((result: any) => result.job_template_id && result.job_template_name)
                    .map((result: any) => [result.job_template_id, { id: result.job_template_id, name: result.job_template_name }])
            ).values()
        ];

        const hierarchies = [
            ...new Map(
                results
                    .filter((result: any) => result.hierarchy_id && result.hierarchy_name)
                    .map((result: any) => [result.hierarchy_id, { id: result.hierarchy_id, name: result.hierarchy_name }])
            ).values()
        ];

        const rateType = [
            ...new Map(
                results
                    .filter((result: any) => result.rate_id && result.rate_name)
                    .map((result: any) => [result.rate_id, { id: result.rate_id, name: result.rate_name }])
            ).values()
        ];

        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            data: {
                hierarchies: hierarchies,
                job_templates: jobTemplates,
                rate_type: rateType,
            },
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Failed to retrieve hierarchies and job template data',
            error: error.message,
        });
    }
}

function calculateRates(rates: any[], baseRateMin: string, baseRateMax: string, ot_exempt: boolean, rateTypeCategory: string) {
    return rates.map((rate) => {

        let differential_value
        if (ot_exempt && rateTypeCategory === "other") {
            differential_value = rate.differential_value;
        } else if (ot_exempt && rateTypeCategory === "shift") {
            differential_value = rate.differential_value;
        } else if (rate.differential_type === "Factor Differential") {
            differential_value = ot_exempt ? 1 : rate.differential_value;
        } else {
            differential_value = ot_exempt ? 0 : rate.differential_value;
        }

        const min_rate = rate.differential_type === "Factor Differential"
            ? Number(baseRateMin) * differential_value
            : Number(baseRateMin) + differential_value;

        const max_rate = rate.differential_type === "Factor Differential"
            ? Number(baseRateMax) * differential_value
            : Number(baseRateMax) + differential_value;

        return {
            ...rate,
            differential_value,
            min_rate: min_rate.toFixed(8),
            max_rate: max_rate.toFixed(8)
        };
    });
}

export async function getAllRateConfigurationBudget(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    try {
        const response = (request.body as any[]).map((config) => {
            const { program_id, name, is_shift_rate, hierarchies, job_templates, rate_configuration, ot_exempt } = config;

            const rateConfigurationDetails = rate_configuration.map((rateConfig: { base_rate: { rate_type: { min_rate: any; max_rate: any }; rates: any[] }; rate: any[] }) => {
                const baseRateMin = rateConfig.base_rate.rate_type.min_rate.amount;
                const baseRateMax = rateConfig.base_rate.rate_type.max_rate.amount;

                const base_rate = {
                    ...rateConfig.base_rate,
                    rate_type: {
                        ...rateConfig.base_rate.rate_type,
                        min_rate: {
                            ...rateConfig.base_rate.rate_type.min_rate,
                            amount: baseRateMin,
                        },
                        max_rate: {
                            ...rateConfig.base_rate.rate_type.max_rate,
                            amount: baseRateMax,
                        }
                    },
                    rates: rateConfig.base_rate.rates.map((rate) => {
                        const rateTypeCategory = rate.rate_type.rate_type_category.value;
                        return {
                            ...rate,
                            rateTypeCategory,
                            bill_rate: calculateRates(rate.bill_rate, baseRateMin, baseRateMax, ot_exempt, rateTypeCategory),
                            pay_rate: calculateRates(rate.pay_rate, baseRateMin, baseRateMax, ot_exempt, rateTypeCategory),
                        };
                    }),
                };

                const rates = rateConfig.rate?.map((rateConfigNested) => {
                    const rateTypeCategory = rateConfigNested.rate_type.rate_type_category.value;
                    return {
                        ...rateConfigNested,
                        rateTypeCategory,
                        bill_rate: calculateRates(rateConfigNested.bill_rate, baseRateMin, baseRateMax, ot_exempt, rateTypeCategory),
                        pay_rate: calculateRates(rateConfigNested.pay_rate, baseRateMin, baseRateMax, ot_exempt, rateTypeCategory),
                        rates: rateConfigNested.rates.map((nestedRate: { rate_type: any; bill_rate: any[]; pay_rate: any[] }) => {
                            const nestedRateTypeCategory = nestedRate.rate_type.rate_type_category.value;
                            return {
                                ...nestedRate,
                                rateTypeCategory: nestedRateTypeCategory,
                                bill_rate: calculateRates(nestedRate.bill_rate, baseRateMin, baseRateMax, ot_exempt, nestedRateTypeCategory),
                                pay_rate: calculateRates(nestedRate.pay_rate, baseRateMin, baseRateMax, ot_exempt, nestedRateTypeCategory),
                            };
                        }),
                    };
                });
                return { base_rate, rate: rates };
            });
            return { program_id, name, is_shift_rate, hierarchies, job_templates, rate_configuration: rateConfigurationDetails };
        });

        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: "Rate configurations fetched successfully.",
            rate_configurations: response,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message,
        });
    }
}

export async function rateConfigurationsFilter(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { id, name, is_shift_rate, job_type, is_enabled, updated_on, page, limit } = request.body as { id: string; name: string; is_shift_rate: string; job_type: string; is_enabled: string; updated_on: string[]; page: string; limit: string };

        const query = rateConfigurationsFilterQuery(
            Boolean(id),
            Boolean(name),
            Boolean(is_shift_rate),
            Boolean(job_type),
            Boolean(is_enabled),
            Boolean(updated_on)
        );

        const replacements: Record<string, any> = {
            program_id,
            id,
            name: name ? `%${name}%` : undefined,
            is_shift_rate,
            job_type,
            is_enabled,
            updated_on_start: updated_on ? updated_on[0] : undefined,
            updated_on_end: updated_on ? updated_on[1] : undefined,
            limit: parseInt(limit ?? '10', 10),
            offset: (parseInt(page ?? '1', 10) - 1) * parseInt(limit ?? '10', 10),
        };

        const data = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT,
        });

        if (!data.length) {
            return reply.status(200).send({
                status_code: 200,
                message: "Rate configurations not found.",
                trace_id: traceId,
                rate_configurations: [],
            });
        }

        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'Rate configurations fetched successfully.',
            rate_configurations: data,
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