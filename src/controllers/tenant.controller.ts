import { FastifyRequest, FastifyReply } from "fastify";
import Tenant from "../models/tenant.model";
import { Programs } from "../models/programs.model"
import { TenantData } from "../interfaces/tenant.interface";
import { createUser } from "./user.controller"
import { Op, Sequelize } from "sequelize";
import { advanceSearch } from "../utility/baseService";
import generateCustomUUID from "../utility/genrateTraceId"
import { logger } from '../utility/loggerService';
import { UserInterface } from "../interfaces/user.interface";
import { UserMappingAttributes } from "../interfaces/user-mapping.interface";
import { decodeToken } from '../middlewares/verifyToken';
import CountryModel from "../models/countries.model";
import { ProgramVendor } from "../models/program-vendor.model";

export async function getTenants(
    request: FastifyRequest<{ Querystring: TenantData }>,
    reply: FastifyReply
) {
    const { is_enabled } = request.query;
    const traceId = generateCustomUUID();

    try {
        const whereClause: any = { is_deleted: false };

        // Convert is_enabled from string to boolean if it's defined
        if (is_enabled !== undefined) {
            whereClause.is_enabled = is_enabled.toString() === "true";
        }

        const tenants = await Tenant.findAll({
            where: whereClause,
            attributes: ["id", "name", "display_name", "contacts", "created_on", "is_enabled", "vendor_industry"],
            order: [["created_on", "DESC"]],
        });

        if (tenants.length === 0) {
            return reply.status(200).send({ status_code: 200, message: "Tenants not found", tenants: [], trace_id: traceId });
        }

        reply.status(200).send({
            status_code: 200,
            message: "Tenants found",
            items_per_page: tenants.length,
            total_records: tenants.length,
            trace_id: traceId,
            tenant_data: tenants,
        });
    } catch (error) {
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId
        });
    }
}

export async function getTenantById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const traceId = generateCustomUUID();
    try {

        const tenant = await Tenant.findOne({
            where: {
                id,
                is_deleted: false,
            }
        });

        if (tenant) {
            const programCount = await Programs.count({
                where: {
                    [Op.or]: [
                        { msp_id: id },
                        { client_id: id }
                    ]
                }
            });
            const tenantData = tenant.toJSON();
            tenantData.program_count = programCount;

            if (Array.isArray(tenantData.addresses)) {
                for (const address of tenantData.addresses) {
                    if (address.country) {
                        const country = await CountryModel.findOne({
                            where: { id: address.country, is_deleted: false },
                            attributes: ["id", "name"],
                        });

                        if (country) {
                            address.country = country.toJSON();
                        }
                    }
                }
            }
            reply.status(200).send({
                status_code: 200,
                message: " Tenant found",
                tenant_data: tenantData,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: "Tenant not found", tenant: [], trace_id: traceId });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ status_code: 500, message: "Internal Server Error", trace_id: traceId });
    }
}

export async function createTenant(request: FastifyRequest, reply: FastifyReply) {
    const data = request.body as TenantData;
    const traceId = generateCustomUUID();
    const user = request?.user;

    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating tenant",
            status: "success",
            description: `Creating tenant.`,
            level: 'info',
            action: request.method,
            url: request.url,
            is_deleted: false
        },
        Tenant
    );

    try {
        const existingTenant = await Tenant.findOne({
            where: { display_name: data.name }
        });

        if (existingTenant) {
            return reply.status(400).send({
                status_code: 400,
                message: 'A tenant with the same name already exists',
                trace_id: traceId,
            });
        }

        const processedData = {
            ...data,
            type: data.type?.toLowerCase(),
        };
        const newItem: any = await Tenant.create(processedData);
        reply.status(201).send({
            status_code: 201,
            message: 'Tenant created successfully',
            id: newItem?.id,
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
                eventname: "create tenant",
                status: "success",
                description: `create tenant.`,
                level: 'success',
                action: request.method,
                url: request.url,
                is_deleted: false
            },
            Tenant
        );
    } catch (error: any) {
        logger({
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "failed to create tenant",
            status: "error",
            description: `Failed to create tenant: ${error.message}`,
            level: 'error',
            action: request.method,
            url: request.url,
            is_deleted: false
        })
        if (error.name === "SequelizeUniqueConstraintError") {
            const field = error.errors[0].path;
            return reply.status(400).send({ status_code: 400, error: `${field} already in use!`, trace_id: traceId });
        }
        console.error(error);
        return reply.status(500).send({ status_code: 500, message: "Failed To Create Tenant", error, trace_id: traceId });
    }
}

export async function createTenantAndUser(request: FastifyRequest, reply: FastifyReply) {
    const { tenant } = request.body as { tenant: TenantData; user: UserInterface; user_group_mapping: UserMappingAttributes };
    const traceId = generateCustomUUID();
    const user = request?.user;
    try {
        const processedData = {
            ...tenant,
            name: tenant.name,
            type: tenant.type?.toLowerCase(),
        };

        const [newTenant, created] = await Tenant.findOrCreate({
            where: { name: tenant.name },
            defaults: processedData,
        });
        if (!created) {
            return reply.status(409).send({
                status_code: 409,
                message: 'A tenant with the same name already exists',
                trace_id: traceId,
            });
        }

        await createUser(request, reply);

        return reply.status(201).send({
            status_code: 201,
            message: 'Tenant and user created successfully.',
            tenant_id: newTenant.id,
            trace_id: traceId,
        });
    } catch (error: any) {
        if (error.name === "SequelizeUniqueConstraintError") {
            const field = error.errors[0]?.path || 'Unknown field';
            return reply.status(400).send({ status_code: 400, message: `${field} already in use!`, traceId });
        }
        return reply.status(500).send({
            status_code: 500,
            message: "Failed To Create Tenant and User",
            error: error.message,
            trace_id: traceId,
        });
    }
}

export async function updateTenant(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const TenantData = request.body as TenantData;
    const traceId = generateCustomUUID();

    try {
        const tenant: Tenant | null = await Tenant.findByPk(id);
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
        }
        const token = authHeader.split(' ')[1];
        let user: any = await decodeToken(token);
        if (!user) {
            return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
        }
        const userId = user?.sub;
        if (tenant) {
            await tenant.update({ ...TenantData, updated_by: userId });

            if (TenantData.display_name) {
                await ProgramVendor.update(
                    { display_name: TenantData.display_name },
                    { where: { tenant_id: id } }
                );
            }
            reply.status(200).send({
                status_code: 200,
                message: 'Tenant updated successfully.',
                id: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: "Tenant not found", tenants: [], trace_id: traceId });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ status_code: 500, message: "Internal Server Error", trace_id: traceId });
    }
}

export async function deleteTenant(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    try {

        const tenant = await Tenant.findByPk(id);
        const user = request?.user;
        const userId = user?.sub;
        if (tenant) {

            await tenant.destroy();
            reply.status(200).send({
                status_code: 200,
                message: 'Tenant deleted successfully.',
                id: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: "Tenant not found", tenants: [], trace_id: traceId });
        }
    } catch (error) {
        console.error(error);
        reply.status(500).send({ status_code: 500, message: "Internal Server Error", trace_id: traceId });
    }
}

export async function searchTenantsWithProgramCount(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ["id", "name", "display_name", "contacts", "created_on", "is_enabled", "type", "vendor_code"];
    const responseFields = ["id", "name", "display_name", "contacts", "created_on", "is_enabled", "type", "logo", "vendor_code"];
    const traceId = generateCustomUUID();
    try {
        const body = request.body as Record<string, any>;
        const page = body.page ? parseInt(body.page) : null;
        const limit = body.limit ? parseInt(body.limit) : null;
        const offset = page && limit ? (page - 1) * limit : undefined;


        const sortField = body.sortField || "created_on";
        const sortDirection = body.sortDirection || "DESC";

        const validSortFields = [...searchFields, "created_on"];
        const validDirections: ("ASC" | "DESC")[] = ["ASC", "DESC"];

        const finalSortField = validSortFields.includes(sortField) ? sortField : "created_on";
        const finalSortDirection = validDirections.includes(sortDirection as "ASC" | "DESC") ? sortDirection : "DESC";

        let searchConditions: any = {};

        searchFields.forEach(field => {
            if (body[field]) {
                if (field === "is_enabled") {
                    searchConditions[field] = body[field] === true ? 1 : 0;
                } else {
                    searchConditions[field] = {
                        [Op.like]: `%${body[field].trim()}%`
                    };
                }
            }
        });

        let attributes: any[] | undefined = responseFields.map(field => [field, field]);
        if (body.info_level === "detail") {
            attributes = undefined;
        } else {
            if (body.type.toUpperCase() === "VENDOR") {
                attributes.push([
                    Sequelize.literal(`(
                        SELECT COUNT(*)
                        FROM program_vendors AS pv
                        WHERE pv.tenant_id = Tenant.id
                    )`),
                    "program_count"
                ]);
            }
            else if (body.type.toUpperCase() === "MSP") {
                attributes.push([
                    Sequelize.literal(`(
                        SELECT COUNT(*)
                        FROM program_msp_association AS pma
                        WHERE pma.msp_id = Tenant.id
                    )`),
                    "program_count"
                ]);
            }
            else {
                attributes.push([
                    Sequelize.literal(`(
                        SELECT COUNT(*)
                        FROM programs AS p
                        WHERE p.client_id = Tenant.id
                    )`),
                    "program_count"
                ]);
            }
        }

        const { rows: results, count } = await Tenant.findAndCountAll({
            where: { ...searchConditions, is_deleted: false },
            limit: limit ?? undefined,
            offset: offset,
            attributes: attributes,
            order: [[finalSortField, finalSortDirection]],
        });

        return reply.status(200).send({
            status_code: 200,
            message: " Tenants retrieved successfully",
            total_records: count,
            tenants: results,
            trace_id: traceId
        });
    } catch (error: any) {
        return reply.status(500).send({ status_code: 500, message: "Internal Server Error", error: error.message, trace_id: traceId });
    }
}

export async function advancedSearchTenants(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ["name", "display_name", "is_enabled", "updated_on", "display_name"];
    const responseFields = ["id", "name", "display_name", "type", "is_enabled"];
    return advanceSearch(request, reply, Tenant, searchFields, responseFields);
}

export async function getPasswordPolicy(request: FastifyRequest<{ Params: { client_id: string } }>, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { client_id } = request.params;
        const tenant: Tenant | null = await Tenant.findOne({
            where: { id: client_id },
            attributes: ['password_policy'],
        });
        if (tenant) {
            reply.status(200).send({
                status_code: 200,
                message: "Password policy retrieved successfully",
                password_policy: tenant.password_policy,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'password_policy not found.',
                password_policy: [],
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching password_policy.',
            trace_id: traceId,
            error: error,
        });
    }
}

