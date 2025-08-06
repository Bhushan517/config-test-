
import countyModel from "../models/county.model";
import { CountyInterface } from "../interfaces/county.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op } from "sequelize";
import { decodeToken } from "../middlewares/verifyToken";
import { logger } from "../utility/loggerService";

export async function createCounty(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const county = request.body as CountyInterface;
        const user=request?.user
        const userId = user?.sub;
  
        logger({
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating county",
            status: "info",
            description: "Attempting to create a new county record",
            level: "info",
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, countyModel);

        const county_data: any = await countyModel.create({ ...county, created_by: userId, updatedby: userId });

        reply.status(201).send({
            status_code: 201,
            message: "County created successfully",
            county_data: county_data?.id,
            trace_id: traceId,
        });

        logger({
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "create county",
            status: "success",
            description: `County created successfully: ${county_data?.id}`,
            level: "success",
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, countyModel);
    } catch (error) {
        logger({
            trace_id: traceId,

            data: request.body,
            eventname: "create county",
            status: "error",
            description: "Error creating county",
            level: "error",
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, countyModel);

        reply.status(500).send({
            status_code: 500,
            message: "An error occurred while creating county",
            trace_id: traceId,
            error,
        });
    }
}

export async function getCountyById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params;
        console.log("Params:", id);
        const county = await countyModel.findOne({
            where: {
                id,
                is_deleted: false,
            },
            attributes: { exclude: ["ref_id",] },
        });
        if (county) {
            reply.status(201).send({
                status_code: 201,
                message: "county get succesfully",
                county: county,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "county data not found",
                county: []
            });
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, 
            message: "An error occurred while fetching county", 
            traceId:traceId,
            error
         });
    }
}
export async function updateCountyById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { id } = request.params as { id: string };
    const updates = request.body as Partial<CountyInterface>;

    try {
        const user=request?.user
        logger({
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: updates,
            eventname: "update county",
            status: "info",
            description: `Updating county with ID: ${id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            is_deleted: false
        }, countyModel);

        const [county] = await countyModel.update(updates, { where: { id } });

        if (county === 0) {
            return reply.status(200).send({ message: "county data not found", trace_id: generateCustomUUID(), county: [] });
        }

        reply.status(201).send({
            status_code: 201,
            message: "county updated successfully",
            county: id,
            trace_id: traceId,
        });

        logger({
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: updates,
            eventname: "update county",
            status: "success",
            description: `County updated successfully: ${id}`,
            level: 'success',
            action: request.method,
            url: request.url,
            is_deleted: false
        }, countyModel);
    } catch (error) {
        logger({
            trace_id: traceId,

            data: updates,
            eventname: "update county",
            status: "error",
            description: `Error updating county: ${id}`,
            level: 'error',
            action: request.method,
            url: request.url,
            is_deleted: false
        }, countyModel);

        return reply.status(500).send({ status_code: 500, message: "Internal Server Error", trace_id: traceId, error });
    }
}


export async function deleteCountyById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params;
        const user=request?.user
        const userId = user?.sub;
        const [county] = await countyModel.update(
            {
                is_deleted: true,
                is_enabled: false,
                updated_on: Date.now(),
                updated_by: userId
            },
            { where: { id } }
        );
        if (county > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "county deleted successfully",
                county: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: "county not found", trace_id: traceId, county: [] });
        }
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: "An error occurred while deleting county", error });
    }
}
export async function getAllCounty(request: FastifyRequest<{ Querystring: { name?: string; state_id?: string[] } }>, reply: FastifyReply) {
    const { name, state_id } = request.query;
    const traceId = generateCustomUUID();
    let whereClause: any = {};

    if (name) {
        whereClause.name = { [Op.like]: `%${name}%` };
    }

    if (state_id) {
        const stateIds: string[] = Array.isArray(state_id)
            ? state_id
            : (state_id as string).split(',');
        whereClause.state_id = { [Op.in]: stateIds };
    }

    try {
        const counties = await countyModel.findAll({ where: whereClause });
        if (counties.length > 0) {
            reply.status(201).send({
                status_code: 201,
                message: "Counties retrieved successfully",
                data: counties,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200,
                 message: "No counties found for the given state_id(s)", 
                 counties: [], trace_id: generateCustomUUID(), });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ status_code: 500,
             message: "Internal Server Error" ,
             traceId:traceId,
            });
    }
}