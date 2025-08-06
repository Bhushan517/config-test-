import { FastifyRequest, FastifyReply } from 'fastify';
import CountryModel from '../models/countries.model';
import generateCustomUUID from '../utility/genrateTraceId';
import { decodeToken } from '../middlewares/verifyToken';
import { logger } from '../utility/loggerService';

export const createCountry = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub;

    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating country",
            status: "success",
            description: "Creating a new country record",
            level: 'info',
            action: request.method,
            url: request.url,
            is_deleted: false
        },
        CountryModel
    );

    try {
        const payload = request.body as {
            name: string,
            iso_code_2: string,
            iso_code_3: string,
            isd_code: string,
            min_phone_length: number,
            max_phone_length: number,
        };

        const existingCountry = await CountryModel.findOne({
            where: { name: payload.name }
        });

        if (existingCountry) {
            return reply.status(400).send({
                status_code: 400,
                message: "Country already exists with this name",
                trace_id: traceId,
            });
        }

        const newCountry: any = await CountryModel.create({
            ...payload,
            created_by: userId,
            updated_by: userId
        });

        reply.status(201).send({
            status_code: 201,
            data: newCountry?.id,
            message: 'Country Created successfully',
            trace_id: traceId,
            created_by: userId,
            updated_by: userId
        });

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create country",
                status: "success",
                description: `Created country successfully: ${newCountry.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                is_deleted: false
            },
            CountryModel
        );

    } catch (error: any) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create country",
                status: "error",
                description: "Error creating country",
                level: 'error',
                action: request.method,
                url: request.url,
                is_deleted: false
            },
            CountryModel
        );

        reply.status(500).send({
            status_code: 500,
            message: 'Failed to create Country',
            trace_id: traceId,
            error: error,
        });
    }
};


export const bulkUploadCountry = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const countries = request.body as any[];
        const createdCountries = await CountryModel.bulkCreate(countries);
        reply.status(201).send({
            status_code: 201,
            data: createdCountries,
            message: 'Countries Created successfully',
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to create Countries',
            trace_id: traceId,
            error: error,
        });
    }
};
export const getCountries = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();;
    try {
        const { name, id } = request.query as { name?: string; id?: string };
        const whereClause: any = { is_deleted: false };
        if (name) {
            whereClause.name = name;
        }
        if (id) {
            whereClause.id = id;
        }
        const countries = await CountryModel.findAll({
            where: whereClause,
            attributes: {
                exclude: [
                    "is_deleted",
                    "created_on",
                    "updated_on",
                    "created_by",
                    "updated_by",
                ],
            },
            order: [["name", "ASC"]],
        });

        reply.status(200).send({
            status_code: 200,
            message:
                countries.length === 0
                    ? "No Countries found"
                    : "Countries retrieved successfully",
            countries: countries,
            trace_id: traceId,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: "Failed to fetch Countries",
            trace_id: traceId,
            error,
        });
    }
};

export const getCountriesById = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const countries = await CountryModel.findOne({
            where: {
                id: id,
                is_deleted: false,
            }, attributes: { exclude: ['is_deleted', 'created_on', 'updated_on', 'created_by', 'updated_by'], },
        });
        if (countries) {
            reply.status(200).send({
                status_code: 200,
                message: "Countries get successfully",
                country: countries,
                trace_id: traceId,
            });
        }
        else {
            reply.status(200).send({
                status_code: 200,
                message: "Countries not found",
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to fetch Countries',
            trace_id: traceId,
            error: error,
        });
    }
};


export const updateCountry = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub;

    const { id } = request.params as { id: string };
    const payload = request.body as {
        name: string,
        iso_code_2: string,
        iso_code_3: string,
        isd_code: string,
        min_phone_length: number,
        max_phone_length: number,
    };

    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "updating country",
            status: "info",
            description: `Updating country with ID ${id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: id,
            is_deleted: false
        },
        CountryModel
    );

    try {
        const [updatedRows] = await CountryModel.update(
            {
                ...payload,
                updated_by: userId
            },
            {
                where: { id },
            }
        );

        if (updatedRows > 0) {
            reply.status(200).send({
                status_code: 200,
                message: 'Country updated successfully',
                trace_id: traceId,
            });

            logger(
                {
                    trace_id: traceId,
                    actor: {
                        user_name: user?.preferred_username,
                        user_id: user?.sub,
                    },
                    data: request.body,
                    eventname: "update country",
                    status: "success",
                    description: `Successfully updated country with ID ${id}`,
                    level: 'success',
                    action: request.method,
                    url: request.url,
                    entity_id: id,
                    is_deleted: false
                },
                CountryModel
            );

        } else {
            reply.status(404).send({
                status_code: 404,
                message: 'Country not found',
                trace_id: traceId,
            });

            logger(
                {
                    trace_id: traceId,
                    actor: {
                        user_name: user?.preferred_username,
                        user_id: user?.sub,
                    },
                    data: request.body,
                    eventname: "update country",
                    status: "warning",
                    description: `Country with ID ${id} not found`,
                    level: 'warning',
                    action: request.method,
                    url: request.url,
                    entity_id: id,
                    is_deleted: false
                },
                CountryModel
            );
        }
    } catch (error: any) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "update country",
                status: "error",
                description: `Error updating country with ID ${id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: id,
                is_deleted: false
            },
            CountryModel
        );

        reply.status(500).send({
            status_code: 500,
            message: 'Failed to update Country',
            trace_id: traceId,
            error: error,
        });
    }
};

export const deleteCountry = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { id } = request.params as { id: string };
        const user = request?.user;
        const userId = user?.sub;

        const [updatedRows] = await CountryModel.update(
            {
                is_enabled: false,
                is_deleted: true,
                updated_by: userId,
            },
            {
                where: { id },
            }
        );
        if (updatedRows > 0) {
            reply.status(200).send({
                status_code: 200,
                message: 'Country Deleted successfully',
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Country not found',
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Failed to delete Country',
            trace_id: traceId,
            error: error,
        });
    }
};
