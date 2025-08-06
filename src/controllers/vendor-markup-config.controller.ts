import { FastifyRequest, FastifyReply } from 'fastify';
import vendorMarkupConfig from '../models/vendor-markup-config.model';
import vendorMarkupConfigInterface from '../interfaces/vendor-markup-config.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { baseSearch } from '../utility/baseService';
import { Sequelize } from 'sequelize';
import { decodeToken } from '../middlewares/verifyToken';
import { logger } from '../utility/loggerService';
import { databaseConfig } from '../config/db';

export async function getAllVendorMarkupConfig(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['tenant_id', 'is_enabled', 'rate_model', 'sourced_markup', 'program_id'];
    const responseFields = ['id', 'tenant_id', 'program_id', 'is_enabled', 'rate_model', 'sliding_scale', 'hierarchy', 'sourced_markup', 'payrolled_markup'];
    return baseSearch(request, reply, vendorMarkupConfig, searchFields, responseFields)
}

export async function getVendorMarkupConfigById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const item = await vendorMarkupConfig.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
        });
        if (item) {
            reply.status(200).send({
                status_code: 200,
                message: 'Vendor Markup Config found',
                trace_id: traceId,
                vendor_markup_config: item
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                vendor_markup_config: [],
                message: 'vendorMarkupConfig not found.',
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error
        });
    }
}

export async function createVendorMarkupConfig(
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { program_id } = request.params;
    const user=request?.user;
    const userId=user?.sub;
    logger(
        {
            trace_id:traceId,
            actor:{
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating vendor markup config",
            status: "success",
            description: `Creating vendor markup config for ${program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
             entity_id: program_id,
            is_deleted: false
        },
        vendorMarkupConfig
    )
    try {
        const { program_id } = request.params;
        const vendor = request.body as vendorMarkupConfigInterface;

        if (!program_id) {
            return reply.status(400).send({
                status_code: 400,
                trace_id: traceId,
                message: 'Program id is required.',
            });
        }

        const existingVendor = await vendorMarkupConfig.findOne({
            where: {
                id: vendor.id,
                // program_id: program_id
            }
        });

        if (existingVendor) {
            await existingVendor.update({ ...vendor, program_id });
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'VendorMarkupConfig updated successfully.',
                vendor: existingVendor
            });
        } else {
            const newVendor = await vendorMarkupConfig.create({ ...vendor, program_id, created_by: userId });
            logger(
                {
                    trace_id:traceId,
                    actor:{
                        user_name: user?.preferred_username,
                        user_id: user?.sub,
                    },
                    data: request.body,
                    eventname: "creating vendor markup config",
                    status: "success",
                    description: `Creating vendor markup config for ${program_id} successfully: ${newVendor}`,
                    level: 'success',
                    action: request.method,
                    url: request.url,
                     entity_id: program_id,
                    is_deleted: false
                },
                vendorMarkupConfig
            )
            
            return reply.status(201).send({
                status_code: 201,
                trace_id: traceId,
                message: 'VendorMarkupConfig created successfully.',
                vendor: newVendor
            });
        
        }
      
    } catch (error:any) {
        logger(
            {
              trace_id:traceId,
              actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
              },
              data: request.body,
              eventname: "create vendor markup config",
              status: "error",
              description: `error to create vendor markup config for ${program_id}`,
              level: 'error',
              action: request.method,
              url: request.url,
              entity_id: program_id,
              is_deleted: false
            },
            vendorMarkupConfig
          );
      
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: (error as Error).message
        });
    }
}

export async function updateVendorMarkupConfig(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
     const user=request?.user;
    const userId=user?.sub;
    const { id } = request.params as { id: string };
    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "updating vendor markup config",
            status: "info",
            description: `Updating vendor markup config with ID ${id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: id,
            is_deleted: false
        },
        vendorMarkupConfig
    );
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const data = request.body as vendorMarkupConfigInterface;

        const vendorData = await vendorMarkupConfig.findOne({
            where: { id, program_id, is_deleted: false },
        });

        if (!vendorData) {
            logger(
                {
                    trace_id: traceId,
                    actor: {
                        user_name: user?.preferred_username,
                        user_id: user?.sub,
                    },
                    data: request.body,
                    eventname: "update vendor markup config",
                    status: "success",
                    description: `Successfully updated vendor markup config with ID ${id}`,
                    level: 'success',
                    action: request.method,
                    url: request.url,
                    entity_id: id,
                    is_deleted: false
                },
                vendorMarkupConfig
            );

            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: 'vendorMarkupConfig data not found.',
                vendor_markup_config: [],
            });
        }
        await vendorData.update({ data, updated_by: userId });
        reply.status(201).send({
            status_code: 201,
            message: 'vendorMarkupConfig updated successfully.',
            trace_id: traceId,
        });
    } catch (error:any) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "update vendor markup config",
                status: "error",
                description: `Error updating vendor markup config with ID ${id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: id,
                is_deleted: false
            },
            vendorMarkupConfig
        );
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
        });
    }
}

export async function deleteVendorMarkupConfig(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const user=request?.user;
    const userId=user?.sub;
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const vendorData = await vendorMarkupConfig.findOne({
            where: { id, program_id, is_deleted: false },
        });
        if (!vendorData) {
            return reply.status(200).send({ status_code: 200, message: 'vendorMarkupConfig data not found.', vendor_markup_config: [], trace_id: traceId });
        }
        await vendorData.update({ is_enabled: false, is_deleted: true, updated_by: userId, });
        reply.status(204).send({
            status_code: 204,
            trace_id: traceId,
            message: 'vendorMarkupConfig Deleted Successfully.'
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error
        });
    }
}

export async function calculateAverageVendorMarkupConfig(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };

        const { program_industry, hierarchy, work_locations, min_rate, max_rate, rate_model } = request.body as {
            min_rate: number;
            max_rate: number;
            program_industry: string;
            hierarchy: string;
            work_locations: string;
            rate_model: string;
        };

        const markupData = await vendorMarkupConfig.findOne({
            where: {
                program_id,
                program_industry,
                hierarchy,
                work_locations,
                is_deleted: false,
            },
            attributes: [
                [Sequelize.fn('MIN', Sequelize.cast(Sequelize.json('markups.sourced_markup'), 'FLOAT')), 'sourced_markup_min'],
                [Sequelize.fn('MAX', Sequelize.cast(Sequelize.json('markups.sourced_markup'), 'FLOAT')), 'sourced_markup_max'],
                [Sequelize.fn('AVG', Sequelize.cast(Sequelize.json('markups.sourced_markup'), 'FLOAT')), 'sourced_markup_avg'],
                [Sequelize.fn('MIN', Sequelize.cast(Sequelize.json('markups.payrolled_markup'), 'FLOAT')), 'payrolled_markup_min'],
                [Sequelize.fn('MAX', Sequelize.cast(Sequelize.json('markups.payrolled_markup'), 'FLOAT')), 'payrolled_markup_max'],
                [Sequelize.fn('AVG', Sequelize.cast(Sequelize.json('markups.payrolled_markup'), 'FLOAT')), 'payrolled_markup_avg'],
            ],
            raw: true,
        });

        if (!markupData) {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                markup_aggregate: {},
                message: 'No markups found for vendors.',
            });
        }

        const {
            sourced_markup_min,
            sourced_markup_max,
            sourced_markup_avg,
            payrolled_markup_min,
            payrolled_markup_max,
            payrolled_markup_avg
        } = markupData;

        const avg_markup = (parseFloat(sourced_markup_avg) + parseFloat(payrolled_markup_avg)) / 2;

        const min_markup = Math.min(parseFloat(sourced_markup_min), parseFloat(payrolled_markup_min));
        const max_markup = Math.max(parseFloat(sourced_markup_max), parseFloat(payrolled_markup_max));
        const average_rate = (min_rate + max_rate) / 2;
        let min_bill_rate, max_bill_rate, average_bill_rate;

        if (rate_model === "PAY_RATE") {
            min_bill_rate = min_rate * (1 + min_markup / 100);
            max_bill_rate = max_rate * (1 + max_markup / 100);
            average_bill_rate = average_rate * (1 + avg_markup / 100);
        } else {
            min_bill_rate = min_rate;
            max_bill_rate = max_rate;
            average_bill_rate = average_rate;
        }

        reply.send({
            data: {
                min_bill_rate,
                max_bill_rate,
                average_bill_rate
            },
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: (error as Error).message,
            trace_id: traceId,
        });
    }
}
