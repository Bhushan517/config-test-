import { FastifyRequest, FastifySchema, FastifyReply } from "fastify";
import generateCustomUUID from '../utility/genrateTraceId';
import shiftConfigurationHierarchies from "../models/shift-configuration-hierarchies.model";
import ShiftType from "../models/shift-type.model";
import ShiftConfiguration from "../models/shift-configuration.model";
import { ShiftConfigurationHierarchiesAttributes } from "../interfaces/shift-configuration-hierarchies.interfaces";
import rateType from "../models/rate-type.model"
import { CreateRateTypeData } from "../interfaces/rate-type-interface"
import shiftTypeConfiguration from "../models/shift-type-configuration.model"
import { sequelize } from '../config/instance';
import { Op, QueryTypes } from 'sequelize';
interface ShiftRateTypesResponse {
    [key: string]: CreateRateTypeData;
}
export async function getShiftConfigurationHierarchies(request: FastifyRequest, reply: FastifyReply) {
    const traceId=generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const shiftConfiguration = await shiftConfigurationHierarchies.findAll({
            where: {
                program_id,
                is_deleted: false,
            },
        });
        reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message:" Shift Configuration Hierarchies Retrieved Successfully",
            shiftConfiguration
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
export async function getShiftConfigurationHierarchiesById(request: FastifyRequest, reply: FastifyReply) {
    const traceId=generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const item = await shiftConfigurationHierarchies.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
        });
        if (item) {
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: "Shift Configuration Hierarchy Retrieved Successfully",
                shiftConfiguration: item
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                event: [],
                message: 'shiftConfiguration not found.',
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

export async function createShiftConfigurationHierarchies(request: FastifyRequest, reply: FastifyReply) {
    const traceId=generateCustomUUID();
    try {
        const shiftConfigurationData = request.body as ShiftConfigurationHierarchiesAttributes;
        const shiftConfiguration = await shiftConfigurationHierarchies.create({ ...shiftConfigurationData });
        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            message: "Shift Configuration Hierarchy Created Successfully",
            shiftConfiguration
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

export const updateShiftConfigurationHierarchies = async (
    request: FastifyRequest<{ Params: { id: string; program_id: string }; Body: ShiftConfigurationHierarchiesAttributes }>,
    reply: FastifyReply
) => {
    const { id, program_id } = request.params;
    const updates = request.body;
    const traceId=generateCustomUUID();
    if (!program_id) {
        reply.status(400).send({
            status_code: 400,
            message: 'Program ID is required',
            trace_id: traceId,
        });
        return;
    }

    try {
        const [updatedCount] = await shiftConfigurationHierarchies.update(updates, {
            where: { id, program_id: program_id },
        });

        if (updatedCount > 0) {
            reply.status(201).send({
                status_code: 201,
                message: "Shift Configuration updated successfully.",
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Shift Configuration not found',
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error: Failed to update Shift Configuration',
            trace_id: traceId,
        });
    }
}
export async function deleteShiftConfigurationHierarchies(request: FastifyRequest, reply: FastifyReply) {
    const traceId=generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        const [numRowsDeleted] = await shiftConfigurationHierarchies.update({
            is_deleted: true,
        },
            { where: { id, program_id } }
        );

        if (numRowsDeleted > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "Shift Configuration deleted successfully.",
                shift_configuration_id: id,
                trace_id: traceId
            });
        } else {
            reply.status(200).send({status_code:200, message: 'Shift Configuration not found' ,trace_id:traceId});
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
export const shiftConfigFieldsHierarchies = async (shift_type_id: string, hierarchy_id: string) => {
    try {
        const shiftConfigHierarchieData = await shiftConfigurationHierarchies.create({
            shift_type_id: shift_type_id,
            hierarchy_id: hierarchy_id,
        });
        return shiftConfigHierarchieData;
    } catch (error) {
        console.error('Error during custom field hierarchie creation:', error);
        throw error;
    }
};

export const postRateTypesByShiftTypeSchema: FastifySchema = {
    querystring: {
        type: 'object',
        properties: {
            is_shift_rate: { type: 'boolean' },
            program_id: { type: 'string' }
        },
        required: ['is_shift_rate']
    },
    body: {
        type: 'object',
        properties: {
            hierarchy: { type: 'array', items: { type: 'string' } }
        },
        required: ['hierarchy']
    }
};

export async function postRateTypesByShiftType(
    request: FastifyRequest<{
        Body: {
            hierarchy: any[]
        },
        Querystring: {
            is_shift_rate: boolean,
            program_id?: string
        }
    }>,
    reply: FastifyReply
) {
    const traceId=generateCustomUUID();
    try {
        const { hierarchy } = request.body;
        const { program_id, is_shift_rate } = request.query;
        if (is_shift_rate) {

            const hierarchyMappings = await shiftConfigurationHierarchies.findAll({
                where: {
                    hierarchy_id: {
                        [Op.in]: hierarchy,
                    }
                },
                attributes: ["shift_config_id"]
            });

            const configIds = hierarchyMappings.map(config => config.shift_config_id);
            if (configIds.length === 0) {
                return reply.status(404).send({status_code:404, message: 'No shift configurations found for the provided hierarchy.', trace_id:traceId});
            }

            const shiftConfig = await ShiftConfiguration.findAll({
                where: {
                    id: {
                        [Op.in]: configIds,
                    }
                },
                attributes: ["id"]
            });

            if (shiftConfig.length === 0) {
                return reply.status(404).send({status_code:404, message: 'No shift configurations found.',trace_id:traceId });
            }

            const shiftConfigurations = shiftConfig.map(config => config.id);

            if (shiftConfigurations.length > 0) {
                const shiftTypeMappings = await shiftTypeConfiguration.findAll({
                    where: { shift_config_id: shiftConfigurations },
                    attributes: ["shift_type_id"]
                });

                if (shiftTypeMappings.length > 0) {
                    const shiftTypeIds = shiftTypeMappings.map(mapping => mapping.shift_type_id);
                    const shiftTypes = await ShiftType.findAll({
                        where: { id: shiftTypeIds, is_enabled: true },
                        attributes: ["id", "shift_type_name", "shift_type_category"]
                    });

                    const shiftTypeCategories = shiftTypes.map(shiftType => shiftType.shift_type_category);

                    const shiftRateTypesArray = await rateType.findAll({
                        where: {
                            shift_category: shiftTypeCategories,
                            is_shift_rate: true,
                            program_id: program_id,
                            is_enabled: true
                        },
                        attributes: ["id", "name", "shift_category", "is_shift_rate", "shift_rate", "type", "expense_rate", "bill_rate", "pay_rate"]
                    });

                    const uniqueTypes = new Set<string>();
                    const shiftRateTypes: ShiftRateTypesResponse = shiftRateTypesArray.reduce((acc, rateType) => {
                        const typeName = rateType.type;
                        if (typeName && !uniqueTypes.has(typeName)) {
                            uniqueTypes.add(typeName);
                            acc[typeName] = rateType.toJSON() as CreateRateTypeData;
                        }

                        return acc;
                    }, {} as ShiftRateTypesResponse);

                    return reply.status(200).send({
                        status_code: 200,
                        message: 'Shift rate types retrieved successfully.',
                        shift_types: shiftTypes,
                        rate_types: shiftRateTypes,
                        trace_id: traceId,
                        hierarchy
                    });
                } else {
                    return reply.status(404).send({status_code:404, message: 'No shift types found for the given configuration.' ,trace_id:traceId});
                }
            }
        } else {
            const rateTypesQuery = `
                SELECT id, name, shift_category, is_shift_rate,shift_rate,bill_rate,pay_rate,type,expense_rate, is_enabled
                FROM rate_type
                WHERE is_shift_rate = false AND program_id = :program_id AND is_enabled=true
            `;

            const rateTypes = await sequelize.query(rateTypesQuery, {
                replacements: { program_id },
                type: QueryTypes.SELECT
            });

            if (!Array.isArray(rateTypes) || rateTypes.length === 0) {
                return reply.status(404).send({
                    status_code: 404,
                    message: 'No rate types found for the given criteria.',
                    trace_id: traceId,
                });
            }

            const rate_types: ShiftRateTypesResponse = {};

            for (const rateType of rateTypes as CreateRateTypeData[]) {
                const typeName = rateType.type;
                if (typeName) {
                    rate_types[typeName] = rateType as CreateRateTypeData;
                }
            }

            const types: string[] = [...new Set(rateTypes.map((rt: any) => rt.type).filter(Boolean))];

            return reply.status(200).send({
                status_code: 200,
                message: 'Rate types retrieved successfully.',
                rate_types: rate_types,
                types,
                trace_id: traceId,
                hierarchy
            });
        }
    } catch (error) {
        console.error('Error processing request:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while processing the request.',
            error: (error as any).message,
            trace_id: traceId,
        });
    }
}

