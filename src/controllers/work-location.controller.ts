import WorkLocationModel from "../models/work-location.model";
import { WorkLocationInterface } from "../interfaces/work-location.interface";
import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import Currencies from "../models/currencies.model";
import WorkLocationCurrency from "../models/work-location-currency.model";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Op, QueryTypes } from "sequelize";
import { getWorklocation,} from "../utility/queries";
import { sequelize } from "../config/instance";
import CountryModel from "../models/countries.model";
import WorkLocationCustomFieldModel from "../models/work-location-custom-field";
import { getCustomsField } from "../utility/get-custom-field";  
import { parseValue } from "../utility/parse-value";

export async function createWorkLocation(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const workLocation = request.body as WorkLocationInterface;
  const traceId = generateCustomUUID();
  const program_id = workLocation.program_id;
  const transaction = await sequelize.transaction();
  const user = request?.user;
  try {
    const [workLocationData, created] = await WorkLocationModel.findOrCreate({
      where: {
        program_id,
        [Op.or]: [
          { code: workLocation.code },
          { name: workLocation.name },
        ],
      },
      defaults: { ...workLocation },
      transaction,
    });

    if (!created) {
      const existingWorkLocation = await WorkLocationModel.findOne({
        where: {
          program_id,
          [Op.or]: [
            { code: workLocation.code },
            { name: workLocation.name },
          ],
        },
        attributes: ['code', 'name'],
        transaction,
      });

      const duplicateField =
        existingWorkLocation?.name === workLocation.name
          ? 'name'
          : 'code';

      await transaction.rollback();
      return reply.status(400).send({
        status_code: 400,
        message: `Work location with ${duplicateField} '${workLocation[duplicateField]}' already exists.`,
        trace_id: traceId,
      });
    }

    // Log creation event
    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "creating work location",
        status: "success",
        description: `Creating work location for ${program_id}`,
        level: "info",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      WorkLocationModel
    );
    if (workLocation.currencies && workLocation.currencies.length > 0) {
      for (const currency of workLocation.currencies) {
        await WorkLocationCurrency.create({
          work_location_id: workLocationData.id,
          currency_id: currency.id,
          is_default: currency.is_default,
          name: currency.name,
          code: currency.code,
        }, { transaction });
      }
    }
    if (Array.isArray(workLocation.custom_fields) && workLocation.custom_fields.length > 0) {
      const customFields = workLocation.custom_fields.map((field: {
        id: any; value: any;
      }) => ({
        program_id,
        customfield_id: field.id,
        value: field.value,
        work_location_id: workLocationData.id
      }));
      await WorkLocationCustomFieldModel.bulkCreate(customFields, { transaction });
    }
    await transaction.commit();
    reply.status(201).send({
      status_code: 201,
      message: "Work location created successfully",
      workLocation: workLocationData.id,
      trace_id: traceId,
    });

    logger(
      {
        traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "created work location",
        status: "success",
        description: `Created work location for ${program_id} successfully: ${workLocationData.id}`,
        level: "success",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      WorkLocationModel
    );
  } catch (error: any) {
    await transaction.rollback();
    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: user?.sub,
        },
        data: request.body,
        eventname: "create work location",
        status: "error",
        description: `Error creating work location for ${program_id}`,
        level: "error",
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      WorkLocationModel
    );

    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Failed to create work location",
      error: error.message,
    });
  }
}


export async function getAllWorkLocations(
  request: FastifyRequest<{ Querystring: WorkLocationInterface }>,
  reply: FastifyReply
) {
  try {
    const params = request.params as WorkLocationInterface;
    const query = request.query as WorkLocationInterface | any;
    const page = query.page ? parseInt(query.page) : undefined;
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const offset = page && limit ? (page - 1) * limit : undefined;
    delete query.page;
    delete query.limit;

    const country_ids = query.country_id ? query.country_id.split(",").map((id: string) => id.trim()) : [];
    delete query.country_id;
    if (query.is_enabled) {
      query.is_enabled = query.is_enabled !== "false";
    }
    let order: [string, string][] = [["updated_on", "DESC"]];
    if (query.sort === "1") {
      order = [["updated_on", "ASC"]];
    } else if (query.sort === "-1") {
      order = [["updated_on", "DESC"]];
    }
    const whereClause: any = {
      ...query,
      program_id: params.program_id,
      is_deleted: false
    };
    if (country_ids.length > 0) {
      whereClause.country_id = { [Op.in]: country_ids };
    }
    if (query.state_name) {
      whereClause.state_name = { [Op.like]: `%${query.state_name}%` };
    }
    if (query.name) {
      whereClause.name = { [Op.like]: `%${query.name}%` };
    }
    if (query.code) {
      whereClause.code = query.code
    }
    if (query.zipcode) {
      whereClause.zipcode = query.zipcode
    }
    if (query.updated_on) {
      const dateRange = query.updated_on.split(',');
      if (dateRange.length === 2) {
        const startDate = parseFloat(dateRange[0].trim());
        const endDate = parseFloat(dateRange[1].trim());
        whereClause.updated_on = { [Op.between]: [startDate, endDate] };
      }
    }
    const workLocations = await WorkLocationModel.findAll({
      where: whereClause,
      ...(limit ? { limit } : {}),
      ...(offset ? { offset } : {}),
      order,
      include: [
        {
          model: CountryModel,
          as: 'countries',
          attributes: ['id', 'name'],
        }
      ]
    });
    for (const location of workLocations) {
      const currencyIds = location.currency_id as string[] || [];
      if (currencyIds.length > 0) {
        const currencies = await Currencies.findAll({
          where: { id: currencyIds },
          attributes: ['id', 'name']
        });
        location.dataValues.currencies = currencies;
      } else {
        location.dataValues.currencies = [];
      }
    }

    const count = await WorkLocationModel.count({
      where: whereClause,
    });
    if (workLocations.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        items_per_page: limit,
        total_records: count,
        trace_id: generateCustomUUID(),
        message: "Worklocation not found.",
        work_locations: [],
      });
    }

    return reply.status(200).send({
      status_code: 200,
      trace_id: generateCustomUUID(),
      items_per_page: limit,
      total_records: count,
      message: "Worklocation fetched successfully.",
      work_locations: workLocations
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: "Internal Server Error",
      error,
    });
  }
}

export async function getWorkLocationById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const { id, program_id } = request.params as { id: string; program_id: string };

  if (!id || !program_id) {
    return reply.status(400).send({
      status_code: 400,
      trace_id: traceId,
      message: "Invalid parameters",
    });
  }

  try {
    const workLocation = await WorkLocationModel.findOne({
      where: { id, program_id, is_deleted: false },
      include: [
        {
          model: CountryModel,
          as: 'countries',
          attributes: ['id', 'name', 'isd_code', 'iso_code_2', 'iso_code_3'],
        }
      ],
    });

    if (!workLocation) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "Work Location Not Found",
      });
    }
    const [customFieldsResult] = await sequelize.query(
      getCustomsField(id, 'work_location_custom_field', 'work_location_id', 'customfield_id'),
      {
        replacements: { id },
        type: QueryTypes.SELECT,
      }
    ) as any;
    const customFields = customFieldsResult?.custom_fields
      .map((field: any) => ({
        ...field,
        value: parseValue(field.value),
      }))
    
    const workLocationCurrencies = await WorkLocationCurrency.findAll({
      where: { work_location_id: id },
      attributes: ['name', 'is_default', 'code'],
    });
    const responseCurrencies = workLocationCurrencies
      .filter((currency: any) => currency.name && currency.is_default !== undefined && currency.code);
    const responseWorkLocation = {
      ...workLocation.dataValues,
      currencies: responseCurrencies,
      custom_fields: customFields
    };

    return reply.status(200).send({
      status_code: 200,
      work_location: responseWorkLocation,
      trace_id: traceId,
    });
  } catch (error: any) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Failed To Retrieve Work Location",
      error: error.message,
    });
  }
}

export async function updateWorkLocation(
  request: FastifyRequest<{
    Params: { id: string };
    Body: WorkLocationInterface;
  }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const transaction = await sequelize.transaction();
  try {
    const { id } = request.params;
    const { program_id, currencies, custom_fields, ...updates } = request.body;

    if (!program_id) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: "program_id is required in the request body",
      });
    }
    if(updates.id){
    const existingWorkLocation = await WorkLocationModel.findOne({
      where: {
        program_id,
        is_deleted: false,
        [Op.or]: [
          { code: updates.code },
          { name: updates.name },
        ],
        id: { [Op.ne]: id },
      },
      attributes: ['code', 'name'],
      transaction,
    });

    if (existingWorkLocation) {
      const duplicateField =
        existingWorkLocation.name === updates.name
          ? 'name'
          : 'code';

      await transaction.rollback();
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: `Work location with ${duplicateField} '${updates[duplicateField]}' already exists.`,
      });
    }
  }
    const [numRowsUpdated] = await WorkLocationModel.update(
      { ...updates, updated_on: Date.now() },
      { where: { id, program_id, is_deleted: false }, transaction }
    );

    if (numRowsUpdated === 0) {
      await transaction.rollback();
      return reply.status(404).send({
        status_code: 404,
        trace_id: traceId,
        message: "Work Location Not Found",
      });
    }

    if (Array.isArray(currencies)) {
      await WorkLocationCurrency.destroy({
        where: { work_location_id: id },
        transaction,
      });
      const currencyRecords = currencies.map(currency => ({
        work_location_id: id,
        currency_id: currency.id,
        is_default: currency.is_default,
        name: currency.name,
        code: currency.code,
      }));
      await WorkLocationCurrency.bulkCreate(currencyRecords, { transaction });
    }

    if (Array.isArray(custom_fields) && custom_fields.length > 0) {
      await WorkLocationCustomFieldModel.destroy({
        where: { work_location_id: id },
        transaction,
      });
      const customFieldRecords = custom_fields.map(field => ({
        program_id,
        customfield_id: field.id,
        value: field.value,
        work_location_id: id,
      }));
      await WorkLocationCustomFieldModel.bulkCreate(customFieldRecords, { transaction });
    }

    await transaction.commit();
    return reply.status(200).send({
      status_code: 200,
      work_location_id: id,
      trace_id: traceId,
      message: "Work location updated successfully.",
    });

  } catch (error: any) {
    await transaction.rollback();
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

export async function deleteWorkLocationById(
  request: FastifyRequest<{ Params: { id: string; program_id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id, program_id } = request.params;
    const [numRowsDeleted] = await WorkLocationModel.update(
      {
        is_deleted: true,
        is_enabled: false,
        updated_on: Date.now(),
      },
      { where: { id, program_id, is_deleted: false } }
    );

    if (numRowsDeleted > 0) {
      reply.status(200).send({
        status_code: 200,
        work_location_id: id,
        trace_id: generateCustomUUID(),
        message: "Work Location Deleted Successfully",
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        trace_id: generateCustomUUID(),
        message: "Work Location Not Found"
      });
    }
  } catch (error) {
    console.error("Error Deleting Work Location:", error);
    reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: "Internal Server Error",
      error
    });
  }
}

export async function getAllWorkLocationsCountry(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };
  const { isCountry, isStates } = request.query as { isCountry: string; isStates: string };

  try {
    const includeOptions = [];
    const response: {
      status_code: number;
      trace_id: string;
      message: string;
      work_location_country?: { id: string; name: string }[];
      work_location_states?: { id: string; name: string }[];
    } = {
      status_code: 200,
      trace_id: traceId,
      message: "Work locations retrieved successfully",
    };

    if (isCountry === "true") {
      includeOptions.push({
        model: CountryModel,
        as: "countries",
        attributes: ["id", "name"],
      });
    }

    const workLocations = await WorkLocationModel.findAll({
      where: {
        program_id,
        is_deleted: false,
      },
      include: includeOptions,
      attributes: ["id", "name", "state_name"],
    });

    if (!workLocations || workLocations.length === 0) {
      response.message = "Work locations not found";
      return reply.status(200).send(response);
    }

    if (isCountry === "true") {
      const uniqueCountries = new Set();
      const workLocationCountry = workLocations
        .map(location => location.countries)
        .filter(Boolean)
        .flat()
        .map((country: any) => ({
          id: country.id,
          name: country.name || "",
        }))
        .filter(country => {
          if (country.name && !uniqueCountries.has(country.name)) {
            uniqueCountries.add(country.name);
            return true;
          }
          return false;
        });

      response.work_location_country = workLocationCountry;
    }

    if (isStates === "true") {
      const uniqueStates = new Set();
      const workLocationStates = workLocations
        .map(location => ({
          id: location.id,
          name: location.state_name || "",
        }))
        .filter(location => {
          if (location.name && !uniqueStates.has(location.name)) {
            uniqueStates.add(location.name);
            return true;
          }
          return false;
        });

      response.work_location_states = workLocationStates;
    }

    return reply.status(200).send(response);
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Failed to retrieve work locations",
      error: error.message,
    });
  }
}



type QueryResult = {
  program_id: string;
  countries: Array<{ id: string; name: string }> | null;
};

export async function getAllCountry(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };

  try {
    const result = await sequelize.query<QueryResult>(getWorklocation,
      {
        type: QueryTypes.SELECT,
        replacements: { program_id },
      }
    );
    if (!result || result.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "Work Location Not Found",
      });
    }
    const countries = result[0]?.countries || [];

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "Work Locations retrieved successfully",
      countries,
    });
  } catch (error) {
    console.error("Error Fetching Work Locations:", error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error,
    });
  }
}

export const getWorkLocationsAdvancedFilter = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const {
      name, country_id, state_name, code, zipcode, is_enabled, updated_on, page = 1, limit = 10, sort
    } = request.body as {
      name: string;
      country_id: string;
      state_name: string;
      code: string;
      zipcode: string;
      is_enabled: boolean;
      updated_on: string[];
      page: string;
      limit: string;
      sort: string;
    };

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const country_ids = country_id ? country_id.split(",").map((id: string) => id.trim()) : [];
    let order: [string, string][] = [["updated_on", "DESC"]];
    if (sort === "1") {
      order = [["updated_on", "ASC"]];
    } else if (sort === "-1") {
      order = [["updated_on", "DESC"]];
    }

    const filters: any = { program_id, is_deleted: false };

    if (name) {
      filters.name = { [Op.like]: `%${name}%` };
    }
    if (country_ids.length > 0) {
      filters.country_id = { [Op.in]: country_ids };
    }
    if (state_name) {
      filters.state_name = { [Op.like]: `%${state_name}%` };
    }
    if (code) {
      filters.code = code;
    }
    if (zipcode) {
      filters.zipcode = zipcode;
    }
    if (is_enabled !== undefined) {
      filters.is_enabled = is_enabled;
    }
    if (Array.isArray(updated_on) && updated_on.length === 2) {
      const [startTimestamp, endTimestamp] = updated_on.map(ts => parseInt(ts, 10));
      filters.updated_on = { [Op.between]: [startTimestamp, endTimestamp] };
    }

    const workLocations = await WorkLocationModel.findAll({
      where: filters,
      limit: limitNum,
      offset,
      order,
      include: [
        {
          model: CountryModel,
          as: 'countries',
          attributes: ['id', 'name'],
        }
      ]
    });

    for (const location of workLocations) {
      const currencyIds = location.currency_id as string[] || [];
      if (currencyIds.length > 0) {
        const currencies = await Currencies.findAll({
          where: { id: currencyIds },
          attributes: ['id', 'name']
        });
        location.dataValues.currencies = currencies;
      } else {
        location.dataValues.currencies = [];
      }
    }

    const count = await WorkLocationModel.count({
      where: filters,
    });

    if (workLocations.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        items_per_page: limitNum,
        total_records: count,
        trace_id: generateCustomUUID(),
        message: "Worklocation not found.",
        work_locations: [],
      });
    }

    return reply.status(200).send({
      status_code: 200,
      trace_id: generateCustomUUID(),
      items_per_page: limitNum,
      total_records: count,
      message: "Worklocation fetched successfully.",
      work_locations: workLocations
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: generateCustomUUID(),
      message: "Internal Server Error",
      error,
    });
  }
};
