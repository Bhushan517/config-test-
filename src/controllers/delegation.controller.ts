import { FastifyRequest, FastifyReply } from 'fastify';
import Delegation from '../models/delegation.model';
import generateCustomUUID from '../utility/genrateTraceId';
import User from '../models/user.model';
import { Op } from 'sequelize';
import { DelegationInterface } from '../interfaces/delegation.interface';

export const createDelegation = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };
  const { delegated_to_user_id, delegated_by_user_id, start_date, end_date, ...delegationData } = request.body as DelegationInterface;

  try {
    const existingConflict = await Delegation.findOne({
      where: {
        delegated_to_user_id,
        delegated_by_user_id,
        is_deleted: false,
        [Op.and]: [
          { start_date: { [Op.lte]: end_date } },
          { end_date: { [Op.gte]: start_date } },
        ],
      },
    });

    if (existingConflict) {
      return reply.status(409).send({
        status_code: 409,
        message: `A delegation already exists for user ${delegated_to_user_id} delegated by ${delegated_by_user_id} within the given date range.`,
        traceId: traceId,
      });
    }

    const currentDate = new Date(); 
    const isEnabled = new Date(start_date) <= currentDate && new Date(end_date) >= currentDate;
    
    const newDelegation: any = await Delegation.create({
      ...delegationData,
      program_id,
      delegated_to_user_id,
      delegated_by_user_id,
      start_date,
      end_date,
      is_enabled: isEnabled,
    });

    return reply.status(201).send({
      status_code: 201,
      id: newDelegation.id,
      message: 'Delegation created successfully',
      traceId: traceId,
    });

  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      traceId: traceId,
      error: error.message,
    });
  }
};


export const getDelegationById = async (
  request: FastifyRequest<{ Params: { program_id: string; id: string } }>,
  reply: FastifyReply
) => {
  const { program_id, id } = request.params;
  const traceId = generateCustomUUID();

  try {
    const delegation = await Delegation.findOne({
      where: {
        id,
        program_id,
      },
      include: [
        {
          model: User,
          as: 'delegate_to_user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: User,
          as: 'delegate_by_user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    if (delegation) {
      reply.status(200).send({
        status_code: 200,
        delegation,
        message: 'Delegation retrieved successfully',
        traceId: traceId,
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'Delegation not found for the given program',
        traceId: traceId,
      });
    }
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      traceId: traceId,
      error: error.message,
    });
  }
};

export const updateDelegationById = async (
  request: FastifyRequest<{ Params: { program_id: string; id: string }; Body: DelegationInterface }>,
  reply: FastifyReply
) => {
  const { program_id, id } = request.params;
  const updates = request.body as DelegationInterface;
  const traceId = generateCustomUUID();

  try {
    const [updatedCount] = await Delegation.update(updates, {
      where: {
        id,
        program_id,
      },
    });

    if (updatedCount > 0) {
      reply.status(200).send({
        status_code: 200,
        message: 'Delegation updated successfully',
        traceId: traceId,
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'Delegation not found for the given program',
        traceId: traceId,
      });
    }
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      traceId: traceId,
      error: error.message,
    });
  }
};


export const deleteDelegationById = async (
  request: FastifyRequest<{ Params: { program_id: string; id: string } }>,
  reply: FastifyReply
) => {
  const { program_id, id } = request.params;
  const traceId = generateCustomUUID();
  try {
    const delegation = await Delegation.findOne({
      where: {
        id,
        program_id,
      },
    });
    if (delegation) {
      await delegation.update({
        is_enabled: false,
        is_deleted: true,
      });
      reply.status(200).send({
        status_code: 200,
        message: 'Delegation deleted successfully',
        traceId: traceId,
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'Delegation not found for the given program',
        traceId: traceId,
      });
    }
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      traceId: traceId,
      error: error.message,
    });
  }
};

export const getDelegationsByCriteria = async (request: FastifyRequest, reply: FastifyReply) => {
  const { created_by, program_id } = request.params as { created_by: string; program_id: string };
  const { page = 1, limit = 10, sort_by = "created_on", sort_order = "desc" } = request.query as any;

  const traceId = generateCustomUUID();

  try {
    console.log(`[${traceId}] Fetching delegations for created_by: ${created_by}, program_id: ${program_id}...`);

    if (!created_by || !program_id) {
      return reply.status(400).send({
        status_code: 400,
        message: "Both created_by and program_id are required in the path parameters.",
        traceId: traceId,
      });
    }

    const offset = (page - 1) * limit;

    const { rows: delegations, count: total } = await Delegation.findAndCountAll({
      where: {
        created_by,
        program_id,
        is_deleted: false,
      },
      order: [[sort_by, sort_order.toUpperCase()]],
      limit,
      offset,
    });

    return reply.status(200).send({
      status_code: 200,
      message: "Delegations fetched successfully",
      traceId: traceId,
      data: {
        delegations,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error: any) {
    console.error(`[${traceId}] Error: ${error.message}`);

    return reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      traceId: traceId,
      error: error.message,
    });
  }
};
