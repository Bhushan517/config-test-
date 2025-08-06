
import InvoiceConfigModel from "../models/invoice-config.model";
import { InvoiceConfigInterface } from "../interfaces/invoice-config.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op, QueryTypes } from "sequelize";
import { decodeToken } from "../middlewares/verifyToken";
import { getInvoiceConfigByHierarchyId } from "../utility/queries";
import { sequelize } from "../config/instance";
import HierarchyModel from "../models/hierarchies.model";
import GlobalRepository from "../repositories/global.repository";

export async function createInvoiceConfig(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const traceId = generateCustomUUID();
    try {
        const user=request?.user
        const userId = user?.sub;

        const { program_id } = request.params as any;
        const invoiceConfig = request.body as InvoiceConfigInterface;

        const existingNameConfig = await InvoiceConfigModel.findOne({
            where: {
                program_id,
                name: invoiceConfig.name,
            },
        });

        if (existingNameConfig) {
            return reply.status(400).send({
                status_code: 400,
                message: `Invoice Configuration already exists with the name: ${invoiceConfig.name}`,
                trace_id: traceId,
            });
        }

        const existingConfig = await sequelize.query(getInvoiceConfigByHierarchyId, {
            replacements: {
                program_id,
                hierarchy_ids: JSON.stringify(invoiceConfig.hierarchy_ids),
            },
            type: QueryTypes.SELECT,
        });

        if (existingConfig.length > 0) {
            return reply.status(400).send({
                status_code: 400,
                message: `Invoice Configuration already exists with hierarchy ID(s): ${invoiceConfig.hierarchy_ids}`,
                trace_id: traceId,
            });
        }

        const invoiceConfigData: any = await InvoiceConfigModel.create({
            ...invoiceConfig, program_id, created_by: userId, updated_by: userId,
        });

        reply.status(201).send({
            status_code: 201,
            message: "Invoice config created successfully",
            invoice_config_data: invoiceConfigData?.uuid,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function getInvoiceConfigById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };

        const invoiceConfig = await InvoiceConfigModel.findOne({
            where: {
                uuid: id,
                program_id,
                is_deleted: false,
            },
        });

        if (!invoiceConfig) {
            return reply.status(404).send({
                status_code: 404,
                message: "Invoice config not found",
                trace_id: traceId,
            });
        }

        const hierarchyIds = invoiceConfig.hierarchy_ids || [];
        const hierarchies = await HierarchyModel.findAll({
            where: { id: hierarchyIds },
            attributes: ["id", "name"],
        });

        const enhancedInvoiceConfig = {
            ...invoiceConfig.toJSON(),
            hierarchy_details: hierarchies.map((hierarchy) => hierarchy.toJSON()),
        };

        reply.status(201).send({
            status_code: 201,
            message: "Invoice config retrieved successfully",
            invoice_config: enhancedInvoiceConfig,
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
        });
    }
}

export async function updateInvoiceConfigById(request: FastifyRequest, reply: FastifyReply) {
    const { id, program_id } = request.params as { id: string, program_id: string };
    const traceId = generateCustomUUID();
    try {
        const user=request?.user
        const userId = user?.sub;
        const invoiceConfig = await InvoiceConfigModel.findOne({
            where: { uuid: id, program_id },
            order: [['id', 'DESC']],
        });

        if (!invoiceConfig) {
            return reply.status(404).send({
                status_code: 404,
                message: "Invoice config data not found",
                trace_id: traceId,
                invoice_config: null,
            });
        }

        const newPayload = {
            ...request.body as InvoiceConfigInterface,
            program_id,
            parent_id: invoiceConfig.id,
            root_parent_id: invoiceConfig.parent_id || invoiceConfig.id
        };

        const newInvoiceConfig = await InvoiceConfigModel.create({
            ...newPayload,
            created_by: userId,
            updated_by: userId,
        });

        return reply.status(201).send({
            status_code: 201,
            message: "Invoice config updated successfully",
            invoice_config_id: newInvoiceConfig.uuid,
            trace_id: traceId,
        });
    } catch (error: any) {

        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function deleteInvoiceConfigById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string, program_id: string };
        
        const user=request?.user
        const userId = user?.sub;

        const [invoiceConfig] = await InvoiceConfigModel.update(
            {
                is_deleted: true,
                is_enabled: false,
                updated_on: Date.now(),
                updated_by: userId
            },
            { where: { uuid: id, program_id } }
        );
        if (invoiceConfig > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "Invoice config deleted successfully",
                invoice_config_id: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "Invoice config not found",
                trace_id: traceId,
                invoice_config: []
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

export async function getAllInvoiceConfig(request: FastifyRequest, reply: FastifyReply) {
    const { program_id } = request.params as { program_id: string };
    const { name, page = 1, limit = 10 , updated_on} = request.query as { name: string, page: number, limit: number, updated_on : any };
    const traceId = generateCustomUUID();
    const user=request?.user
    const offset = (page - 1) * limit;
    let whereClause: any = { program_id };
     let mspHierarchyIds ;
        if (user) {
            const hierarchyData = await GlobalRepository.getUserHierarchyData(program_id, user);
            mspHierarchyIds = hierarchyData.mspHierarchyIds || [];
        }

        // Build MSP hierarchy filter - only apply if user exists and has MSP restrictions
        if (user && Array.isArray(mspHierarchyIds) && mspHierarchyIds.length > 0) {
            const mspHierarchyChecks = mspHierarchyIds.map((hierarchyId: string) => 
                sequelize.literal(`JSON_CONTAINS(hierarchy_ids, '"${hierarchyId}"')`)
            );
            
            whereClause[Op.and] = {
                [Op.or]: [
                    // Record applies to all hierarchies
                    { is_all_hierarchy_associate: true },
                    // OR match any of the MSP hierarchy IDs
                    ...mspHierarchyChecks,
                    // OR hierarchy_ids is null/empty
                    { hierarchy_ids: null },
                    sequelize.literal(`hierarchy_ids = '[]'`),
                    { hierarchy_ids: '' }
                ]
            };
        }
    if (name) {
        whereClause.name = { [Op.like]: `%${name}%` };
    }
    if (updated_on) {
        const parts = String(updated_on).split(',').map(p => p.trim());

        const parseDate = (value: string, endOfDay = false): number | undefined => {
            if (!value) return undefined;
            const millis = Number(value);
            if (!isNaN(millis)) return millis;
            const date = new Date(value);
            if (isNaN(date.getTime())) return undefined; 
            if (endOfDay) {
                date.setHours(23, 59, 59, 999);
            } else {
                date.setHours(0, 0, 0, 0);
            }
            return date.getTime();
        };

        const start = parseDate(parts[0], false);
        const end = parts[1] && parts[1] !== '0' ? parseDate(parts[1], true) : undefined;

        if (start !== undefined) {
            whereClause.updated_on = {
                [Op.between]: [start, end ?? (start + 86400000 - 1)],
            };
        }
    }

    try {
        const filteredRecords = await InvoiceConfigModel.findAll({
            where: {
                ...whereClause,
                id: {
                    [Op.notIn]: sequelize.literal(`
                        (SELECT DISTINCT parent_id FROM invoice_config WHERE parent_id IS NOT NULL
                         UNION
                         SELECT DISTINCT root_parent_id FROM invoice_config WHERE root_parent_id IS NOT NULL)
                    `),
                },
            },
            attributes: ['id', 'uuid', 'name', 'slug', 'hierarchy_ids', 'is_active', 'is_enabled', 'updated_on', 'parent_id', 'root_parent_id'],
            order: [["created_on", "DESC"]],
        });

        if (filteredRecords.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "No Invoice config found",
                invoice_config: [],
                total_records: 0,
                trace_id: traceId,
            });
        }

        const total_records = filteredRecords.length;
        const paginatedRecords = filteredRecords.slice(offset, offset + limit);
        const hierarchyIds = paginatedRecords.flatMap(config => config.hierarchy_ids || []);

        const hierarchies = await HierarchyModel.findAll({
            where: { id: hierarchyIds },
            attributes: ["id", "name"],
        });

        const transformedInvoiceConfig = paginatedRecords.map(config => ({
            ...config.toJSON(),
            hierarchy_details: hierarchies.map(hierarchy => hierarchy.toJSON()),
        }));

        return reply.status(200).send({
            status_code: 200,
            message: "Invoice config retrieved successfully",
            total_records,
            current_page: Number(page),
            page_size: Number(limit),
            invoice_configs: transformedInvoiceConfig,
            trace_id: traceId,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
        });
    }
}
