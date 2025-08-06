import { FastifyRequest, FastifyReply } from 'fastify';
import generateCustomUUID from '../utility/genrateTraceId';
import { decodeToken } from '../middlewares/verifyToken';
import { Op, QueryTypes } from 'sequelize';
import SowTemplateModel from '../models/sow_template.model';
import SowTemplateHierarchyModel from '../models/sow_template_hierarchy.model';

import { sequelize } from '../config/instance';
import { getSowTemplateByIdQuery, getSowTemplatesCountQuery, getSowTemplatesQuery } from '../repositories/sow-template.repository';
import { SowTemplate } from '../interfaces/sow_template.interface';
import SOWTemplateMasterDataModel from '../models/sow-templare-master-data.model';
import SowTemplateCustomField from '../models/sow-template-custom-flied.model';
import { getCustomsField } from '../utility/get-custom-field';
import { getMasterData } from '../utility/get-master-data';
import { parseValue } from '../utility/parse-value';

export async function createSowTemplate(
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) {
    const program_id = request.params.program_id;
    const sowTemplate = request.body as SowTemplate;
    const traceId = generateCustomUUID();
    const entityId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub;
    const sequelize = SowTemplateModel.sequelize!;
    const transaction = await sequelize.transaction();
    try {
        const existingSowTemplate = await SowTemplateModel.findOne({
            where: {
                latest: true,
                program_id: program_id,
                template_title: sowTemplate.template_title,
                is_deleted: false,
            }
        });

        if (existingSowTemplate) {
            return reply.status(400).send({
                status_code: 400,
                trace_id: traceId,
                message: "SOW Template Title already exists",
            });
        }

        const item = await SowTemplateModel.create({
            ...sowTemplate,
            entity_id: entityId,
            program_id,
            latest: true,
            created_by: userId,
            updated_by: userId,
        }, { transaction });
        if (Array.isArray(sowTemplate.hierarchy) && sowTemplate.hierarchy.length > 0) {
            for (const hierarchyId of sowTemplate.hierarchy) {
                await SowTemplateHierarchyModel.create({
                    sow_template_id: item.id,
                    hierarchy_id: hierarchyId,
                    created_by: userId,
                    updated_by: userId,
                }, { transaction });
            }
        }

        if (Array.isArray(sowTemplate.master_date_type) && sowTemplate.master_date_type.length > 0) {
            for (const master of sowTemplate.master_date_type) {
                await SOWTemplateMasterDataModel.create({
                    sow_temp_id: item.id,
                    master_data_type: master.master_data_type,
                    master_data: master.master_data,
                    is_deleted: false,
                    is_enabled: true,
                    created_by: userId,
                    updated_by: userId,
                    created_on: Date.now(),
                    updated_on: Date.now(),
                }, { transaction });
            }
        }

        if (Array.isArray(sowTemplate.custom_fields) && sowTemplate.custom_fields.length > 0) {
            for (const field of sowTemplate.custom_fields) {
                await SowTemplateCustomField.create({
                    custom_field_id: field.id,
                    value: field.value,
                    sow_temp_id: item.id,
                    is_deleted: false,
                    is_enabled: true,
                    created_by: userId,
                    updated_by: userId,
                    created_on: Date.now(),
                    updated_on: Date.now(),
                }, { transaction });
            }
        }


        await transaction.commit();
        reply.status(201).send({
            status_code: 201,
            trace_id: traceId,
            message: "SOW template created successfully.",
            sowTemplate: item.id,
        });
    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}

export const getAllSowTemplate = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const {
            page = 1,
            limit = 10,
            type,
            template_title,
            hierarchy_id,
            code,
            updated_on,
            created_on
        } = request.query as {
            page?: string | number;
            limit?: string | number;
            type?: string;
            template_title?: string;
            hierarchy_id?: string;
            code?: string;
            updated_on?: string;
            created_on?: string;
        };

        const pageNumber = parseInt(page as unknown as string, 10);
        const limitNumber = parseInt(limit as unknown as string, 10);
        const offset = (pageNumber - 1) * limitNumber;

        let whereClause = `t.program_id = :program_id AND t.is_deleted = false AND t.latest = true`;
        const replacements: any = { program_id, limit: limitNumber, offset };

        if (type) {
            whereClause += ` AND EXISTS (
                SELECT 1 
                FROM picklistitems p
                WHERE p.id = t.type 
                AND p.id = :type 
            )`;
            replacements.type = type;
        }

        if (template_title) {
            whereClause += ` AND t.template_title LIKE :template_title`;
            replacements.template_title = `%${template_title}%`;
        }

        if (code) {
            whereClause += ` AND t.code LIKE :code`;
            replacements.code = `%${code}%`;
        }

        if (hierarchy_id) {
            const hierarchyIdsArray = hierarchy_id.split(',');
            whereClause += ` AND EXISTS (
                SELECT 1 FROM sow_template_hierarchy h 
                WHERE h.sow_template_id = t.id AND h.hierarchy_id IN (:hierarchyIds)
            )`;
            replacements.hierarchyIds = hierarchyIdsArray;
        }
        if (updated_on) {
            const dateRange = updated_on.split(',');
            if (dateRange.length === 2) {
                const startDate = dateRange[0].trim();
                const endDate = dateRange[1].trim();
                const startTimestamp = isNaN(Number(startDate))
                    ? new Date(startDate).getTime()
                    : Number(startDate);

                const endTimestamp = isNaN(Number(endDate))
                    ? new Date(endDate).getTime()
                    : Number(endDate);

                if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
                    const adjustedEndTimestamp = endTimestamp + (24 * 60 * 60 * 1000 - 1);
                    whereClause += ` AND t.updated_on BETWEEN :updatedStartDate AND :updatedEndDate`;
                    replacements.updatedStartDate = startTimestamp;
                    replacements.updatedEndDate = adjustedEndTimestamp;
                } else {
                    console.warn('Invalid updated_on date format provided');
                }
            }
        }

        if (created_on) {
            const dateRange = created_on.split(',').map(date => date.trim().replace(/\//g, '-'));
            if (dateRange.length === 2) {
                const startTimestamp = new Date(dateRange[0]).getTime();
                const endTimestamp = new Date(dateRange[1]).getTime();
                if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
                    const adjustedEnd = endTimestamp + (24 * 60 * 60 * 1000 - 1);
                    whereClause += ` AND t.created_on BETWEEN :createdStartDate AND :createdEndDate`;
                    replacements.createdStartDate = startTimestamp;
                    replacements.createdEndDate = adjustedEnd;
                }
            } else if (dateRange.length === 1) {
                const dayTimestamp = new Date(dateRange[0]).getTime();
                if (!isNaN(dayTimestamp)) {
                    const dayEnd = dayTimestamp + (24 * 60 * 60 * 1000 - 1);
                    whereClause += ` AND t.created_on BETWEEN :createdStartDate AND :createdEndDate`;
                    replacements.createdStartDate = dayTimestamp;
                    replacements.createdEndDate = dayEnd;
                }
            }
        }

        const templates: any[] = await sequelize.query(getSowTemplatesQuery(whereClause), {
            replacements,
            type: QueryTypes.SELECT,
        });

        const totalResult: any[] = await sequelize.query(getSowTemplatesCountQuery(whereClause), {
            replacements,
            type: QueryTypes.SELECT,
        });
        const totalRecords = totalResult[0]?.total || 0;

        templates.forEach(template => {
            template.hierarchy = JSON.parse(template.hierarchy || '[]');
        });

        const filteredTemplates = templates.map(template => ({
            id: template.id,
            code: template.code,
            program_id: template.program_id,
            type: template.type,
            template_title: template.template_title,
            description: template.description,
            hierarchy: template.hierarchy,
            picklist_items: template.picklist_items,
            created_on: template.created_on,
            updated_on: template.updated_on,
            is_sow_assignment: template.is_sow_assignment,
            is_sow_expense: template.is_sow_assignment,
            is_sow_milestones: template.is_sow_milestones,
            is_sow_payment_req: template.is_sow_payment_req,
            is_sow_schedule_payments: template.is_sow_schedule_payments,
            is_sow_desc_mandatory: template.is_sow_desc_mandatory,
            master_data: typeof template.master_data === 'string'
                ? JSON.parse(template.master_data)
                : (Array.isArray(template.master_data) ? template.master_data : []),
            custom_fields: typeof template.custom_fields === 'string'
                ? JSON.parse(template.custom_fields)
                : (Array.isArray(template.custom_fields) ? template.custom_fields : []),

        }));

        reply.status(200).send({
            status_code: 200,
            message: 'SOW Templates retrieved successfully.',
            items_per_page: limitNumber,
            total_records: totalRecords,
            page: pageNumber,
            limit: limitNumber,
            data: filteredTemplates,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error fetching SOW templates.',
            error: error.message,
            trace_id: traceId,
        });
    }
};

export const getSowTemplate = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string; program_id: string };

        const replacements = { id, program_id };

        const [sowTemplateRecord]: any[] = await sequelize.query(getSowTemplateByIdQuery, {
            replacements,
            type: QueryTypes.SELECT,
        });

        if (!sowTemplateRecord) {
            return reply.status(200).send({
                status_code: 200,
                message: 'SOW Template not found.',
                trace_id: traceId
            });
        }
        const fieldsToBoolean = [
            'is_sow_assignment', 'is_sow_expense', 'is_sow_milestones',
            'is_sow_payment_req', 'is_sow_schedule_payments',
            'is_sow_desc_mandatory', 'is_update_sow_desc',
            'is_req_doc_mandatory', 'is_deleted'
        ];

        fieldsToBoolean.forEach(field => {
            if (sowTemplateRecord[field] !== undefined) {
                sowTemplateRecord[field] = sowTemplateRecord[field] === 1;
            }
        });

        sowTemplateRecord.hierarchy = sowTemplateRecord.hierarchy && typeof sowTemplateRecord.hierarchy === 'string'
            ? JSON.parse(sowTemplateRecord.hierarchy)
            : sowTemplateRecord.hierarchy || [];

        const [customFieldResult] = await sequelize.query(
            getCustomsField(sowTemplateRecord.id, 'sow_template_custom_field', 'sow_temp_id', 'custom_field_id'),
            {
                replacements: { id: sowTemplateRecord.id },
                type: QueryTypes.SELECT,
            }
        ) as any;
        const customFields = customFieldResult?.custom_fields.map(
          (field: any) => ({
            ...field,
            value: parseValue(field.value),
          })
        );

        const [masterDataResult] = await sequelize.query(
            getMasterData('sow_template_master_data', 'sow_temp_id', 'master_data_type', 'master_data', false),
            {
                replacements: { id: sowTemplateRecord.id },
                type: QueryTypes.SELECT,
            }
        ) as any;

        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: 'SOW Template retrieved successfully.',
            data: {
                ...sowTemplateRecord,
                custom_fields: customFields || [],
                master_data: masterDataResult.master_data
            },
        });

    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Error fetching SOW template.',
            error: error.message,
            trace_id: traceId
        });
    }
};

export const updateSowTemplate = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();

    try {
        const { id, program_id } = request.params as { id: string; program_id: string };
        const sowTemplate = request.body as SowTemplate;
        const userId = request.headers['user_id'];

        const existingTemplate = await SowTemplateModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
                latest: true,
            },
            transaction,
        });

        if (!existingTemplate) {
            await transaction.rollback();
            return reply.status(404).send({
                status_code: 404,
                message: 'SOW Template not found.',
                trace_id: traceId,
            });
        }
        const {
            id: _,
            created_by,
            created_on,
            ...updatableFields
        } = sowTemplate;
        await existingTemplate.update(
            {
                ...updatableFields,
                updated_by: userId,
                updated_on: Date.now(),
            },
            { transaction }
        );
        if (Array.isArray(sowTemplate.custom_fields)) {
              const incomingCustomFieldIds = sowTemplate.custom_fields.filter(f => f.id) .map(f => f.id);

             await SowTemplateCustomField.destroy({
                where: {
                 sow_temp_id: id,
                 custom_field_id: {
                 [Op.notIn]: incomingCustomFieldIds,
                 },
                },
                 transaction,
            });
            for (const field of sowTemplate.custom_fields) {
                const { id: custom_field_id, value } = field;
                if (!custom_field_id) continue;
                const [record, created] = await SowTemplateCustomField.findOrCreate({
                    where: {
                        sow_temp_id: id,
                        custom_field_id,
                    },
                    defaults: {
                        value,
                        sow_temp_id: id,
                        custom_field_id,
                        created_by: userId,
                        updated_by: userId,
                        created_on: Date.now(),
                        updated_on: Date.now(),
                    },
                    transaction,
                });
                if (!created) {
                    await record.update(
                        {
                            value,
                            updated_by: userId,
                            updated_on: Date.now(),
                        },
                        { transaction }
                    );
                }
            }
        }
        if (Array.isArray(sowTemplate.hierarchy) && sowTemplate.hierarchy.length > 0) {
            await SowTemplateHierarchyModel.destroy({
                where: { sow_template_id: id },
                transaction,
            });

            for (const hierarchyId of sowTemplate.hierarchy) {
                await SowTemplateHierarchyModel.create({
                    sow_template_id: id,
                    hierarchy_id: hierarchyId,
                    created_by: userId,
                    updated_by: userId,
                },
                    { transaction }
                );
            }
        }
        await transaction.commit();
        return reply.status(200).send({
            status_code: 200,
            message: 'SOW template versioned update successfully.',
            trace_id: traceId,
            data: id,
        });
    } catch (error: any) {
        await transaction.rollback();
        return reply.status(500).send({
            status_code: 500,
            message: 'Error updating SOW template.',
            error: error.message,
            trace_id: traceId,
        });
    }
};

export const deleteSowTemplate = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { id, program_id } = request.params as { id: string; program_id: string };
    try {
        const template = await SowTemplateModel.findOne({ where: { id, program_id, is_deleted: false } });

        if (!template) {
            return reply.status(200).send({ status_code: 200, message: 'SOW Template not found.', trace_id: traceId });
        }

        await template.update({ is_deleted: true });
        reply.status(200).send({ status_code: 200, message: 'SOW Template deleted successfully.', trace_id: traceId });
    } catch (error) {
        reply.status(500).send({ status_code: 500, message: 'Error deleting SOW template.', error, trace_id: traceId });
    }
};



export const getSowTemplateHierarchiesByProgram = async (
    request: FastifyRequest<{ Params: { program_id: string } }>,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;
        const sowTemplates = await SowTemplateModel.findAll({
            where: { program_id, is_deleted: false },
            attributes: ['id'],
        });

        const sowTemplateIds = sowTemplates.map(template => template.id);

        if (!sowTemplateIds.length) {
            return reply.status(200).send({
                status_code: 200,
                message: "No hierarchies found for the given program.",
                trace_id: traceId,
                data: [],
            });
        }
        const query = `
    SELECT COALESCE(
        (SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'id', unique_hierarchies.hierarchy_id,
            'hierarchy_name', unique_hierarchies.name
        ))
        FROM (
            SELECT DISTINCT h.hierarchy_id, hier.name
            FROM sow_template_hierarchy h
            LEFT JOIN hierarchies hier ON h.hierarchy_id = hier.id
            WHERE h.sow_template_id IN (:sowTemplateIds)
        ) AS unique_hierarchies), '[]') AS hierarchy;
`;

        const result = await sequelize.query(query, {
            replacements: { sowTemplateIds },
            type: QueryTypes.SELECT,
        });
        const hierarchiesData = JSON.parse((result[0] as { hierarchy: string }).hierarchy || '[]');
        reply.status(200).send({
            status_code: 200,
            message: "SOW Template Hierarchies fetched successfully",
            trace_id: traceId,
            data: { hierarchy: hierarchiesData },
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: 'Error while fetching SOW Template Hierarchies.',
            error: error.message,
        });
    }
};
