import { FastifyRequest, FastifyReply } from "fastify";
import UserMapping from "../models/user-mapping.model";
import { UserMappingAttributes } from "../interfaces/user-mapping.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { decodeToken } from "../middlewares/verifyToken";
import { sequelize } from "../config/instance";
import { QueryTypes } from "sequelize";
import { getPendingUser } from "./user.controller";
import { databaseConfig } from '../config/db';
import { parseValue } from "../utility/parse-value";
import { getCustomsField } from "../utility/get-custom-field";
const auth_db = databaseConfig.config.database_auth;
export const getAllUserMappings = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const userMappings = await UserMapping.findAll();
        if (userMappings.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: "User mappings not found",
                user_mapping: [],
                trace_id: traceId,
            });
        }
        reply.status(200).send(userMappings);
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error,
            trace_id: traceId,
        });
    }
};


export const getUserMappingById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const traceId = generateCustomUUID();
    try {
        const userMapping = await UserMapping.findByPk(id);
        if (userMapping) {
            reply.status(200).send({
                status_code: 200,
                message: "Data fetched successfully",
                user_mapping: userMapping,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "User Mapping not found",
                user_mapping: [],
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error,
            trace_id: traceId,
        });
    }
};

export async function createUserMappings(
    request_payload: Omit<UserMappingAttributes, "id">,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { tenant_id, user_id, role_id, program_id } = request_payload;

        const existingMapping = await UserMapping.findOne({
            where: {
                tenant_id,
                user_id,
                program_id
            }
        });

        if (existingMapping) {
            return reply.status(200).send({
                status_code: 200,
                message: "A user mapping already exists for the specified tenant, user, and program.",
                trace_id: traceId,
            });
        }

        const newUserMapping = await UserMapping.create({ tenant_id, user_id, role_id, program_id });
        return reply.status(201).send({
            status_code: 201,
            message: "User Mapping created successfully",
            user_mapping: newUserMapping,
            trace_id: traceId,
        });

    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error,
            trace_id: traceId,
        });
    }
}

export const updateUserMappingById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as Partial<UserMappingAttributes>;
    const traceId = generateCustomUUID();
    try {
        const authHeader = request.headers.authorization;
        const user = request?.user;
        const userId = user?.sub;
        updates.updated_on = BigInt(Date.now())
        const [updatedCount] = await UserMapping.update({ ...updates, updated_by: userId, }, { where: { id: id } });
        if (updatedCount > 0) {
            reply.status(201).send({
                status_code: 201,
                message: "User Mapping updated successfully",
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "User Mapping not found",
                user_mapping: [],
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error,
            trace_id: traceId,
        });
    }
};


export const deleteUserMappingById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub;
    try {
        const deletedCount = await UserMapping.destroy({ where: { id: id } });
        if (deletedCount > 0) {
            reply.status(204).send({
                status_code: 204,
                message: "User Mapping deleted successfully",
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "User Mapping not found",
                user_mapping: [],
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error,
            trace_id: traceId,
        });
    }
};

export async function updateStatus(
    request: FastifyRequest<{
        Params: { program_id: string; id: string };
    }>,
    reply: FastifyReply
) {
    const { program_id, id } = request.params;
    const traceId = generateCustomUUID();

    try {
        const userMapping = await UserMapping.findOne({
            where: { program_id, id },
        });
        if (!userMapping) {
            return reply.code(404).send({
                status_code: 404,
                message: "No matching user mapping record found.",
                trace_id: traceId,
            });
        }

        const newStatus = !userMapping.is_active;
        await UserMapping.update(
            { is_active: newStatus },
            { where: { program_id, id } }
        );
        return reply.code(200).send({
            status_code: 200,
            message: `User mapping updatd successfully`,
            trace_id: traceId,
        });
    } catch (error: any) {
        return reply.code(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message,
        });
    }
}


export const getUserMappings = async (request: FastifyRequest, reply: FastifyReply) => {
    const { program_id, id } = request.params as { program_id: string; id: string };
    const queryParams = request.query as { [key: string]: string | boolean };
    const user = request?.user;
    if (!user) {
        return reply.status(401).send({
            status_code: 401,
            message: "Unauthorized - Invalid token",
        });
    }
    const userType = user?.userType;
    const traceId = generateCustomUUID();

    try {
        const checkUserQuery = `
        SELECT 
            LOWER(user.status) AS status
        FROM user_mappings 
        LEFT JOIN user 
            ON user_mappings.user_id = user.user_id 
            AND user_mappings.program_id = user.program_id
        WHERE user_mappings.program_id = :program_id 
        AND user_mappings.id = :id;
        `;

        const userStatus = await sequelize.query(checkUserQuery, {
            replacements: { program_id, id },
            type: QueryTypes.SELECT,
        }) as any;
        console.log("userStatus", userStatus)
        if (!userStatus.length || !userStatus[0].status) {
            return await getPendingUser(
                {
                    params: { program_id, user_mapping_id: id },
                } as any,
                reply
            );
        }
        if (userStatus[0].status === "active" || userStatus[0].status === "inactive") {
            const query = `
            SELECT 
                um.id, 
                um.tenant_id, 
                um.role_id, 
                um.user_id, 
                um.program_id, 
                um.is_active, 
                um.is_deleted, 
                um.created_on, 
                um.updated_on, 
                um.created_by, 
                um.updated_by,
                JSON_OBJECT(
                    'id', u.id,
                    'user_id', u.user_id,
                    'program_id', u.program_id,
                    'tenant_id', u.tenant_id,
                    'first_name', u.first_name,
                    'last_name', u.last_name,
                    'email', u.email,
                    'sso_id', u.sso_id,
                    'title', u.title,
                    'user_mapping_id', um.id,
                    'name_prefix', u.name_prefix,
                    'middle_name', u.middle_name,
                    'name_suffix', u.name_suffix,
                    'user_type', u.user_type,
                    'avatar', u.avatar,
                    'status', u.status,
                    'theme', u.theme,
                    'country_id', u.country_id,
                    'applications', u.applications,
                    'credentials', u.credentials,
                    'supervisor', u.supervisor,
                    'time_zone_id', u.time_zone_id,
                    'language_id', u.language_id,
                    'date_format', u.date_format,
                    'role_id', u.role_id,
                    'associate_hierarchy_ids', u.associate_hierarchy_ids,
                    'work_location_ids', u.work_location_ids,
                    'associate_cost_ids', u.associate_cost_ids,
                    'spend_category_ids', u.spend_category_ids,
                    'is_all_hierarchy_associate', u.is_all_hierarchy_associate,
                    'is_all_work_location_associate', u.is_all_work_location_associate,
                    'is_all_cost_center_associate', u.is_all_cost_center_associate,
                    'default_cost_center_id', u.default_cost_center_id,
                    'is_all_spend_category_associate', u.is_all_spend_category_associate,
                    'default_spend_category_id', u.default_spend_category_id,
                    'is_allow_unlimited_authority', u.is_allow_unlimited_authority,
                    'is_all_labour_category_associate', u.is_all_labour_category_associate,
                    'associate_labour_category', u.associate_labour_category,
                    'min_limit', u.min_limit,
                    'supervisor', u.supervisor,
                    'max_limit', u.max_limit,
                    'is_enabled', u.is_enabled,
                    'is_active', u.is_active,
                    'is_deleted', u.is_deleted,
                    'created_on', u.created_on,
                    'updated_on', u.updated_on,
                    'created_by', u.created_by,
                    'addresses', u.addresses,
                    'associate_job_type', u.associate_job_type,
                    'is_all_job_type_associate', u.is_all_job_type_associate,
                    'contacts', COALESCE(u.contacts, JSON_ARRAY()),
                    'updated_by', u.updated_by,
                    'countries', JSON_OBJECT('id', ct.id, 'name', ct.name,'isd_code',ct.isd_code,'iso_code_2', ct.iso_code_2, 'iso_code_3', ct.iso_code_3),
                    'user_role', JSON_OBJECT('id', ur.id, 'role_name', ur.role_name, 'display_name', ur.display_name),
                    'tenant_id', JSON_OBJECT('id', t.id, 'name', t.name,'display_name', t.display_name),
                    'supervisor_id', 
                      CASE 
                        WHEN su.user_id IS NULL THEN null
                      ELSE JSON_OBJECT(
                        'id', su.user_id,
                        'first_name', su.first_name,
                        'last_name', su.last_name
                       )
                      END,
                    'default_hierarchy_id', JSON_OBJECT('id', dh.id, 'name', dh.name),
                    'default_work_location_id', JSON_OBJECT('id', dwl.id, 'name', dwl.name),
                    'associate_hierarchy_ids', (
                    SELECT JSON_ARRAYAGG(JSON_OBJECT('id', h.id, 'name', h.name))
                    FROM hierarchies h
                    WHERE JSON_CONTAINS(u.associate_hierarchy_ids, JSON_QUOTE(h.id))
                    AND h.is_enabled=true
                   ),

                    'associate_labour_category', COALESCE((
                        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', l.id, 'name', l.name))
                        FROM labour_category l
                        WHERE JSON_CONTAINS(u.associate_labour_category, JSON_QUOTE(l.id))
                    ), JSON_ARRAY()),
                    'work_location_ids', (
                     SELECT JSON_ARRAYAGG(JSON_OBJECT('id', wl.id, 'name', wl.name))
                     FROM work_locations wl
                     WHERE JSON_CONTAINS(u.work_location_ids, JSON_QUOTE(wl.id))
                        AND wl.is_enabled=true
                    )
                ) AS user
            FROM user_mappings um
            LEFT JOIN user u ON um.user_id = u.user_id AND um.program_id = u.program_id
            LEFT JOIN countries ct ON (
                u.country_id = ct.id OR 
                EXISTS (
                    SELECT 1 
                    FROM JSON_TABLE(
                        u.addresses, 
                        '$[*]' COLUMNS (
                            country VARCHAR(36) PATH '$.country'
                        )
                    ) AS addr 
                    WHERE addr.country = ct.id
                )
            )            
            LEFT JOIN tenant t ON u.tenant_id = t.id
            LEFT JOIN hierarchies dh ON u.default_hierarchy_id = dh.id AND dh.is_enabled=true
            LEFT JOIN ${auth_db}.roles ur ON u.role_id = ur.id
            LEFT JOIN work_locations dwl ON u.default_work_location_id = dwl.id AND dwl.is_enabled=true
            LEFT JOIN user su ON u.supervisor = su.user_id
            WHERE um.program_id = :program_id AND um.id = :id
            `;

            const replacements = { program_id, id };
            const userMappings = await sequelize.query(query, {
                replacements,
                type: QueryTypes.SELECT,
            }) as any;

            if (!userMappings.length) {
                return reply.status(200).send({
                    status_code: 200,
                    trace_id: traceId,
                    message: "No User Mappings found for the given criteria",
                    user_mappings: [],
                });
            }


            for (const mapping of userMappings) {
                const userId = mapping.user?.user_id;
                if (userId) {
                    const customField = await sequelize.query(
                        getCustomsField(userId, 'user_custom_fields', 'user_id','customfield_id'),
                        {
                            replacements: { id: userId },
                            type: QueryTypes.SELECT,
                        }
                    )as any;

                    mapping.custom_fields = customField[0]?.custom_fields || [];
                    mapping.custom_fields = mapping.custom_fields.map((field: any) => ({
                        ...field,
                        value: parseValue(field.value),
                    }));

                    const masterDataQuery = `
                SELECT
                    JSON_OBJECT(
                        'master_data', JSON_OBJECT(
                            'id', master_data_type.id,
                            'name', master_data_type.name
                        ),
                        'associated_master_data', COALESCE(
                            CASE
                                WHEN user_master_data.is_all_associated = 1 THEN (
                                    SELECT JSON_ARRAYAGG(
                                        JSON_OBJECT('id', md1.id, 'name', md1.name)
                                    )
                                    FROM master_data AS md1
                                    WHERE md1.foundational_data_type_id = master_data_type.id
                                    AND md1.program_id = :program_id
                                    AND md1.is_enabled = 1
                                )
                                ELSE (
                                    SELECT JSON_ARRAYAGG(
                                        JSON_OBJECT('id', md2.id, 'name', md2.name)
                                    )
                                    FROM master_data AS md2
                                    WHERE md2.foundational_data_type_id = master_data_type.id
                                    AND JSON_CONTAINS(user_master_data.associated_master_data, JSON_QUOTE(md2.id), '$')
                                )
                            END,
                            JSON_ARRAY()
                        ),
                        'default_master_data', COALESCE(
                            (
                                SELECT JSON_ARRAYAGG(
                                    JSON_OBJECT('id', md3.id, 'name', md3.name)
                                )
                                FROM master_data AS md3
                                WHERE md3.foundational_data_type_id = master_data_type.id
                                AND JSON_CONTAINS(user_master_data.default_master_data, JSON_QUOTE(md3.id), '$')
                            ),
                            JSON_ARRAY()
                        ),
                        'is_all_associated', user_master_data.is_all_associated = 1
                    ) AS foundational_data
                FROM user_master_data
                LEFT JOIN master_data_type ON user_master_data.master_data = master_data_type.id
                LEFT JOIN user ON user_master_data.user_id = user.user_id
                WHERE user_master_data.user_id = :user_id
                AND user.program_id = :program_id;
                `;

                    const masterDataResults = await sequelize.query(masterDataQuery, {
                        replacements: { user_id: userId, program_id },
                        type: QueryTypes.SELECT,
                    }) as any;



                    const uniqueFoundationalData = Array.from(new Set(masterDataResults.map((result: any) => JSON.stringify(result.foundational_data))))
                        .map((value: unknown) => JSON.parse(value as string));

                    mapping.user.foundational_data = uniqueFoundationalData;
                }
            }

            reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: "User mappings records fetched successfully.",
                user_mappings: [userMappings[userMappings.length - 1]],
            });

        }
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message || error,
        });
    }
};
