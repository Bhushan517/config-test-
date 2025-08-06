
import ExpenseTypeModel from "../models/expense-type.model";
import { ExpenseTypeInterface } from "../interfaces/expense-type.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op, Sequelize } from "sequelize";
import { decodeToken } from "../middlewares/verifyToken";
import { logger } from "../utility/loggerService";

export async function createExpenseType(request: FastifyRequest, reply: FastifyReply) {


    const traceId = generateCustomUUID();
    const user = request?.user;

    logger(
        {

            traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating expense type",
            status: "info",
            description: `Creating expense type for program_id ${request.params as { program_id?: string }}`,
            level: "info",
            action: request.method,
            url: request.url,
            entity_id: request.params as { program_id?: string },
            is_deleted: false,
            created_by: user.sub,
            updated_by: user.sub,
        },
        ExpenseTypeModel
    );

    try {
        const { program_id } = request.params as { program_id?: string };
        const expenseType = request.body as ExpenseTypeInterface;

        const existingCode = await ExpenseTypeModel.findOne({
            where: {
                code: expenseType.code,
                program_id,
                is_deleted: false,
            },
        });

        if (existingCode) {
            return reply.status(409).send({
                status_code: 409,
                message: "An expense type with the same code already exists",
                trace_id: traceId,
            });
        }

        const expenseTypeData: any = await ExpenseTypeModel.create({
            ...expenseType,
            program_id,
            created_by: user.sub,
            updated_by: user.sub,
        });

        logger(
            {
                traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: expenseType,
                eventname: "expense type created",
                status: "success",
                description: `Expense type created successfully for program_id ${program_id}`,
                level: "success",
                action: request.method,
                url: request.url,
                entity_id: expenseTypeData?.id,
                is_deleted: false,
                created_by: user.sub,
                updated_by: user.sub,
            },
            ExpenseTypeModel
        );

        reply.status(201).send({
            status_code: 201,
            message: "Expense type created successfully",
            expense_type_data: expenseTypeData?.id,
            trace_id: traceId,
        });
    } catch (error: any) {
        logger(
            {
                traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "expense type creation failed",
                status: "failed",
                description: `Expense type creation failed for program_id ${request.params as { program_id?: string }}`,
                level: "error",
                action: request.method,
                url: request.url,
                entity_id: request.params as { program_id?: string },
                is_deleted: false,
                created_by: user.sub,
                updated_by: user.sub,
            },
            ExpenseTypeModel
        );

        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function getExpenseTypeById(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID()
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const expenseType = await ExpenseTypeModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
            attributes: { exclude: ["ref_id",] },
        });
        if (expenseType) {
            reply.status(201).send({
                status_code: 201,
                message: "expense type get succesfully",
                expense_item_type_config: expenseType,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "expense type data not found",
                expense_item_type_config: [],
                trace_id: traceId
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId
        });
    }
}

export async function updateExpenseTypeById(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const updates = request.body as ExpenseTypeInterface;
    const traceId = generateCustomUUID();
    const user = request?.user;

    try {
        logger(
            {
                traceId,
                actor: {
                    user_name: user.preferred_username,
                    user_id: user.sub,
                },
                updated_by: user.sub,
            },
            ExpenseTypeModel
        );

        const [updatedCount] = await ExpenseTypeModel.update(
            { ...updates, updated_by: user.sub, updated_on: Date.now() },
            {
                where: { id, program_id },
            }
        );

        if (updatedCount === 0) {
            return reply.status(200).send({
                message: "Expense type data not found",
                trace_id: traceId,
                expense_item_type_config: [],
            });
        }

        logger(
            {
                traceId,
                actor: {
                    user_name: user.preferred_username,
                    user_id: user.sub,
                },
                updated_by: user.sub,
            },
            ExpenseTypeModel
        );

        return reply.status(201).send({
            status_code: 201,
            message: "Expense type updated successfully",
            expense_type_id: id,
            trace_id: traceId,
        });
    } catch (error: any) {
        logger(
            {
                traceId,
                actor: {
                    user_name: user.preferred_username,
                    user_id: user.sub,
                },
                updated_by: user.sub,
            },
            ExpenseTypeModel
        );

        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message,
        });
    }
}



export async function deleteExpenseTypeById(
    request: FastifyRequest<{ Params: { id: string, program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const user = request?.user;

    try {
        const { id, program_id } = request.params;

        // Add `updated_by` to the update
        const [expenseType] = await ExpenseTypeModel.update(
            {
                is_deleted: true,
                is_enabled: false,
                updated_on: new Date(),
                updated_by: user.sub, // Add the user ID as the modifier
            },
            { where: { id, program_id } }
        );

        if (expenseType > 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "Expense type deleted successfully",
                expense_item_type_config: id,
                trace_id: traceId,
            });
        } else {
            return reply.status(200).send({
                status_code: 200,
                message: "Expense type not found",
                trace_id: traceId,
                expense_Type: [],
            });
        }
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message,
        });
    }
}


export async function getAllExpenseType(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const {
        name,
        code,
        category,
        is_msp_fees_applied,
        appply_tax,
        allow_unit_based,
        is_enabled,
        max_limit,
        page,
        limit,
        updated_on
    } = request.query as { name?: string, code?: string, category?: string, is_msp_fees_applied?: string, appply_tax?: string, allow_unit_based?: string, is_enabled?: string, max_limit?: string, page?: string, limit?: string, updated_on?: string };
    const traceId = generateCustomUUID();
    let whereClause: any = { program_id };

    if (name) {
        whereClause.name = { [Op.like]: `%${name}%` };
    }
    if (code) {
        whereClause.code = code;
    }
    if (category) {
        whereClause.category = { [Op.like]: `%${category}%` };
    }
    if (is_msp_fees_applied !== undefined) {
        whereClause.is_msp_fees_applied = is_msp_fees_applied === "true";
    }
    if (appply_tax !== undefined) {
        whereClause.is_tax_applied = appply_tax === "true" ? "1" : "0";
    }
    if (allow_unit_based !== undefined) {
        whereClause.is_unit_based = allow_unit_based === "true";
    }
    if (is_enabled !== undefined) {
        whereClause.is_enabled = is_enabled === "true";
    }
    if (max_limit !== undefined) {
        const limitFloat = parseFloat(max_limit);
        if (!isNaN(limitFloat)) {
            whereClause.max_unit_limit = {
                [Op.between]: [limitFloat - 0.0001, limitFloat + 0.0001],
            };
        }
    }
    if (updated_on) {
        const [startDateStr, endDateStr] = updated_on.split(",").map(v => v.trim());

        let startMs: number | undefined;
        let endMs: number | undefined;

        if (startDateStr) {
            const startDate = new Date(Number(startDateStr));
            startDate.setHours(0, 0, 0, 0);
            startMs = startDate.getTime();
        }

        if (endDateStr) {
            const endDate = new Date(Number(endDateStr));
            endDate.setHours(23, 59, 59, 999);
            endMs = endDate.getTime();
        } else if (startMs) {
            const endDate = new Date(Number(startDateStr));
            endDate.setHours(23, 59, 59, 999);
            endMs = endDate.getTime();
        }

        if (startMs && endMs) {
            whereClause.updated_on = {
                [Op.between]: [startMs, endMs]
            };
        } else if (startMs) {
            whereClause.updated_on = {
                [Op.gte]: startMs
            };
        } else if (endMs) {
            whereClause.updated_on = {
                [Op.lte]: endMs
            };
        }
    }


    const pageNumber = parseInt(page as unknown as string) || 1;
    const pageSize = parseInt(limit as unknown as string) || 10;
    const offset = (pageNumber - 1) * pageSize;

    try {
        const { rows: expenseType, count: total_records } = await ExpenseTypeModel.findAndCountAll({
            where: whereClause,
            offset,
            limit: pageSize,
            order: [["created_on", "DESC"]]
        });
        reply.status(200).send({
            status_code: 200,
            message: expenseType.length > 0 ? "Expense types retrieved successfully" : "No expense types found",
            expense_type: expenseType,
            total_records: total_records,
            page: pageNumber,
            limit: pageSize,
            trace_id: traceId,
        });
    } catch (error) {
        console.error(error);
        reply.status(500).send({ status_code: 500, message: "Internal Server Error", trace_id: traceId });
    }
}

export async function advancefilter(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const {
        name,
        code,
        category,
        is_msp_fees_applied,
        appply_tax,
        allow_unit_based,
        is_enabled,
        max_limit,
        page = 1,
        limit = 10,
        updated_on
    } = request.body as { name?: string, code?: string, category?: string, is_msp_fees_applied?: string, appply_tax?: string, allow_unit_based?: string, is_enabled?: string, max_limit?: string, page?: string, limit?: string, updated_on?: string };

    const traceId = generateCustomUUID();
    let whereClause: any = { program_id };

    if (name) whereClause.name = { [Op.like]: `%${name}%` };
    if (code) whereClause.code = code;
    if (category) whereClause.category = { [Op.like]: `%${category}%` };
    if (is_msp_fees_applied !== undefined) {
        whereClause.apply_msp_fee = is_msp_fees_applied === "true";
    }
    if (appply_tax !== undefined) {
        whereClause.appply_tax = (typeof appply_tax === 'string' ? appply_tax === 'true' : appply_tax === true);;
    }

    if (allow_unit_based !== undefined) {
        whereClause.allow_unit_based = allow_unit_based === "true";
    }
    if (is_enabled !== undefined) {
        whereClause.is_enabled = (typeof is_enabled === 'string' ? is_enabled === 'true' : is_enabled === true);
    }
    if (max_limit !== undefined && !isNaN(Number(max_limit))) {
        whereClause = {
            ...whereClause,
            [Op.and]: [Sequelize.literal(`JSON_EXTRACT(unit_based, '$.max_limit') <= ${Number(max_limit)}`)]
        };
    }
    if (Array.isArray(updated_on) && updated_on.length === 2) {
        const [startTimestamp, endTimestamp] = updated_on.map(ts => parseInt(ts, 10));
        whereClause.updated_on = { [Op.between]: [startTimestamp, endTimestamp] };
    }

    const pageNumber = parseInt(page as unknown as string, 10);
    const pageSize = parseInt(limit as unknown as string, 10);
    const offset = (pageNumber - 1) * pageSize;
    try {
        const { rows: expenseType, count: total_records } = await ExpenseTypeModel.findAndCountAll({
            where: whereClause,
            offset,
            limit: pageSize,
            order: [["created_on", "DESC"]],
        });

        const formattedExpenseType = expenseType.map((item) => ({
            ...item.toJSON(),
            appply_tax: item.is_tax_applied === "1", // Convert "1" -> true, "0" -> false
            is_negative_expense_allow: item.is_negative_expense_allowed === "1", // Convert "1" -> true, "0" -> false
        }));
        reply.status(200).send({
            status_code: 200,
            message: expenseType.length > 0 ? "Expense types retrieved successfully" : "No expense types found",
            expense_type: formattedExpenseType,
            total_records,
            page: pageNumber,
            limit: pageSize,
            trace_id: traceId,
        });
    } catch (error: any) {
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error: error.message,
            trace_id: traceId
        });
    }
}
