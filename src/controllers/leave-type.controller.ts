
import { FastifyRequest, FastifyReply } from "fastify";
import LeaveTypeModel from "../models/leave-type.model";
import { LeaveTypeInterface } from "../interfaces/leave-type.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { decodeToken } from "../middlewares/verifyToken";
// import { Op } from "sequelize";


const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_NUMBER = 1;
const HTTP_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  CONFLICT: 409,
  SERVER_ERROR: 500
};

function buildResponse(statusCode: number, message: string, data: Record<string, any> = {}) {
  return {
    status_code: statusCode,
    message,
    trace_id: generateCustomUUID(),
    ...data
  };
}

// Authentication helper to avoid duplicated code
async function authenticateUser(request: FastifyRequest): Promise<{ userId: string } | null> {
  const user = request?.user;
  return { userId: user.sub as string };
}

function parsePagination(query: any) {
  const rawPageNumber = parseInt(query.page || DEFAULT_PAGE_NUMBER.toString(), 10);
  const rawPageSize = parseInt(query.limit || DEFAULT_PAGE_SIZE.toString(), 10);
  
  const pageNumber = !isNaN(rawPageNumber) && rawPageNumber > 0 ? 
    rawPageNumber : DEFAULT_PAGE_NUMBER;
    
  const pageSize = !isNaN(rawPageSize) && rawPageSize > 0 ? 
    Math.min(rawPageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
    
  return { pageNumber, pageSize };
}

export async function createLeaveType(request: FastifyRequest, reply: FastifyReply) {
  try {
    const leaveType = request.body as LeaveTypeInterface;
    
    // Validate required fields
    if (!leaveType.name || leaveType.name.trim() === '') {
      return reply.status(HTTP_CODES.BAD_REQUEST).send(
        buildResponse(HTTP_CODES.BAD_REQUEST, "Leave type name is required")
      );
    }
    

    const auth = await authenticateUser(request);
    if (!auth) {
      return reply.status(HTTP_CODES.UNAUTHORIZED).send(
        buildResponse(HTTP_CODES.UNAUTHORIZED, 'Unauthorized - Invalid token or token not found')
      );
    }
    
    const { userId } = auth;
    const trimmedName = leaveType.name.trim();
    
   
    const existingLeaveType = await LeaveTypeModel.findOne({
      where: {
        name: trimmedName
      }
    });
    
    if (existingLeaveType) {
      return reply.status(HTTP_CODES.CONFLICT).send(
        buildResponse(HTTP_CODES.CONFLICT, "Leave type name already exists")
      );
    }
    
    // Create record with sanitized input
    const newLeaveType = await LeaveTypeModel.create({ 
      ...leaveType,
      name: trimmedName, 
      created_by: userId, 
      updated_by: userId 
    });
    
    return reply.status(HTTP_CODES.CREATED).send(
      buildResponse(HTTP_CODES.CREATED, 'Leave type created successfully!', { id: newLeaveType.id })
    );
    
  } catch (error) {
    request.log.error({ err: error }, 'Failed to create leave type');
    return reply.status(HTTP_CODES.SERVER_ERROR).send(
      buildResponse(HTTP_CODES.SERVER_ERROR, 'Internal Server Error')
    );
  }
}

export async function getLeaveTypes(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as Record<string, string>;
      const { pageNumber, pageSize } = parsePagination(query);
  
      const offset = (pageNumber - 1) * pageSize;
  
      const { count, rows: leaveTypes } = await LeaveTypeModel.findAndCountAll({
        order: [["name", "ASC"]],
        limit: pageSize,
        offset,
      });
  
      const totalPages = count > 0 ? Math.ceil(count / pageSize) : 1;
      const message = leaveTypes.length === 0 
        ? "No leave types found" 
        : "Leave types fetched successfully!";
  
      return reply.status(HTTP_CODES.OK).send(
        buildResponse(HTTP_CODES.OK, message, {
          leave_types: leaveTypes,
          pagination: {
            total_records: count,
            total_pages: totalPages,
            current_page: pageNumber,
            page_size: pageSize,
            has_next: pageNumber < totalPages,
            has_previous: pageNumber > 1,
          },
        })
      );
    } catch (error) {
      request.log.error({ err: error }, 'Failed to fetch leave types');
      return reply.status(HTTP_CODES.SERVER_ERROR).send(
        buildResponse(HTTP_CODES.SERVER_ERROR, "Failed to fetch leave types")
      );
    }
  }


