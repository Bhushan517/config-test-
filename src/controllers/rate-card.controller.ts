import { FastifyRequest, FastifyReply } from "fastify";
import RateCard from "../models/rate-card.model";
import DecisionTable from "../models/rate-card-decision.model";
import generateCustomUUID from "../utility/genrateTraceId";
import { sequelize } from '../config/instance';
import hierarchies from "../models/hierarchies.model";
import jobTemplateModel from "../models/job-template.model";
import rateType from "../models/rate-type.model";
import Currencies from "../models/currencies.model";
import IndustriesModel from "../models/labour-category.model";
import { decodeToken } from "../middlewares/verifyToken";
import { Op } from "sequelize";

export const createRateCard = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
    const user = request?.user;
    const userId = user?.sub
    try {
        const { program_id } = request.params as { program_id: string };
        const { decision_table, ...rateCardData } = request.body as any;
        const newRateCard = await RateCard.create(
            {
                ...rateCardData,
                program_id,
                created_by: userId,
                updated_by: userId,
            },
            { transaction }
        );
        if (decision_table && Array.isArray(decision_table)) {
            for (const entry of decision_table) {
                await DecisionTable.create(
                    {
                        ...entry,
                        rate_card_id: newRateCard.id,
                    },
                    { transaction }
                );
            }
        }
        await transaction.commit();
        reply.status(201).send({
            status_code: 201,
            message: "Rate card created successfully.",
            rate_card_id: newRateCard.id,
            trace_id: traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            message: 'Internal Server Error',
            error: error.message || error,
            trace_id: traceId,
        });
    }
};

export const getAllRateCards = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { page = 1, limit = 10, updated_on, is_enabled, name } = request.query as {
            page?: number;
            limit?: number;
            updated_on?: string;
            is_enabled?: string;
            name?: string;
        };

        const parsedLimit = parseInt(limit as any, 10) || 10;
        const parsedPage = parseInt(page as any, 10) || 1;
        const offset = (parsedPage - 1) * parsedLimit;
        const whereConditions: any = {
            program_id,
            is_deleted: false,
        };
        if (updated_on) {
            const dateRange = updated_on.split(',');
            if (dateRange.length === 2) {
                const startDate = parseFloat(dateRange[0].trim());
                const endDate = parseFloat(dateRange[1].trim());
                whereConditions.updated_on = { [Op.between]: [startDate, endDate] };
            }
        }
        if (is_enabled !== undefined) {
            whereConditions.is_enabled = is_enabled === 'true';

        }
        let laborCategoryIds: string[] = [];
        if (name) {
            const laborCategories = await IndustriesModel.findAll({
                where: {
                    name: {
                        [Op.like]: `%${name}%`,
                    },
                },
                attributes: ['id'],
            });

            laborCategoryIds = laborCategories.map((category) => category.id);
            if (laborCategoryIds.length === 0) {
                return reply.status(200).send({
                    status_code: 200,
                    total_records: 0,
                    total_pages: 0,
                    current_page: parsedPage,
                    items_per_page: parsedLimit,
                    rate_cards: [],
                    trace_id: traceId,
                });
            }
            whereConditions.labor_category_id = laborCategoryIds;
        }
        const totalRecords = await RateCard.count({
            where: whereConditions,
        });

        const totalPages = Math.ceil(totalRecords / parsedLimit);
        const rateCards = await RateCard.findAll({
            where: whereConditions,
            limit: parsedLimit,
            offset,
            order: [["created_on", "DESC"]],
        });

        if (!rateCards.length) {
            return reply.status(200).send({
                status_code: 200,
                total_records: totalRecords,
                total_pages: totalPages,
                current_page: parsedPage,
                items_per_page: parsedLimit,
                rate_cards: [],
                trace_id: traceId,
            });
        }

        const laborCategoryIdsFromRateCards = rateCards
            .map((rateCard) => rateCard.labor_category_id)
            .filter((id) => id !== null);

        const laborCategories = await IndustriesModel.findAll({
            where: { id: laborCategoryIdsFromRateCards },
            attributes: ['id', 'name', 'is_enabled'],
        });

        const laborCategoryMap = laborCategories.reduce((map, category) => {
            map[category.id] = category;
            return map;
        }, {} as Record<string, any>);

        const rateCardIds = rateCards.map((rateCard) => rateCard.id);
        const decisionTables = await DecisionTable.findAll({
            where: { rate_card_id: rateCardIds },
            include: [
                {
                    model: hierarchies,
                    as: 'hierarchy',
                    attributes: ['id', 'name'],
                },
                {
                    model: jobTemplateModel,
                    as: 'job_template',
                    attributes: ['id', 'template_name'],
                },
                {
                    model: rateType,
                    as: 'rate_type',
                    attributes: ['id', 'name'],
                },
            ],
        });

        const currencyNames = [...new Set(decisionTables.map((dt) => dt.currency).filter(Boolean))];
        const currencies = await Currencies.findAll({
            where: { name: currencyNames },
            attributes: ['id', 'name', 'label', 'symbol'],
        });
        const currencyMap = Object.fromEntries(currencies.map((currency) => [currency.name, currency]));

        const decisionTableDetails = decisionTables.map((dt) => ({
            ...dt.toJSON(),
            currency: currencyMap[dt.currency] || null,
        }));

        const rateCardsWithDetails = rateCards.map((rateCard) => {
            const laborCategory = laborCategoryMap[rateCard.labor_category_id] ?? null;
            const relatedDecisionTables = decisionTableDetails.filter(
                (dt) => dt.rate_card_id === rateCard.id
            );
            return {
                ...rateCard.toJSON(),
                labor_category: laborCategory,
                decision_table: relatedDecisionTables.map((dt) => ({
                    id: dt.id,
                    rate_card_id: dt.rate_card_id,
                    hierarchy: dt.hierarchy ?? { id: "any", name: "Any" },
                    job_template: dt.job_template ?? { id: "any", template_name: "Any" },
                    rate_type: dt.rate_type ?? { id: "any", name: "Any" },
                    currency: dt.currency ?? { id: "any", name: "Any", label: "Any", symbol: "$" },
                    unit_of_measure: dt.unit_of_measure ?? "Any",
                    min_rate: dt.min_rate,
                    max_rate: dt.max_rate,
                    job_type: dt.job_type ?? "Any"
                })),
            };
        });

        return reply.status(200).send({
            message: 'Rate cards fetched successfully.',
            trace_id: traceId,
            rate_cards: rateCardsWithDetails,
            total_records: totalRecords,
            total_pages: totalPages,
            current_page: parsedPage,
            items_per_page: parsedLimit,
        });
    } catch (error: any) {
        return reply.status(500).send({
            message: 'Internal Server Error',
            error: error.message ?? error,
            trace_id: traceId,
        });
    }
};

export const getRateCardById = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const rateCard = await RateCard.findOne({
            where: { id, program_id, is_deleted: false },
        });
        if (!rateCard) {
            return reply.status(400).send({
                status_code: 400,
                message: "Rate card not found.",
                trace_id: traceId,
                rate_cards: [],
            });
        }
        let laborCategory = null;
        if (rateCard.labor_category_id) {
            laborCategory = await IndustriesModel.findOne({
                where: { id: rateCard.labor_category_id },
                attributes: ["id", "name", "is_enabled"],
            });
        }

        const decisionTables = await DecisionTable.findAll({
            where: { rate_card_id: rateCard.id },
            include: [
                {
                    model: hierarchies,
                    as: "hierarchy",
                    attributes: ["id", "name"],
                },
                {
                    model: jobTemplateModel,
                    as: "job_template",
                    attributes: ["id", "template_name"],
                },
                {
                    model: rateType,
                    as: "rate_type",
                    attributes: ["id", "name"],
                },
            ],
        });

        const decisionTableDetails = await Promise.all(
            decisionTables.map(async (dt) => {
                const currencyDetails = dt.currency
                    ? await Currencies.findOne({
                        where: { code: dt.currency },
                        attributes: ["id", "name", "label", "symbol"],
                    })
                    : null;

                return {
                    id: dt.id,
                    rate_card_id: dt.rate_card_id,
                    hierarchy: dt.hierarchy ?? { id: "any", name: "Any" },
                    job_template: dt.job_template ?? { id: "any", template_name: "Any" },
                    rate_type: dt.rate_type ?? { id: "any", name: "Any" },
                    currency: currencyDetails ?? { id: "any", name: "Any", label: "Any", symbol: "$" },
                    unit_of_measure: dt.unit_of_measure ?? "Any",
                    min_rate: dt.min_rate,
                    max_rate: dt.max_rate,
                    job_type: dt.job_type ?? "Any",
                }
            }),
        );
        const rateCardWithDetails = {
            ...rateCard.toJSON(),
            labor_category: laborCategory,
            decision_table: decisionTableDetails,
        };
        reply.status(200).send({
            status_code: 200,
            rate_card: rateCardWithDetails,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            message: "Internal Server Error",
            error: error.message ?? error,
            trace_id: traceId,
        });
    }
};

export const updateRateCard = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
    const user = request?.user;
    const userId = user?.sub;
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const { decision_table, is_enabled, ...rateCardUpdates } = request.body as any;

        const rateCard = await RateCard.findOne({
            where: { id, program_id, is_deleted: false },
            transaction,
        });

        if (!rateCard) {
            await transaction.rollback();
            return reply.status(400).send({
                status_code: 400,
                message: "Rate card not found.",
                trace_id: traceId,
                rate_cards: [],
            });
        }
        await RateCard.update(
            {
                ...rateCardUpdates,
                is_enabled,
                updated_by: userId,
                updated_on: Date.now(),
            },
            { where: { id, program_id, is_deleted: false }, transaction }
        );

        if (decision_table && Array.isArray(decision_table)) {
            await DecisionTable.destroy({
                where: { rate_card_id: id },
                transaction,
            });
            for (const dt of decision_table) {
                const existingEntry = await DecisionTable.findOne({
                    where: {
                        rate_card_id: id,
                        hierarchy_id: dt.hierarchy_id === "any" ? null : dt.hierarchy_id,
                        job_template_id: dt.job_template_id === "any" ? null : dt.job_template_id,
                        rate_type_id: dt.rate_type_id === "any" ? null : dt.rate_type_id,
                        currency: dt.currency === "any" ? null : dt.currency,
                        unit_of_measure: dt.unit_of_measure === "any" ? null : dt.unit_of_measure,
                        job_type: dt.job_type === "any" ? null : dt.job_type,
                    },
                    transaction,
                });
                if (existingEntry) {
                    await transaction.rollback();
                    return reply.status(400).send({
                        status_code: 400,
                        message: "Decision table entry already exists.",
                        trace_id: traceId,
                    });
                }
                await DecisionTable.create(
                    {
                        id: dt.id,
                        rate_card_id: id,
                        hierarchy_id: dt.hierarchy_id === "any" ? null : dt.hierarchy_id,
                        job_template_id: dt.job_template_id === "any" ? null : dt.job_template_id,
                        rate_type_id: dt.rate_type_id === "any" ? null : dt.rate_type_id,
                        currency: dt.currency === "any" ? null : dt.currency,
                        unit_of_measure: dt.unit_of_measure === "any" ? null : dt.unit_of_measure,
                        min_rate: dt.min_rate,
                        max_rate: dt.max_rate,
                        job_type: dt.job_type === "any" ? null : dt.job_type
                    },
                    { transaction }
                );
            }
        }

        await transaction.commit();
        reply.status(201).send({
            status_code: 201,
            message: "Rate card updated successfully.",
            trace_id: traceId,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            message: 'Internal Server Error',
            error: error.message ?? error,
            trace_id: traceId
        });
    }
};

export const advanceFilterRateCards = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const {
            page = 1,
            limit = 10,
            updated_on,
            is_enabled,
            name
        } = request.body as {
            page?: number;
            limit?: number;
            updated_on?: string;
            is_enabled?: boolean | string;
            name?: string;
        };

        const parsedLimit = parseInt(limit as any, 10) || 10;
        const parsedPage = parseInt(page as any, 10) || 1;
        const offset = (parsedPage - 1) * parsedLimit;

        const whereConditions: any = {
            program_id,
            is_deleted: false,
        };
        if (Array.isArray(updated_on)) {
            const dateRange = updated_on
                .map(dateStr => new Date(dateStr).getTime())
                .filter(ts => !isNaN(ts));

            if (dateRange.length === 2) {
                whereConditions.updated_on = { [Op.between]: dateRange };
            } else if (dateRange.length === 1) {
                const startOfDay = new Date(dateRange[0]);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(dateRange[0]);
                endOfDay.setHours(23, 59, 59, 999);
                whereConditions.updated_on = {
                    [Op.between]: [startOfDay.getTime(), endOfDay.getTime()],
                };
            }
        }


        if (is_enabled !== undefined) {
            whereConditions.is_enabled = is_enabled === 'true' || is_enabled === true;
        }
        let laborCategoryIds: string[] = [];
        if (name) {
            const laborCategories = await IndustriesModel.findAll({
                where: {
                    name: {
                        [Op.like]: `%${name}%`,
                    },
                },
                attributes: ['id'],
            });
            laborCategoryIds = laborCategories.map((category) => category.id);
            if (laborCategoryIds.length === 0) {
                return reply.status(200).send({
                    status_code: 200,
                    total_records: 0,
                    total_pages: 0,
                    current_page: parsedPage,
                    items_per_page: parsedLimit,
                    rate_cards: [],
                    trace_id: traceId,
                });
            }
            whereConditions.labor_category_id = laborCategoryIds;
        }
        const totalRecords = await RateCard.count({ where: whereConditions });
        const totalPages = Math.ceil(totalRecords / parsedLimit);
        const rateCards = await RateCard.findAll({
            where: whereConditions,
            limit: parsedLimit,
            offset,
            order: [["created_on", "DESC"]],
        });

        if (!rateCards.length) {
            return reply.status(200).send({
                status_code: 200,
                total_records: totalRecords,
                total_pages: totalPages,
                current_page: parsedPage,
                items_per_page: parsedLimit,
                rate_cards: [],
                trace_id: traceId,
            });
        }
        const laborCategoryIdsFromRateCards = rateCards
            .map((rateCard) => rateCard.labor_category_id)
            .filter((id) => id !== null);

        const laborCategories = await IndustriesModel.findAll({
            where: { id: laborCategoryIdsFromRateCards },
            attributes: ['id', 'name', 'is_enabled'],
        });

        const laborCategoryMap = laborCategories.reduce((map, category) => {
            map[category.id] = category;
            return map;
        }, {} as Record<string, any>);

        const rateCardIds = rateCards.map((rateCard) => rateCard.id);
        const decisionTables = await DecisionTable.findAll({
            where: { rate_card_id: rateCardIds },
            include: [
                { model: hierarchies, as: 'hierarchy', attributes: ['id', 'name'] },
                { model: jobTemplateModel, as: 'job_template', attributes: ['id', 'template_name'] },
                { model: rateType, as: 'rate_type', attributes: ['id', 'name'] },
            ],
        });
        const currencyNames = [...new Set(decisionTables.map((dt) => dt.currency).filter(Boolean))];
        const currencies = await Currencies.findAll({
            where: { name: currencyNames },
            attributes: ['id', 'name', 'label', 'symbol'],
        });
        const currencyMap = Object.fromEntries(currencies.map((currency) => [currency.name, currency]));
        const decisionTableDetails = decisionTables.map((dt) => ({
            ...dt.toJSON(),
            currency: currencyMap[dt.currency] ?? null,
        }));
        const rateCardsWithDetails = rateCards.map((rateCard) => {
            const laborCategory = laborCategoryMap[rateCard.labor_category_id] ?? null;
            const relatedDecisionTables = decisionTableDetails.filter(
                (dt) => dt.rate_card_id === rateCard.id
            );
            return {
                ...rateCard.toJSON(),
                labor_category: laborCategory,
                decision_table: relatedDecisionTables.map((dt) => ({
                    id: dt.id,
                    rate_card_id: dt.rate_card_id,
                    hierarchy: dt.hierarchy ?? { id: "any", name: "Any" },
                    job_template: dt.job_template ?? { id: "any", template_name: "Any" },
                    rate_type: dt.rate_type ?? { id: "any", name: "Any" },
                    currency: dt.currency ?? { id: "any", name: "Any", label: "Any", symbol: "$" },
                    unit_of_measure: dt.unit_of_measure ?? "Any",
                    min_rate: dt.min_rate,
                    max_rate: dt.max_rate,
                    job_type: dt.job_type ?? "Any"
                })),
            };
        });

        reply.status(200).send({
            status_code: 200,
            total_records: totalRecords,
            total_pages: totalPages,
            current_page: parsedPage,
            items_per_page: parsedLimit,
            rate_cards: rateCardsWithDetails,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            message: 'Internal Server Error',
            error: error.message ?? error,
            trace_id: traceId,
        });
    }
};
