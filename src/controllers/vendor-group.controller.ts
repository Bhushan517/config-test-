
import { FastifyRequest, FastifyReply } from 'fastify';
import { vendorGroupInterface } from '../interfaces/vendor-group.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op, QueryTypes } from 'sequelize';
import { baseSearch } from '../utility/baseService';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import VendorGroup from '../models/vendor-group.model';
import { ProgramVendor } from '../models/program-vendor.model';
import { sequelize } from '../config/instance';
import { vendorGroupFilterQuery } from '../utility/queries';

export const createVendorGroup = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { program_id } = request.params as { program_id: string };
  const vendorGroup = request.body as vendorGroupInterface;
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub;
  if (!vendorGroup.vendor_group_name) {
    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create vendor group",
        status: "error",
        description: `Error creating vendor group for ${program_id}: vendor_group_name is required`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      VendorGroup
    );

    return reply.status(400).send({
      status_code: 400,
      message: 'Vendor group name is required.',
      trace_id: traceId
    });
  }

  try {
    const [createdVendorGroup, created] = await VendorGroup.findOrCreate({

      where: { vendor_group_name: vendorGroup.vendor_group_name, program_id },
      defaults: { ...vendorGroup, program_id, created_by: userId, updated_by: userId, },
    });

    if (!created) {
      return reply.status(409).send({
        status_code: 409,
        message: 'Vendor group name already exists. Please use a different name.',
        trace_id: traceId,
      });
    }

    const vendorIdsToUpdate = vendorGroup.vendors.filter((id: any) => id);

    if (vendorIdsToUpdate.length > 0) {
      await ProgramVendor.update(
        { vendor_group_id: createdVendorGroup.id, updated_by: userId, },
        { where: { id: vendorIdsToUpdate, program_id } }
      );
    }

    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create vendor group",
        status: "success",
        description: `Vendor group created successfully for ${program_id}: ${createdVendorGroup.id}`,
        level: 'success',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      VendorGroup
    );

    return reply.status(201).send({
      status_code: 201,
      trace_id: traceId,
      message: 'Vendor group created successfully.',
      vendor_group_id: createdVendorGroup.id,
    });
  } catch (error: any) {
    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create vendor group",
        status: "error",
        description: `Error creating vendor group for ${program_id}`,
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false
      },
      VendorGroup
    );

    return reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while creating Vendor Group.',
      trace_id: traceId,
      error: (error as Error).message,
    });
  }
};

export async function getVendorGroups(request: FastifyRequest, reply: FastifyReply) {
  const searchFields = ['id', 'vendor_group_name', 'description', 'is_enabled', 'program_id'];
  const responseFields = ['id', 'vendor_group_name', 'is_enabled', 'description', 'updated_on', 'program_id'];
  return baseSearch(request, reply, VendorGroup, searchFields, responseFields);
}

export async function getVendorGroupById(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id, program_id } = request.params as { id: string; program_id: string };
  const traceId = generateCustomUUID();
  try {
    const vendorGroup = await VendorGroup.findOne({
      where: { id, program_id, is_deleted: false }
    });

    if (!vendorGroup) {
      return reply.status(200).send({
        status_code: 200,
        message: 'Vendor Group not found.',
        trace_id: traceId,
      });
    }
    const vendorIds = vendorGroup.vendors || [];
    const detailedVendors = await ProgramVendor.findAll({
      where: { id: vendorIds },
      attributes: ['id', 'vendor_name', 'display_name'],
    });

    return reply.status(200).send({
      status_code: 200,
      message: 'Vendor Group found.',
      vendor_group: {
        ...vendorGroup.toJSON(),
        vendors: detailedVendors.map(vendor => vendor.toJSON()),
      },
      trace_id: traceId,
    });
  } catch (error) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: 'Internal Server Error',
      error: (error as Error).message,
    });
  }
}

export async function updateVendorGroup(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as { id: string; program_id: string };
  const data: Partial<vendorGroupInterface> = request.body as Partial<vendorGroupInterface>;
  const traceId = generateCustomUUID();
  const userId = request?.user?.sub;

  const transaction = await sequelize.transaction();

  try {
    if (data.vendor_group_name) {
      const duplicate = await VendorGroup.findOne({
        where: {
          program_id,
          vendor_group_name: data.vendor_group_name,
          id: { [Op.ne]: id },
        },
        transaction,
      });

      if (duplicate) {
        await transaction.rollback();
        return reply.status(409).send({
          status_code: 409,
          message: 'Vendor group name already exists.',
          trace_id: traceId,
        });
      }
    }

    const vendorGroup = await VendorGroup.findOne({
      where: { id, program_id, is_deleted: false },
      transaction,
    });

    if (!vendorGroup) {
      await transaction.rollback();
      return reply.status(404).send({
        status_code: 404,
        message: 'Vendor group not found.',
        trace_id: traceId,
      });
    }

    await vendorGroup.update({ ...data, updated_by: userId }, { transaction });

    if (Array.isArray(data.vendors)) {
      const vendorsToAdd = new Set(data.vendors);

      const allVendors = await ProgramVendor.findAll({
        where: { program_id, is_deleted: false },
        transaction,
      });

      for (const pv of allVendors) {
        let groups: string[] = Array.isArray(pv.vendor_group_id) ? [...pv.vendor_group_id] : [];

        const hasGroup = groups.includes(id);
        const shouldHaveGroup = vendorsToAdd.has(pv.id);

        if (shouldHaveGroup && !hasGroup) {
          groups.push(id);
        } else if (!shouldHaveGroup && hasGroup) {
          groups = groups.filter(gid => gid !== id);
        } else {
          continue;
        }

        await ProgramVendor.update(
          { vendor_group_id: groups, updated_by: userId },
          { where: { id: pv.id }, transaction }
        );
      }
    }

    await transaction.commit();

    return reply.status(200).send({
      status_code: 200,
      message: 'Vendor group updated successfully.',
      trace_id: traceId,
    });
  } catch (error) {
    await transaction.rollback();
    return reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: (error as Error).message,
    });
  }
}

export const deleteVendorGroup = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id, program_id } = request.params as { id: string; program_id: string };
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub
  try {
    const vendorGroup = await VendorGroup.findOne({ where: { id, program_id } });

    if (vendorGroup) {
      vendorGroup.is_deleted = true;
      vendorGroup.updated_by = userId
      await vendorGroup.save();
      return reply.status(200).send({
        status_code: 200,
        message: 'Vendor Group deleted successfully.',
        trace_id: traceId
      });
    } else {
      return reply.status(200).send({
        status_code: 200,
        message: 'Vendor Group not found.',
        trace_id: traceId,
        vendor_group: []
      });
    }
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: (error as Error).message,
    });
  }
}

export async function vendorGroupFilter(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const { id, vendor_group_name, is_enabled, updated_on, page, limit } = request.body as {
      id: string;
      vendor_group_name: string;
      is_enabled: string | boolean;
      updated_on: any
      page: string;
      limit: string;
    };

    const isEnabledFilter =
      typeof is_enabled === 'string'
        ? is_enabled === 'true' ? 1 : 0
        : is_enabled === true ? 1 : is_enabled === false ? 0 : undefined;

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

    const query = vendorGroupFilterQuery(
      Boolean(id),
      Boolean(vendor_group_name),
      isEnabledFilter !== undefined,
      hasUpdatedOnFilter
    );

    const replacements: Record<string, any> = {
      program_id,
      id,
      vendor_group_name: vendor_group_name ? `%${vendor_group_name}%` : undefined,
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
      message: data.length > 0 ? 'Vendor Groups fetched successfully.' : 'No records found.',
      total_records: totalRecords,
      page: pageNumber,
      limit: limitNumber,
      items: data,
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
