import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import VendorComplianceReqDocMappingModel from "../models/vendor-compliance-req-doc-mapping.model";
import {VendorComplianceReqDocMappingInterface } from '../interfaces/vendor-compliance-req-doc-mapping.interface';
import { baseSearch } from "../utility/baseService";
import { decodeToken } from "../middlewares/verifyToken";
import { logger } from '../utility/loggerService';
import {runVendorDocExpiryJob} from "../utility/cronJob";
runVendorDocExpiryJob();

export async function createVendorComplianceReqDoc(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const vendorComplianceMapping = request.body as VendorComplianceReqDocMappingInterface;
    const user=request?.user;
    const userId=user?.sub;
    logger(
        {
          trace_id:traceId,
          actor: {
            user_name: user?.preferred_username,
            user_id: userId,
          },
          data: request.body,
          eventname: "create Vendor compliance req doc mapping",
          status: "success",
          description: `Creating  Vendor compliance req doc mapping `,
          level: 'info',
          action: request.method,
          url: request.url,
          is_deleted: false
        },
        VendorComplianceReqDocMappingModel
      );
    
    try {
        const vendorComplianceMappingData: any = await VendorComplianceReqDocMappingModel.create({
            ...vendorComplianceMapping,
            created_by: userId,
            updated_by: userId,
        });
        logger(
            {
              traceId,
              actor: {
                user_name: user?.preferred_username,
                user_id: userId,
              },
              data: request.body,
              eventname: "creating Vendor compliance req doc mapping",
              status: "success",
              description: `Vendor compliance req doc mapping created successfully`,
              level: "success",
              action: request.method,
              url: request.url,
              is_deleted: false,
            },
            VendorComplianceReqDocMappingModel
          );
 
        return reply.status(201).send({
            status_code: 201,
            message: 'Vendor compliance req doc mapping created successfully',
            vendor_compliance_mapping: vendorComplianceMappingData.id,
            trace_id:traceId
        });
    } catch (error:any) {
        logger(
            {
              traceId,
              actor: {
                user_name: user?.preferred_username,
                user_id: userId,
              },
              data: request.body,
              eventname: "create Vendor compliance req doc mapping",
              status: "error",
              description: `Error creating Vendor compliance req doc mapping`,
              level: "error",
              action: request.method,
              url: request.url,
              is_deleted: false,
            },
            VendorComplianceReqDocMappingModel
          );
        return reply.status(500).send({
            status_code: 500,
            trace_id:traceId,
            message: 'Failed To Create Vendor Labour Categories',
            error:error.message
        });
    }
}

export async function getAllVendorComplianceReqDoc(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['id','program_id','vendor_id','document_group_id', 'is_enabled','updated_on'];
    const responseFields = ['id','program_id','vendor_id','document_group_id', 'is_enabled','updated_on'];
    return baseSearch(request, reply, VendorComplianceReqDocMappingModel, searchFields, responseFields);
}

export async function getVendorComplianceReqDocById(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params;
        const vendorComplianceMapping = await VendorComplianceReqDocMappingModel.findOne({ where: { program_id, id, is_deleted: false } });
        if (vendorComplianceMapping) {
            reply.status(200).send({
                status_code: 200,
                message: 'Vendor compliance req doc mapping fetched successfully.',
                trace_id:traceId,
                vendor_compliance_mapping :vendorComplianceMapping,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Vendor compliance req doc mapping not found.',
                trace_id:traceId,
                vendor_compliance_mapping : [],
            });
        }
    } catch (error:any) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching vendor compliance req doc mapping .',
            trace_id:traceId,
            error:error.message
        });
    }
}
 

export async function updateVendorComplianceReqDoc(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const { program_id, id } = request.params;
    const traceId = generateCustomUUID();
    const user=request?.user;
    const userId=user?.sub;
    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: userId,
            },
            data: request.body,
            eventname: "updating Vendor compliance req doc mapping",
            status: "info",
            description: `Updating Vendor compliance req doc mapping with ID ${id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false
        },
        VendorComplianceReqDocMappingModel
    );
    try {
        const [updatedCount] = await VendorComplianceReqDocMappingModel.update(request.body as VendorComplianceReqDocMappingInterface, {
            where: { program_id, id, is_deleted: false,updated_by:userId },
        });
        if (updatedCount > 0) {
            reply.send({
                status_code: 201,
                message: 'Vendor compliance req doc mapping updated successfully.',
                trace_id:traceId,
            });
            logger(
                {
                    trace_id: traceId,
                    actor: {
                        user_name: user?.preferred_username,
                        user_id: userId,
                    },
                    data: request.body,
                    eventname: "update Vendor compliance req doc mapping",
                    status: "success",
                    description: `Successfully updated Vendor compliance req doc mapping with ID ${id}`,
                    level: 'success',
                    action: request.method,
                    url: request.url,
                    entity_id: program_id,
                    is_deleted: false
                },
                VendorComplianceReqDocMappingModel
            );
        } else {
            reply.status(200).send({
                status_code: 200,
                trace_id:traceId,
                message: 'Vendor compliance req doc mapping not found',
                vendor_compliance_mapping : [],
            });
            logger(
                {
                    trace_id: traceId,
                    actor: {
                        user_name: user?.preferred_username,
                        user_id: userId,
                    },
                    data: request.body,
                    eventname: "update Vendor compliance req doc mapping",
                    status: "warning",
                    description: `Vendor compliance req doc mapping with ID ${id} not found`,
                    level: 'warning',
                    action: request.method,
                    url: request.url,
                    entity_id: program_id,
                    is_deleted: false
                },
                VendorComplianceReqDocMappingModel
            );
        }
    } catch (error) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId,
                },
                data: request.body,
                eventname: "update Vendor compliance req doc mapping",
                status: "error",
                description: `Error updating Vendor compliance req doc mapping with ID ${id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            VendorComplianceReqDocMappingModel
        );
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server error',
            trace_id:traceId,
        });
    }
}
 
export async function deleteVendorComplianceReqDoc(
    request: FastifyRequest<{ Params: { program_id: string, id: string } }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const user=request?.user;
    const userId=user?.sub
    try {
        const { program_id, id } = request.params;
        const vendorComplianceMapping = await VendorComplianceReqDocMappingModel.findOne({
            where: { program_id, id, is_deleted: false },
        });
        if (vendorComplianceMapping) {
            await VendorComplianceReqDocMappingModel.update(
                { is_deleted: true, is_enabled: false,updated_by:userId, },
                { where: { program_id, id } }
            );
            reply.status(204).send({
                status_code: 204,
                message: 'Vendor compliance req doc mapping deleted successfully.',
                trace_id:traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Vendor compliance req doc mapping not found',
                trace_id:traceId,
                vendor_compliance_mapping : [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting vendor compliance req doc mapping.',
            trace_id:traceId,
        });
    }
}
