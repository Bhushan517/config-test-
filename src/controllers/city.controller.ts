import { FastifyRequest, FastifyReply } from "fastify";
import city from "../models/city.model";
import { CityData } from "../interfaces/city.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { handleError } from "../utility/errorHandler";
import { sequelize } from "../config/instance";
import { Op } from "sequelize";
import { decodeToken } from "../middlewares/verifyToken";
import { trace } from "node:console";

export async function createCity(
  request: FastifyRequest<{ Params: { state_id: string; program_id: string } }>,
  reply: FastifyReply
) {
  const transaction = await sequelize.transaction();
  const user = request?.user;
  const userId = user?.sub;
  try {
    const { state_id } = request.params;
    const data = request.body;

    const cityDataArray = Array.isArray(data) ? data : [data];
    const cityNames = cityDataArray.map((city) => city.name);

    const existingCities = await city.findAll({
      where: {
        name: {
          [Op.in]: cityNames,
        },
        state_id,
      },
      transaction,
    });

    if (existingCities.length > 0) {
      const existingCityNames = existingCities.map((city) => city.name);
      await transaction.rollback();
      return reply.status(400).send({
        status_code: 400,
        message: `Cities with the following names already exist in the given state: ${existingCityNames.join(", ")}`,
        trace_id: generateCustomUUID(),
      });
    }

    const newCities = await city.bulkCreate(
      cityDataArray.map((cityData) => ({
        ...cityData,
        state_id,
        created_by: userId,
        updated_by: userId,
      })),
      { transaction }
    );

    await transaction.commit();

    reply.status(201).send({
      status_code: 201,
      city: newCities.map((city) => city.id),
      trace_id: generateCustomUUID(),
    });
  } catch (error: any) {
    await transaction.rollback();
    if (error.message.includes("already exists")) {
      return reply.status(400).send({
        message: error.message,
        trace_id: generateCustomUUID(),
      });
    }
    console.error(error);
    reply.status(500).send({
      message: "Failed to create city(s)",
      error,
      trace_id: generateCustomUUID(),
    });
  }
}

export async function getCity(
  request: FastifyRequest<{
    Querystring: { name?: string; state_id?: string[]; county_id?: string[] };
  }>,
  reply: FastifyReply
) {
  const { state_id, county_id } = request.query;
  const { name } = request.query;
  let whereClause: any = {};

  if (name) {
    whereClause.name = { [Op.like]: `%${name}%` };
  }

  const extractIds = (input: string | string[]): string[] => {
    if (Array.isArray(input)) {
      return input;
    }
    if (typeof input === "string") {
      return input.split(",");
    }
    return [];
  };

  if (state_id) {
    const stateIds = extractIds(state_id);
    whereClause.state_id = { [Op.in]: stateIds };
  }

  if (county_id) {
    const countyIds = extractIds(county_id);
    whereClause.county_id = { [Op.in]: countyIds };
  }

  try {
    const cities = await city.findAll({ where: whereClause });
    if (cities.length === 0) {
      return reply.status(200).send({
        message: "city not found",
        cities: [],
        trace_id: generateCustomUUID(),
      });
    }
    reply.status(200).send({
      status_code: 200,
      items_per_page: cities.length,
      total_records: cities.length,
      trace_id: generateCustomUUID(),
      cities_data: cities,
    });
  } catch (error) {
    console.error(error);
    reply.status(500).send({
      message: "Internal Server Error",
      error,
      trace_id: generateCustomUUID(),
    });
  }
}

export async function updateCity(
  request: FastifyRequest<{ Params: { id: string; state_id: string } }>,
  reply: FastifyReply
) {
  const { id, state_id } = request.params;
  const cityData = request.body as CityData;
  const user = request?.user;
  const userId = user?.sub
  try {
    const City: city | null = await city.findOne({
      where: { id, state_id, is_deleted: false },
    });
    if (City) {
      await City.update({
        cityData,
        updated_by: userId,
      });
      reply.status(200).send({
        status_code: 200,
        City_id: id,
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({
        message: "city not found",
        city: [],
        trace_id: generateCustomUUID(),
      });
    }
  } catch (error) {
    console.error(error);
    reply.status(500).send({
      message: "Internal Server Error",
      error,
      trace_id: generateCustomUUID(),
    });
  }
}

export async function deleteCity(
  request: FastifyRequest<{ Params: { id: string; state_id: string }}>,
  reply: FastifyReply
) {
  const { id, state_id } = request.params;
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
  console.log("uuu", userId)
  try {
    const Citys = await city.update(
      {
        is_deleted: true,
        is_enabled: false,
        updated_by: userId,
      },
      {
        where: {
          id,
          state_id,
        },
      }
    );
    if (Citys) {
      reply.status(200).send({
        status_code: 200,
        Citys_id: id,
        trace_id: generateCustomUUID(),
      });
    } else {
      reply.status(200).send({
        message: "city not found",
        city: [],
        trace_id: generateCustomUUID(),
      });
    }
  } catch (error) {
    console.error(error);
    reply.status(500).send({
      message: "Internal Server Error",
      error,
      trace_id: generateCustomUUID(),
    });
  }
}

export const getCityById = async (
  request: FastifyRequest<{
    Params: { id: string; state_id: string };
  }>,
  reply: FastifyReply
) => {
  const { id, state_id: string } = request.params;
   const traceId = generateCustomUUID();

  try {
    const resourceCity = await city.findOne({
      where: { id, state_id: string, is_deleted: false },
    });

    if (!resourceCity) {
      return reply.status(200).send({
        status_code: 200,
        message: "city not found for the given ID",
        trace_id: generateCustomUUID(),
        city: [],
      });
    }

    reply.status(200).send({
      status_code: 200,
      message: "city data retrieved successfully",
      City: resourceCity,
      trace_id: generateCustomUUID(),
    });
  } catch (error) {
      reply.status(500).send({
      status_code: 500,
      message: "An error occurred while retrieving city data",
      error: (error as Error).message,
      trace_id: traceId,
    });
  }
};
