

import stateModel from "../models/state.model";
import { stateInterface, StatePayload } from "../interfaces/state.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op } from "sequelize";
import { logger } from "../utility/loggerService";
import { decodeToken } from "../middlewares/verifyToken";
import { sequelize } from "../config/instance";


export async function createState(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const traceId = generateCustomUUID();
    const user=request?.user;
    const userId = user?.sub;

    logger({
        trace_id: traceId,
        actor: { user_name: user?.preferred_username, user_id: userId },
        data: request.body,
        eventname: "creating state",
        status: "in_progress",
        description: "Creating a new state record",
        level: "info",
        action: request.method,
        url: request.url,
        is_deleted: false,
    }, stateModel);

    const transaction = await sequelize.transaction();
    try {
        const states = request.body as stateInterface;

        const state_data: any = await stateModel.create(
            { ...states, created_by: userId, updated_by: userId },
            { transaction }
        );

        await transaction.commit();

        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: request.body,
            eventname: "created state",
            status: "success",
            description: `State created successfully`,
            level: "success",
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, stateModel);

        return reply.status(201).send({
            status_code: 201,
            message: "State created successfully",
            state_data,
            trace_id: traceId,
        });
    } catch (error) {
        await transaction.rollback();

        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: request.body,
            eventname: "creating state",
            status: "error",
            description: `Error creating state`,
            level: "error",
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, stateModel);

        console.error(error);
        return reply.status(500).send({
            status_code: 500,
            message: "An error occurred while creating state",
            error: (error as any).message,
            trace_id: traceId,
        });
    }
}


export async function createStateBulk(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const traceId = generateCustomUUID();
    try {
        const { country_id, states }: StatePayload = request.body as StatePayload;

        if (!country_id || !Array.isArray(states) || states.length === 0) {
            return reply.status(400).send({
                status_code: 400,
                message: 'Invalid payload',
                trace_id: traceId,
            });
        }

        const stateRecords = states.map(stateName => ({
            country_id,
            name: stateName
        }));

        const state_data = await stateModel.bulkCreate(stateRecords);

        reply.status(201).send({
            status_code: 201,
            message: 'States created successfully',
            state_data,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while creating states',
            error,
            trace_id: traceId,
        });
    }
}

export async function getStateById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params;
        console.log("Params:", id);
        const states = await stateModel.findOne({
            where: {
                id,
                is_deleted: false,
            },
            attributes: { exclude: ["ref_id",] },
        });
        if (states) {
            reply.status(201).send({
                status_code: 201,
                message: "state get succesfully",
                states: states,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "state data not found",
                states: [],
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: "An error occurred while fetching state", error, trace_id: traceId });
    }
}
export async function updateStateById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const updates = request.body as Partial<stateInterface>;
    const traceId = generateCustomUUID();
    const user=request?.user;
    const userId = user?.sub;
    logger({
        trace_id: traceId,
        actor: { user_name: user?.preferred_username, user_id: userId },
        data: request.body,
        eventname: "updating state",
        status: "in_progress",
        description: `Updating state with id ${id}`,
        level: 'info',
        action: request.method,
        url: request.url,
        entity_id: id,
        is_deleted: false
    }, stateModel);

    try {
        const [states] = await stateModel.update({...updates,updated_by:userId}, {
            where: { id }
        });

        if (states === 0) {
            logger({
                trace_id: traceId,
                actor: { user_name: user?.preferred_username, user_id: userId },
                data: request.body,
                eventname: "updating state",
                status: "failure",
                description: `State not found`,
                level: "warn",
                action: request.method,
                url: request.url,
                entity_id: id,
                is_deleted: false,
            }, stateModel);

            return reply.status(200).send({ 
                status_code: 200, 
                message: "State data not found", 
                trace_id: traceId, 
                states: [] 
            });
        }
        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: request.body,
            eventname: "updated state",
            status: "success",
            description: `State updated successfully`,
            level: "success",
            action: request.method,
            url: request.url,
            entity_id: id,
            is_deleted: false,
        }, stateModel);

        return reply.status(201).send({
            status_code: 201,
            message: "State updated successfully",
            states: id,
            trace_id: traceId
        });
    } catch (error) {
        logger({
            trace_id: traceId,
            actor: { user_name: user?.preferred_username, user_id: userId },
            data: request.body,
            eventname: "updating state",
            status: "error",
            description: `Error updating state `,
            level: "error",
            action: request.method,
            url: request.url,
            entity_id: id,
            is_deleted: false,
        }, stateModel);

        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: (error as any).message,
        });
    }
}

export async function deleteStatesById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const user=request?.user;
    const userId = user?.sub;
    try {
        const { id } = request.params;
        const [states] = await stateModel.update(
            {
                is_deleted: true,
                is_enabled: false,
                updated_on: Date.now(),
                updated_by:userId
            },
            { where: { id } }
        );
        if (states > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "state deleted successfully",
                states: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: "state not found", trace_id: traceId, states: [] });
        }
    } catch (error) {
        console.error("Error deleting state:", error);
        reply.status(500).send({ status_code: 500, message: "An error occurred while deleting state", error, trace_id: traceId });
    }
}

export async function getAllStatesByProgramId(
    request: FastifyRequest<{ Querystring: { name?: string; country_id?: string[] } }>,
    reply: FastifyReply
) {
    const { name, country_id } = request.query;
    let whereClause: any = {};

    if (name) {
        whereClause.name = { [Op.like]: `%${name}%` };
    }

    if (country_id) {
        const countryIds = Array.isArray(country_id)
            ? country_id
            : typeof country_id === 'string'
                ? (country_id as string).split(',')
                : [];

        whereClause.country_id = { [Op.in]: countryIds };
    }
    const traceId = generateCustomUUID();
    try {
        const states = await stateModel.findAll({ where: whereClause });
        if (states.length > 0) {
            reply.status(201).send({
                status_code: 201,
                message: "States retrieved successfully",
                data: states,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: "No states found for the given country_id(s)", states: [], trace_id: traceId, });
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: "Internal Server Error", trace_id: traceId });
    }
}



