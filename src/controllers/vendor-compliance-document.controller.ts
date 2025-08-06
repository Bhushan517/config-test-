import VendorComplianceDocumentModel from "../models/vendor-compliance-document.model";
import { VendorComplianceDocumentInterface } from "../interfaces/vendor-compliance-document.interface";
import { FastifyReply, FastifyRequest } from "fastify";
import { baseSearch, BaseService } from "../utility/baseService";
import generateCustomUUID from "../utility/genrateTraceId";
import WorkLocationModel from "../models/work-location.model";
import { logger } from "../utility/loggerService";
import { decodeToken } from "../middlewares/verifyToken";
import VendorComplianceReqDocMappingModel from "../models/vendor-compliance-req-doc-mapping.model";
import { vendorComplianceDocumentFilterQuery } from "../utility/queries";
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
const baseService = new BaseService(VendorComplianceDocumentModel);

const vendorComplianceDocumentService = new BaseService(VendorComplianceDocumentModel);

export async function createVendorComplianceDocument(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { program_id } = request.params as { program_id: string };
  const vendor_comp_doc = request.body as VendorComplianceDocumentInterface;

  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub
  logger(
    {
      traceId,
      actor: {
        user_name: user?.preferred_username,
        user_id: userId,
      },
      data: request.body,
      eventname: "create vendor compliance document",
      status: "error",
      description: `Program id is required for creating vendor compliance document`,
      level: "error",
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false,
    },
    VendorComplianceDocumentModel
  );

  if (!program_id) {
    return reply.status(400).send({
      status_code: 400,
      message: "Program id is required.",
      trace_id: traceId,
    });
  }

  try {
    const existingDocument = await VendorComplianceDocumentModel.findOne({
      where: {
        program_id,
        name: vendor_comp_doc.name,
        is_deleted: false,
      },
    });

    if (existingDocument) {
      return reply.status(409).send({
        status_code: 409,
        message: "A document with the same name already exists for this program.",
        trace_id: traceId,
      });
    }

    const vendor_comp_document = await VendorComplianceDocumentModel.create({
      ...vendor_comp_doc,
      program_id,
      created_by: userId,
      updated_by: userId,
    });
    logger(
      {
        traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating vendor compliance document",
        status: "success",
        description: `Vendor compliance document created successfully for ${program_id}: ${vendor_comp_document?.id}`,
        level: "success",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      VendorComplianceDocumentModel
    );

    reply.status(201).send({
      status_code: 201,
      trace_id: traceId,
      message: "Vendor compliance documents created successfully",
      compliance_documents: vendor_comp_document?.id,
    });
  } catch (error: any) {
    logger(
      {
        traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create vendor compliance document",
        status: "error",
        description: `Error creating vendor compliance document for ${program_id}`,
        level: "error",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      VendorComplianceDocumentModel
    );

    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
    });
  }
}

export async function vendorComplianceDocumentById(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { program_id, id } = request.params as { program_id: string; id: string };
  const traceId = generateCustomUUID();

  try {

    const searchFields = { program_id, id };
    const vendorCompDocument = await vendorComplianceDocumentService.getByIdAndPopulate(
      request,
      searchFields
    );

    if (!vendorCompDocument) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "Compliance document not found",
        compliance_documents: [],
      });
    }

    const vendorCompDocumentData = vendorCompDocument.toJSON();
    const workLocationIds = vendorCompDocumentData.work_locations || [];

    const workLocations = await WorkLocationModel.findAll({
      where: { id: workLocationIds },
      attributes: ["id", "name"],
    });

    const workLocationData = workLocations.map((location) => ({
      id: location.id,
      name: location.name,
    }));

    const response = {
      ...vendorCompDocumentData,
      work_locations: workLocationData,
    };

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "Compliance document retrieved successfully",
      compliance_documents: response,
    });
  } catch (error) {
    console.error("Error fetching compliance document:", error);
    return reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching compliance document",
      trace_id: traceId,
    });
  }
}

export async function updateVendorComplianceDocumentById(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id, program_id } = request.params as { id: string; program_id: string };
  const payload = request.body as any;
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user.sub;

  try {
    const existingDocument = await vendorComplianceDocumentService.getByIdAndPopulate(request, { program_id, id });
    if (!existingDocument) {
      return reply.status(404).send({
        status_code: 404,
        message: 'Vendor compliance document not found.',
        trace_id: traceId,
      });
    }
    if (payload.name) {
      const duplicate = await VendorComplianceDocumentModel.findOne({
        where: {
          program_id,
          name: payload.name,
          id: { [Op.ne]: id },
          is_deleted: false,
        },
      });

      if (duplicate) {
        return reply.status(409).send({
          status_code: 409,
          message: 'A document with the same name already exists for this program.',
          trace_id: traceId,
        });
      }
    }
    await VendorComplianceDocumentModel.update(
      { ...payload, updated_by: userId, updated_on: Date.now() },
      { where: { id, is_deleted: false, } }
    );

    return reply.status(200).send({
      status_code: 200,
      message: 'Vendor compliance document updated successfully.',
      trace_id: traceId,
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

export async function deleteVendorComplianceDocumentById(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub
  try {
    const { program_id, id } = request.params as { program_id: string; id: string };

    const deletedCount = await vendorComplianceDocumentService.deleteById({ program_id, id, updated_by: userId, });

    if (deletedCount > 0) {
      reply.status(200).send({
        status_code: 200,
        message: "Vendor compliance documents deleted successfully",
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "Vendor compliance documents not found",
        trace_id: traceId,
      });
    }
  } catch (error) {
    console.error("Error deleting vendor compliance documents:", error);
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while deleting vendor compliance documents",
      trace_id: traceId,
    });
  }
}

export async function getAllVendorCompDocummentByProgramId(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { program_id } = request.params as { program_id: string };
  const { page, limit, name, is_enabled, document_details, updated_on } = request.query as { page: string; limit: string; name: string; is_enabled: string; document_details: string; updated_on: string };

  const query = {
    program_id,
    name,
    is_enabled,
    document_details,
    updated_on
  };

  const responseFields = ['id', 'name', 'document_details', 'updated_on', 'is_enabled', 'program_id'];
  const traceId = generateCustomUUID();
  try {
    const paginationOptions: any = {};
    if (page) paginationOptions.page = Number(page);
    if (limit) paginationOptions.limit = Number(limit);

    const result = await baseService.getAllByCriteriaPopulate(
      request,
      query,
      paginationOptions,
      responseFields
    );

    if (result.count > 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "Vendor Compliance Documents Retrieved Successfully",
        trace_id: traceId,
        total_records: result.count,
        ...(page && limit && { page: Number(page), limit: Number(limit) }),
        compliance_documents: result.rows
      });
    } else {
      return reply.status(200).send({ status_code: 200, message: "No records found", trace_id: traceId });
    }
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error.message
    });
  }
}

export async function vendorComplianceDocumentFilter(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string }
      ;
    const { id, name, act, document_number, is_enabled, updated_on, page, limit } = request.body as { id: string; name: string; act: string; document_number: string; is_enabled: string; updated_on: string; page: string; limit: string };

    const isEnabledFilter =
      typeof is_enabled === 'string' ? is_enabled === 'true' : is_enabled;

    const pageNumber = parseInt(page ?? '1', 10);
    const limitNumber = parseInt(limit ?? '10', 10);
    const offset = (pageNumber - 1) * limitNumber;

    const hasUpdatedOnFilter = Array.isArray(updated_on) && updated_on.length > 0;
    let updatedOnStart: number | undefined = undefined;
    let updatedOnEnd: number | undefined = undefined;

    if (hasUpdatedOnFilter) {
      const startDate = new Date(updated_on[0]);
      updatedOnStart = startDate.setHours(0, 0, 0, 0);

      if (updated_on.length === 1 || updated_on[1] === 0) {
        updatedOnEnd = new Date(updated_on[0]).setHours(23, 59, 59, 999);
      } else {
        updatedOnEnd = new Date(updated_on[1]).setHours(23, 59, 59, 999);
      }
    }

    const query = vendorComplianceDocumentFilterQuery(
      Boolean(id),
      Boolean(name),
      Boolean(act),
      Boolean(document_number),
      isEnabledFilter !== undefined,
      Boolean(hasUpdatedOnFilter)
    );

    const replacements: Record<string, any> = {
      program_id,
      id,
      name: name ? `%${name}%` : undefined,
      act,
      document_number,
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
      message: data.length > 0 ? 'Vendor Compliance Documents fetched successfully.' : 'No records found.',
      total_records: totalRecords,
      page: pageNumber,
      limit: limitNumber,
      compliance_documents: data,
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