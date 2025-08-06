import { FastifyRequest, FastifyReply } from "fastify";
import { VendorDocumentGroup } from "../interfaces/vendor-document-group.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op, QueryTypes } from "sequelize";
import { baseSearch } from "../utility/baseService";
import vendordocumentgroupModel from "../models/vendor-document-group.model";
import vendorComplianceDocumentModel from "../models/vendor-compliance-document.model";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { sequelize } from "../config/instance";
import { vendorDocumentGroupFilterQuery } from "../utility/queries";

export async function createVendordocumentsgroup(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const vendorDocumentsGroup = request.body as VendorDocumentGroup;
    const { required_documents } = vendorDocumentsGroup;
    const traceId = generateCustomUUID();
     const user=request?.user;
    const userId=user?.sub;
    try {
        const existingDocument = await vendordocumentgroupModel.findOne({
            where: {
                name: vendorDocumentsGroup.name,
                program_id,
            },
        });

        if (existingDocument) {
            return reply.status(409).send({
                status_code: 409,
                message: 'Vendor document group name already exists. Please use a different name.',
                trace_id: traceId,
            });
        }
        const total_documents = Array.isArray(required_documents) ? required_documents.length : 0;

        const item = await vendordocumentgroupModel.create({
            ...vendorDocumentsGroup, total_documents, created_by: userId,
            updated_by: userId,
        });

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: request.body,
                eventname: "creating vendor documents group",
                status: "success",
                description: `Creating vendor documents group for ${program_id}`,
                level: 'info',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendordocumentgroupModel
        );

        reply.status(201).send({
            status_code: 201,
            message: 'Vendor document group created successfully',
            vendor_documents_group_id: item.id,
            trace_id: traceId
        });

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: request.body,
                eventname: "created vendor documents group",
                status: "success",
                description: `Created vendor documents group for ${program_id} successfully: ${item.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendordocumentgroupModel
        );
    } catch (error) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: request.body,
                eventname: "creating vendor documents group",
                status: "error",
                description: `Error creating vendor documents group for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendordocumentgroupModel
        );

        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            error,
            trace_id: traceId,
        });
    }
}

export async function getVendorDocumentsGroupByIdAndDoc(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { id, program_id, required_documents } = request.params as { id: string; program_id: string; required_documents: string };

        const query: any = {
            where: {
                id,
                program_id,
                is_deleted: false
            },
            attributes: { exclude: ["ref_id", "entity_ref", "code", "program_id", "created_on"] }
        };

        if (required_documents) {
            query.where.required_documents = required_documents;
        }
        const vendorDocumentsGroup = await vendordocumentgroupModel.findOne(query);

        if (vendorDocumentsGroup) {
            reply.status(200).send({
                status_code: 200,
                message: "Vendor documents group found",
                vendorDocumentsGroup,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({ status_code: 200, message: "Vendor documents group not found", trace_id: traceId });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: "An error occurred while fetching vendor documents group.",
            error,
            trace_id: traceId,
        });
    }
}

export async function getVendordocumentsgroup(
    request: FastifyRequest<{ Params: VendorDocumentGroup; Querystring: VendorDocumentGroup }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const params = request.params as VendorDocumentGroup;
        const query = request.query as VendorDocumentGroup | any;

        const page = parseInt(query.page ?? "1");
        const limit = parseInt(query.limit ?? "10");
        const offset = (page - 1) * limit;
        query.page && delete query.page;
        query.limit && delete query.limit;
        query.is_enabled = true;

        const searchConditions: any = {};
        if (query.name) {
            searchConditions.name = { [Op.like]: `%${query.name}%` };
        }
        if (query.entity_ref) {
            searchConditions.entity_ref = { [Op.like]: `%${query.entity_ref}%` };
        }

        const count = await vendordocumentgroupModel.count({
            where: {
                ...query,
                program_id: params.program_id,
                ...searchConditions,
                is_deleted: false,
            },
        });

        const vendorDocumentsGroup = await vendordocumentgroupModel.findAll({
            where: {
                ...query,
                program_id: params.program_id,
                ...searchConditions,
                is_deleted: false,
            },
            attributes: { exclude: ["ref_id", "program_id", "updated_by", "created_by"] },
            limit: limit,
            order: [["created_on", "DESC"]],
            offset: offset,
        });

        if (vendorDocumentsGroup.length === 0) {
            return reply.status(200).send({ status_code: 200, message: "Vendor documents group not found", vendorDocumentsGroup: [], trace_id: traceId });
        }

        const vendorDocumentsGroupWithCount = vendorDocumentsGroup.map(group => {
            return {
                ...group.toJSON(),
                total_documents: group.required_documents.length,
            };
        });

        reply.status(200).send({
            status_code: 200,
            message: "Vendor documents group found",
            items_per_page: limit,
            total_records: count,
            vendorDocumentsGroup: vendorDocumentsGroupWithCount,
            trace_id: traceId,
        });
    } catch (error) {
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server error",
            error: error,
            trace_id: traceId,
        });
    }
}

export async function getVendordocumentsgroupId(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const vendorDocumentsGroup = await vendordocumentgroupModel.findOne(
            {
                where: { program_id, id }
            }
        );

        if (!vendorDocumentsGroup) {
            return reply.status(200).send({
                status_code: 200,
                message: "Vendor documents group not found",
                vendor_documents_group: [],
                trace_id: traceId
            });
        }

        const required_documents = await vendorComplianceDocumentModel.findAll({
            where: { id: vendorDocumentsGroup?.required_documents, is_enabled: true },
            attributes: ['id', 'name']
        });

        reply.status(201).send({
            status_code: 201,
            message: "Vendor documents group found",
            vendorDocumentsGroup: {
                ...vendorDocumentsGroup.dataValues,
                required_documents
            },
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function updateVendordocumentsgroup(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id, id } = request.params as { id: string; program_id: string };
    const documentGroupData = request.body as Partial<VendorDocumentGroup>;
    const { required_documents, name } = documentGroupData;
    const traceId = generateCustomUUID();
    const user=request?.user;
    const userId=user?.sub;
    try {
        const documentGroup = await vendordocumentgroupModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
        });

        if (!documentGroup) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Document group not found',
                trace_id: traceId,
            });
        }

        if (name) {
            const existingGroupWithName = await vendordocumentgroupModel.findOne({
                where: {
                    name,
                    program_id,
                    is_deleted: false,
                    id: { [Op.ne]: id },
                },
            });

            if (existingGroupWithName) {
                return reply.status(400).send({
                    status_code: 400,
                    message: 'Vendor document group name already exists. Please use a different name.',
                    trace_id: traceId,
                });
            }
        }

        let total_documents = documentGroup.total_documents;
        if (Array.isArray(required_documents)) {
            total_documents = required_documents.length;
        }

        await documentGroup.update({
            ...documentGroupData,
            total_documents,
            updated_by: userId,
            updated_on: Date.now()
        });

        return reply.status(200).send({
            status_code: 200,
            message: 'Document group updated successfully',
            trace_id: traceId,
        });
    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
        });
    }
}

export async function deleteVendordocumentsgroup(request: FastifyRequest, reply: FastifyReply) {
     const user=request?.user;
    const userId=user?.sub;
    const traceId = generateCustomUUID();
    try {
        const { id, program_id } = request.params as { id: string; program_id: string };
        const [numRowsDeleted] = await vendordocumentgroupModel.update({
            is_enabled: false,
            updated_on: Date.now(),
            is_deleted: true
        },
            { where: { id, program_id, updated_by: userId } }
        );

        if (numRowsDeleted > 0) {
            reply.status(204).send({
                status_code: 204,
                message: 'Document group deleted successfully',
                vendor_documents_group_id: id,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: "Vendor documents group not found",
                vendor_documents_group: [],
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
}

export async function getAllVendorCompDocummentGroupByProgramId(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['program_id', 'id', 'is_enabled', 'description', 'total_documents', 'name'];
    const responseFields = ['id', 'name', 'description', 'total_documents', 'updated_on', 'is_enabled', 'program_id'];
    return baseSearch(request, reply, vendordocumentgroupModel, searchFields, responseFields);
}

export async function vendorDocumentGroupFilter(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const { id, name, description, is_enabled, updated_on, page, limit } = request.body as { id: string; name: string; description: string; is_enabled: string; updated_on: any; page: string; limit: string };

        const isEnabledFilter = typeof is_enabled === 'string' ? is_enabled === 'true' : is_enabled;
        const pageNumber = parseInt(page ?? '1', 10);
        const limitNumber = parseInt(limit ?? '10', 10);
        const offset = (pageNumber - 1) * limitNumber;

        const hasUpdatedOnFilter = Array.isArray(updated_on) && updated_on.length > 0;
        let updatedOnStart: any = undefined;
        let updatedOnEnd: any = undefined;

        if (hasUpdatedOnFilter) {
            const startDate = new Date(updated_on[0]);
            updatedOnStart = startDate.setHours(0, 0, 0, 0);
            updatedOnEnd = (updated_on.length === 1 || updated_on[1] === 0)
                ? startDate.setHours(23, 59, 59, 999)
                : updated_on[1];
        }

        const query = vendorDocumentGroupFilterQuery(
            Boolean(id),
            Boolean(name),
            Boolean(description),
            isEnabledFilter !== undefined,
            hasUpdatedOnFilter
        );

        const replacements: Record<string, any> = {
            program_id,
            id,
            name: name ? `%${name}%` : undefined,
            description: description ? `%${description}%` : undefined,
            limit: limitNumber,
            offset,
            is_enabled: isEnabledFilter,
            updated_on_start: updatedOnStart,
            updated_on_end: updatedOnEnd,
        };

        const data = await sequelize.query<{ total_count: any }>(query, {
            replacements,
            type: QueryTypes.SELECT,
        });

        const totalRecords = data.length > 0 ? data[0].total_count : 0;

        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: data.length > 0 ? 'Vendor document droups fetched successfully.' : 'No records found.',
            total_records: totalRecords,
            page: pageNumber,
            limit: limitNumber,
            vendor_documents_group: data,
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
}