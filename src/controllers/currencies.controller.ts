import { FastifyRequest, FastifyReply } from 'fastify';
import Currencies from '../models/currencies.model';
import currenciesData from '../interfaces/currencies.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { baseSearch } from '../utility/baseService';
import { logger } from '../utility/loggerService';

export async function getCurrencies(request: FastifyRequest, reply: FastifyReply) {
  const searchFields = ['name', 'symbol'];
  const responseFields = ['id', 'name', 'label', 'symbol', 'code'];
  return baseSearch(request, reply, Currencies, searchFields, responseFields);
}

export async function getCurrenciesById(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params as { id: string };
    const currencies = await Currencies.findByPk(id);
    if (currencies) {
      reply.status(200).send({
        status_code: 200,
        message: "Currencies get successfully",
        trace_id: traceId,
        data: currencies
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        currency: [],
        message: 'Currencies not found',
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error
    });
  }
}



export async function createCurrencies(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { name, label, code, symbol } = request.body as currenciesData;

    logger({
      trace_id: traceId,
      actor: {
        user_name: request?.user?.preferred_username,
        user_id: request?.user?.sub,
      },
      data: request.body,
      eventname: "create currencies",
      status: "info",
      description: "Creating a new currency record",
      level: "info",
      action: request.method,
      url: request.url,
      is_deleted: false,
    }, Currencies);

    const newItem = await Currencies.create({
      name,
      label,
      code,
      symbol,
    });

    reply.status(200).send({
      status_code: 200,
      message: "Currencies created successfully",
      trace_id: traceId,
      data: newItem,
    });

    logger({
      trace_id: traceId,
      actor: {
        user_name: request?.user?.preferred_username,
        user_id: request?.user?.sub,
      },
      data: newItem,
      eventname: "create currencies",
      status: "success",
      description: `Currency created successfully: ${newItem.id}`,
      level: "success",
      action: request.method,
      url: request.url,
      is_deleted: false,
    }, Currencies);

  } catch (error) {
    logger({
      trace_id: traceId,
      actor: {
        user_name: request?.user?.preferred_username,
        user_id: request?.user?.sub,
      },
      data: request.body,
      eventname: "create currencies",
      status: "error",
      description: "Error occurred while creating currencies",
      level: "error",
      action: request.method,
      url: request.url,
      is_deleted: false,
    }, Currencies);

    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while creating currencies",
      error,
    });
  }
}


export async function updateCurrencies(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params;
    const { name, label, code, symbol } = request.body as currenciesData;

    logger({
      trace_id: traceId,
      actor: {
        user_name: request?.user?.preferred_username,
        user_id: request?.user?.sub,
      },
      data: request.body,
      eventname: "update currencies",
      status: "info",
      description: `Updating currency with ID: ${id}`,
      level: "info",
      action: request.method,
      url: request.url,
      is_deleted: false,
    }, Currencies);

    const [numRowsUpdated] = await Currencies.update(
      { name, label, code, symbol },
      { where: { id } }
    );

    if (numRowsUpdated > 0) {
      reply.status(200).send({
        status_code: 200,
        message: "Currencies updated successfully",
        trace_id: traceId,
      });

      logger({
        trace_id: traceId,
        actor: {
          user_name: request?.user?.preferred_username,
          user_id: request?.user?.sub,
        },
        data: request.body,
        eventname: "update currencies",
        status: "success",
        description: `Currency updated successfully: ${id}`,
        level: "success",
        action: request.method,
        url: request.url,
        is_deleted: false,
      }, Currencies);
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "Currencies not found",
      });

      logger({
        trace_id: traceId,
        actor: {
          user_name: request?.user?.preferred_username,
          user_id: request?.user?.sub,
        },
        data: request.body,
        eventname: "update currencies",
        status: "warning",
        description: `Currency not found: ${id}`,
        level: "warning",
        action: request.method,
        url: request.url,
        is_deleted: false,
      }, Currencies);
    }
  } catch (error) {
    logger({
      trace_id: traceId,
      actor: {
        user_name: request?.user?.preferred_username,
        user_id: request?.user?.sub,
      },
      data: request.body,
      eventname: "update currencies",
      status: "error",
      description: `Error updating currency`,
      level: "error",
      action: request.method,
      url: request.url,
      is_deleted: false,
    }, Currencies);

    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error,
    });
  }
}



export async function deleteCurrencies(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params;
    const currencies = await Currencies.update({
      is_deleted: true,
    }, { where: { id } });
    if (currencies.length > 0) {
      reply.status(200).send({
        status_code: 200,
        message: 'Currencies deleted successfully',
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: 'Currencies not found',
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error
    });
  }
}

export const bulkUploadCurrencies = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  try {
    const currencies = request.body as any[];
    const createdCurrencies = await Currencies.bulkCreate(currencies);
    reply.status(201).send({
      status_code: 201,
      data: createdCurrencies,
      message: 'Currencies Created successfully',
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Failed to create Currencies',
      trace_id: traceId,
      error: error,
    });
  }
};
