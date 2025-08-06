import { FastifyRequest, FastifyReply } from 'fastify';
import { hierarchiesData } from '../interfaces/hierarchies.interface';
import { baseSearch, advanceSearch } from '../utility/baseService';
import generateCustomUUID from '../utility/genrateTraceId';
import HierarchiesModel from '../models/hierarchies.model';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../config/instance';
import { getAllHierarchies, getHierarchieWithChildren, getMatchingHierarchiesQuery, getParentHierarchiesQuery, getUserHierarchiesBasedOnUserType, hierarchie, hierarchyDetailsQuery, masterDataQuery, parentHierarchyDetailsQuery, userData, vendorMarkup } from '../utility/queries';
import HierarchyCustomFieldModel from '../models/hierarchies-custom-field.model';
import User from '../models/user.model';
import TenantModel from '../models/tenant.model';
import CountryModel from '../models/countries.model';
import CustomField from '../models/custom-fields.model';
import GlobalRepository from '../repositories/global.repository';
import { getCustomsField } from '../utility/get-custom-field';
import { parseValue } from '../utility/parse-value';

interface HierarchyItem {
  support_email: any;
  default_date_format: any;
  default_currency: any;
  default_language: any;
  is_hide_candidate_img: any;
  is_vendor_neutral_program: any;
  default_timezone: any;
  id: string;
  parent_hierarchy_id: string | null;
  name: string;
  is_enabled: boolean;
  preferred_date_format: string;
  rate_model: string;
  created_on: number;
  updated_on: number;
  code: string;
  program_id: string;
  address: any;

}
export const getHierarchiesByProgram = async (request: FastifyRequest, reply: FastifyReply) => {
  const { program_id, id } = request.params as { program_id: string; id: string };
  const { is_enabled, msp_id } = request.query as { is_enabled: string; msp_id?: string };
  const traceId = generateCustomUUID();

  try {
    const hierarchiesWithChildren: HierarchyItem[] = await sequelize.query(getHierarchieWithChildren, {
      replacements: {
        program_id,
        managed_by: msp_id || null
      },
      type: QueryTypes.SELECT
    });

    if (hierarchiesWithChildren.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: 'No hierarchies found for the given program',
        trace_id: traceId,
        hierarchies: [],
      });
    }

    let filteredHierarchies = id
      ? hierarchiesWithChildren.filter((item) => item.id === id)
      : hierarchiesWithChildren;

    if (is_enabled !== undefined) {
      const isEnabledBoolean = is_enabled === 'true'; // Convert to boolean
      filteredHierarchies = filteredHierarchies.filter((item) => {
        return Boolean(item.is_enabled) === isEnabledBoolean;
      });
    }

    const buildHierarchy = (data: HierarchyItem[], parentId: string | null = null): any[] => {
      return data
        .filter((item) => item.parent_hierarchy_id === parentId)
        .map((item) => {
          return {
            id: item.id,
            parent_hierarchy_id: item.parent_hierarchy_id,
            name: item.name,
            is_enabled: Boolean(item.is_enabled),
            preferred_date_format: item.preferred_date_format,
            rate_model: item.rate_model,
            created_on: item.created_on,
            updated_on: item.updated_on,
            code: item.code,
            program_id: item.program_id,
            default_timezone: item.default_timezone,
            is_hide_candidate_img: item.is_hide_candidate_img,
            default_language: item.default_language,
            default_currency: item.default_currency,
            default_date_format: item.default_date_format,
            support_email: item.support_email,
            is_vendor_neutral_program: Boolean(item.is_vendor_neutral_program),
            is_root_hierarchy: parentId === null,
            hierarchies: buildHierarchy(data, item.id),
          };
        });
    };

    const nestedHierarchy = buildHierarchy(filteredHierarchies);

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      hierarchies: nestedHierarchy,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while fetching hierarchies by program',
      trace_id: traceId,
      error: error.message
    });
  }
};


export const getHierarchies = async (request: FastifyRequest, reply: FastifyReply) => {
  const { program_id } = request.params as { program_id: string };
  const { name, is_enabled, updated_on, msp, page = 1, limit = 10 } = request.query as {
    name?: string;
    is_enabled?: boolean | string;
    updated_on?: string;
    msp?: string;
    page?: number;
    limit?: number;
  };
  const traceId = generateCustomUUID();
  try {
    const hasName = !!name;
    const hasMsp = !!msp;
    const isEnabledValue =
      is_enabled === "true" ? true : is_enabled === "false" ? false : undefined;
    let startDate: number | undefined;
    let endDate: number | undefined;

    if (updated_on) {
      const dateRange = updated_on.split(",").map(date => date.trim());

      if (dateRange.length > 0 && !isNaN(Number(dateRange[0]))) {
        startDate = Number(dateRange[0]);
      }
      if (dateRange.length === 2 && !isNaN(Number(dateRange[1]))) {
        endDate = Number(dateRange[1]);
      }
    }

    const offset = (page - 1) * limit;

    const replacements: any = {
      program_id,
      ...(hasName && { name: `%${name}%` }),
      ...(isEnabledValue !== undefined && { is_enabled: isEnabledValue }),
      ...(startDate && endDate && { startDate, endDate }),
      ...(hasMsp && { msp }),
      limit: Number(limit),
      offset: Number(offset),
    };

    const hierarchies: any[] = await sequelize.query(
      getAllHierarchies(hasName, !!is_enabled, startDate, endDate, hasMsp),
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    const total_count = hierarchies[0]?.total_count || 0;

    if (total_count === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "No hierarchies found for the given program",
        total_records: 0,
        page,
        limit,
        hierarchies: [],
      });
    }

    const formattedHierarchies = hierarchies.map(
      ({ default_currency, total_count, ...rest }) => ({
        ...rest,
        currency: default_currency ?? null,
        is_vendor_neutral_program: Boolean(rest.is_vendor_neutral_program)
      })
    );

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "Hierarchies fetched successfully.",
      total_records: total_count,
      page,
      limit,
      hierarchies: formattedHierarchies,
    });
  } catch (error: any) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "An error occurred while fetching hierarchies",
      error: error.message,
    });
  }
};


interface MasterDataResult {
  foundational_data: string | null;
  parent_hierarchy_name: string | null;
}

export async function getHierarchiesById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params as { id: string };
    const [hierarchy] = await sequelize.query<any>(hierarchie, {
      replacements: { hierarchy_id: id },
      type: QueryTypes.SELECT,
    });

    if (!hierarchy) {
      return reply.status(404).send({
        status_code: 404,
        message: "Hierarchies not found",
        trace_id: traceId,
        hierarchies: [],
      });
    }

    const countryId = Array.isArray(hierarchy.address) && hierarchy.address.length > 0
      ? hierarchy.address[0].country
      : null;

    let countryData = null;

    if (countryId) {
      countryData = await CountryModel.findOne({
        where: { id: countryId },
        attributes: ["id", "name", "iso_code_2", "iso_code_3", "isd_code"],
      });
    }
    if (hierarchy) {
      const [masterDataResult] = await sequelize.query<MasterDataResult>(masterDataQuery, {
        replacements: { hierarchy_id: id },
        type: QueryTypes.SELECT,
      });

      hierarchy.is_hide_candidate_img = hierarchy.is_hide_candidate_img === 1 ? true : false;
      hierarchy.is_vendor_neutral_program = hierarchy.is_vendor_neutral_program === 1 ? true : false;
      hierarchy.country = countryData || { id: null, name: null, iso_code_2: null, isd_code: null, iso_code_3: null };

      if (masterDataResult) {
        const parsedData = typeof masterDataResult.foundational_data === 'string'
          ? JSON.parse(masterDataResult.foundational_data)
          : masterDataResult.foundational_data;

        hierarchy.foundational_data = Array.isArray(parsedData)
          ? parsedData.filter(item => item.id !== null && item.name !== null)
          : [];

        hierarchy.parent_hierarchy_name = masterDataResult.parent_hierarchy_name ?? null;
      } else {
        hierarchy.foundational_data = [];
        hierarchy.parent_hierarchy_name = null;
      }
      const [customFieldResult] = await sequelize.query(
        getCustomsField(hierarchy.id, 'hierarchies_custom_field', 'hierarchy_id', 'customfield_id'),
        {
          replacements: { id: hierarchy.id },
          type: QueryTypes.SELECT,
        }
      ) as any;
      const customFields = customFieldResult?.custom_fields
      .map((field: any) => ({
        ...field,
        value: parseValue(field.value),
      }))
      return reply.status(200).send({
        status_code: 200,
        message: "Hierarchies data get successfully",
        trace_id: traceId,
        hierarchies: {
          ...hierarchy,
          custom_fields: customFields || [],
        }
      });
    } else {
      return reply.status(404).send({
        message: 'hierarchies not found',
        hierarchies: [],
      });
    }
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      message: 'An error occurred while fetching hierarchies by ID',
      error: (error as Error).message,
    });
  }
}

export async function createHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const hierarchie = request.body as hierarchiesData;
  const hierarchyCode = hierarchie.code;
  const traceId = generateCustomUUID();
  const user = request?.user
  const userId = user?.sub;
  logger({
    trace_id: traceId,
    actor: { user_name: user?.preferred_username, user_id: userId },
    data: request.body,
    eventname: "creating hierarchies",
    status: "in_progress",
    description: `Creating hierarchies for ${program_id}`,
    level: 'info',
    action: request.method,
    url: request.url,
    entity_id: program_id,
    is_deleted: false
  }, HierarchiesModel);

  const transaction = await sequelize.transaction();
  try {
    // Check if hierarchy code already exists
    const codeExists = await HierarchiesModel.findOne({
      where: { code: hierarchyCode, program_id, is_deleted: false },
      transaction,
    });

    if (codeExists) {
      await transaction.rollback();
      return reply.status(409).send({
        status_code: 409,
        message: "hierarchies code is already in use",
      });
    }
    // Create the hierarchy record
    const newItem = await HierarchiesModel.create(
      {
        ...hierarchie,
        program_id,
        created_by: userId,
        updated_by: userId,
      },
      { transaction }
    );

    if (Array.isArray(hierarchie.custom_fields) && hierarchie.custom_fields.length > 0) {
      const customFields = hierarchie.custom_fields.map((field: {
        id: any; value: any;
      }) => ({
        program_id,
        customfield_id: field.id,
        value: field.value,
        hierarchy_id: newItem.id,
      }));
      await HierarchyCustomFieldModel.bulkCreate(customFields, { transaction });
    }

    await transaction.commit();

    logger({
      trace_id: traceId,
      actor: { user_name: user?.preferred_username, user_id: userId },
      data: request.body,
      eventname: "created hierarchies",
      status: "success",
      description: `Created hierarchies for ${program_id} successfully: ${newItem.id}`,
      level: "success",
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false,
    }, HierarchiesModel);

    return reply.status(201).send({
      status_code: 201,
      message: 'hierarchies Created Successfully',
      trace_id: traceId,
      id: newItem.id
    });
  } catch (error) {
    await transaction.rollback();

    logger({
      trace_id: traceId,
      actor: { user_name: user?.preferred_username, user_id: userId },
      data: request.body,
      eventname: "creating hierarchies",
      status: "error",
      description: `Error creating hierarchies for ${program_id}`,
      level: "error",
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false,
    }, HierarchiesModel);

    console.error(error);
    return reply.status(500).send({
      message: "Failed To Create hierarchies",
      error: (error as any).message,
    });
  }
}


// const setAssociations = async (newItem: any, hierarchies: hierarchiesData, transaction: any) => {
//   if (hierarchies.timezone_id && Array.isArray(hierarchies.timezone_id)) {
//     await newItem.setTime_zones(hierarchies.timezone_id, { transaction });
//   }
// };

export async function updateHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as { id: string; program_id: string };
  const hierarchiesData = request.body as hierarchiesData;
  const traceId = generateCustomUUID();
  const user = request?.user
  const userId = user?.sub;
  try {
    const hierarchy = await HierarchiesModel.findOne({
      where: { id, program_id, is_deleted: false },
    });

    if (!hierarchy) {
      return reply.status(200).send({
        status_code: 200,
        message: "Hierarchy not found",
        trace_id: traceId,
      });
    }

    const transaction = await sequelize.transaction();
    try {
      if (hierarchy.parent_hierarchy_id === null) {
        const { is_enabled, parent_hierarchy_id, ...updatableData } = hierarchiesData;
        await hierarchy.update({ ...updatableData, updated_by: userId, updated_on: Date.now() }, { transaction });
      } else {
        await hierarchy.update({ ...hierarchiesData, updated_by: userId, updated_on: Date.now() }, { transaction });
      }

      if (hierarchiesData.custom_fields && hierarchiesData.custom_fields.length > 0) {
        await HierarchyCustomFieldModel.destroy({
          where: { hierarchy_id: hierarchy.id },
          transaction
        });
      }

      if (Array.isArray(hierarchiesData.custom_fields) && hierarchiesData.custom_fields.length > 0) {
        const customFields = hierarchiesData.custom_fields.map((field: { id: any; value: any; }) => ({
          program_id,
          customfield_id: field.id,
          value: field.value,
          hierarchy_id: hierarchy.id,
        }));
        await HierarchyCustomFieldModel.bulkCreate(customFields, { transaction });
      }

      await transaction.commit();
      return reply.status(200).send({
        status_code: 200,
        message: "Hierarchy updated successfully",
        trace_id: traceId,
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating hierarchy:', error);
      return reply.status(500).send({
        status_code: 500,
        message: "Failed to update hierarchies",
        trace_id: traceId,
      });
    }
  } catch (error) {
    console.error('Internal error:', error);
    return reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
    });
  }
}

export async function searchHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const searchFields = ['is_enabled', 'name', 'code', 'program_id'];
  const responseFields = ['id', 'name', 'updated_on', 'is_enabled', 'program_id'];
  return baseSearch(request, reply, HierarchiesModel, searchFields, responseFields);
}

export async function advancedSearchHierarchies(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const searchFields = ['name', 'updated_on', 'is_enabled', 'name', 'code', 'program_id'];
  const responseFields = ['id', 'name', 'updated_on', 'is_enabled', 'code', 'program_id'];
  return advanceSearch(
    request,
    reply,
    HierarchiesModel,
    searchFields,
    responseFields
  );
}
interface Hierarchy {
  rate_model: string;
  id: string;
  name: string;
  parent_hierarchy_id: string | null;
  parent_name: string | null;
  hierarchies: Hierarchy[];
}

export const getRateModel = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  const { hierarchy_ids } = request.query as { hierarchy_ids: string };
  const { program_id } = request.params as { program_id: string };

  try {
    const hierarchyIdsArray = hierarchy_ids.split(',');
    const hierarchyDetailsResult = await sequelize.query(hierarchyDetailsQuery, {
      replacements: {
        hierarchyIds: hierarchyIdsArray,
        programId: program_id,
      },
      type: QueryTypes.SELECT,
    });

    if (hierarchyDetailsResult.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: 'Rate model found but no hierarchies associated!',
        trace_id: traceId,
        rate_model: "No Rate Model Available",
        hierarchies: [],
      });
    }

    const hierarchyDetails: Hierarchy[] = hierarchyDetailsResult.map((item: any) => ({
      id: item.id,
      name: item.name,
      parent_hierarchy_id: item.parent_hierarchy_id,
      parent_name: item.parent_name,
      rate_model: item.rate,
      is_assoiciate: hierarchyIdsArray.includes(item.id),
      hierarchies: [],
    }));

    const parentHierarchyIds = hierarchyDetails
      .map(h => h.parent_hierarchy_id)
      .filter((id, index, self) => id && self.indexOf(id) === index && !hierarchyIdsArray.includes(id));

    let parentHierarchyDetails: Hierarchy[] = [];
    if (parentHierarchyIds.length > 0) {
      const parentHierarchyDetailsResult = await sequelize.query(parentHierarchyDetailsQuery, {
        replacements: {
          parentHierarchyIds,
          programId: program_id,
        },
        type: QueryTypes.SELECT,
      });

      parentHierarchyDetails = parentHierarchyDetailsResult.map((item: any) => ({
        id: item.id,
        name: item.name,
        parent_hierarchy_id: item.parent_hierarchy_id,
        parent_name: item.parent_name,
        rate_model: item.rate,
        is_assoiciate: false,
        hierarchies: []
      }));
    }

    const allHierarchies = [...hierarchyDetails, ...parentHierarchyDetails];

    const hierarchyTree = buildHierarchyTree(allHierarchies);
    const rateModels = hierarchyDetails.map(h => h.rate_model);
    const uniqueRateModels = Array.from(new Set(rateModels));

    const finalRateModel = uniqueRateModels.length === 1
      ? uniqueRateModels[0]
      : findParentRateModel(hierarchyTree) ?? "No Rate Model Available";

    return reply.status(200).send({
      status_code: 200,
      message: 'Rate model found successfully!',
      trace_id: traceId,
      rate_model: finalRateModel,
      hierarchies: hierarchyTree,
    });

  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal server error',
      trace_id: traceId,
      error: error.message
    });
  }
};

function findParentRateModel(hierarchyTree: Hierarchy[]): string | null {
  let parentRateModel: string | null = null;

  const traverse = (node: Hierarchy) => {
    if (node.rate_model) {
      if (!parentRateModel) {
        parentRateModel = node.rate_model;
      }
    }
    node.hierarchies.forEach(traverse);
  };

  hierarchyTree.forEach(traverse);
  return parentRateModel;
}

function buildHierarchyTree(hierarchies: Hierarchy[]): Hierarchy[] {
  const map: { [key: string]: Hierarchy } = {};
  const roots: Hierarchy[] = [];
  hierarchies.forEach(hierarchy => {
    map[hierarchy.id] = { ...hierarchy, hierarchies: [] };
  });
  hierarchies.forEach(hierarchy => {
    if (hierarchy.parent_hierarchy_id) {
      const parent = map[hierarchy.parent_hierarchy_id];
      if (parent) {
        parent.hierarchies.push(map[hierarchy.id]);
      } else {
        roots.push(map[hierarchy.id]);
      }
    } else {
      roots.push(map[hierarchy.id]);
    }
  });
  return roots;
}

export async function getVendorMarkup(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const {
      candidate_source,
      hierarchy_id,
      vendor_id,
      labour_category_id,
    } = request.query as {
      candidate_source: string;
      hierarchy_id: string;
      vendor_id: string;
      labour_category_id: string;
    };

    const rateModelResult = await sequelize.query<{ rate_model: any }>(
      `SELECT rate_model FROM hierarchies WHERE id = :hierarchy_id`,
      {
        replacements: { hierarchy_id },
        type: QueryTypes.SELECT,
      }
    );

    const rateModel = rateModelResult.length > 0 ? rateModelResult[0].rate_model : null;
    let rate_model;
    if (rateModel === "bill_rate" || rateModel === "markup") {
      rate_model = "bill_rate";
    } else {
      rate_model = rateModel;
    }
    const [markupsData] = await sequelize.query<{ markups: any }>(vendorMarkup, {
      replacements: {
        program_id,
        vendor_id,
        rateModel: rate_model,
        program_industry: labour_category_id,
        hierarchy_id
      },
      type: QueryTypes.SELECT,
    });

    let selectedMarkup: any = null;

    if (markupsData) {
      const { markups } = markupsData;

      if (candidate_source === "sourced") {
        selectedMarkup = markups?.sourced_markup;
      } else if (candidate_source === "payrolled") {
        selectedMarkup = markups?.payrolled_markup;
      } else {
        selectedMarkup = null;
      }
    }

    if (!selectedMarkup) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: `No ${candidate_source}_markup found for the provided criteria`,
        rate_model: rateModel,
        markups: null,
      });
    }

    return reply.status(200).send({
      status_code: 200,
      message: "Vendor bill rate and markup retrieved successfully",
      trace_id: traceId,
      rate_model: rateModel,
      markup: selectedMarkup,
    });
  } catch (error: any) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      message: "Failed to retrieve vendor markup",
      trace_id: traceId,
      error: error.message,
    });
  }
}

export const updateIsNotEditableFlag = async (request: FastifyRequest, reply: FastifyReply) => {
  const { hierarchy_ids } = request.query as { hierarchy_ids: string };
  const { program_id } = request.params as { program_id: string };
  const traceId = generateCustomUUID();

  if (!hierarchy_ids) {
    return reply.status(400).send({
      status_code: 400,
      message: 'Missing required query parameter hierarchy_ids.'
    });
  }

  try {
    const hierarchyIdsArray = hierarchy_ids.split(',');
    const query = getMatchingHierarchiesQuery();
    const matchedHierarchies: { hierarchy_id: string }[] = await sequelize.query(query, {
      replacements: { program_id, hierarchy_ids: hierarchyIdsArray },
      type: QueryTypes.SELECT
    });

    if (!matchedHierarchies.length) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: 'No matching hierarchies found.',
        data: []
      });
    }
    const matchedHierarchyIds = matchedHierarchies.map((h) => h.hierarchy_id);
    await sequelize.query(
      `UPDATE hierarchies SET is_not_editable = TRUE WHERE id IN (:matchedHierarchyIds)`,
      { replacements: { matchedHierarchyIds }, type: QueryTypes.UPDATE }
    );

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: 'Hierarchies updated successfully.',
      updated_hierarchy_ids: matchedHierarchyIds
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

export async function getUserHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const user = request?.user
  const userId = user.sub;
  const userType = user.userType;
  const { program_id } = request.params as { program_id: string };

  try {
    let hierarchies: any[] = [];

    if (userType === "super_user") {
      hierarchies = await HierarchiesModel.findAll({
        where: { program_id, is_deleted: false },
        attributes: ["id", "name", "parent_hierarchy_id", "is_enabled"],
      });
    } else {
      hierarchies = await sequelize.query(getUserHierarchiesBasedOnUserType, {
        replacements: { userId, program_id },
        type: QueryTypes.SELECT,
      });
    }

    const buildHierarchy = (data: any, parentId: string | null = null) => {
      return data
        .filter((item: any) => item.parent_hierarchy_id === parentId)
        .map((item: any) => {
          const children = buildHierarchy(data, item.id);
          return {
            id: item.id,
            parent_hierarchy_id: item.parent_hierarchy_id,
            name: item.name,
            is_enabled: item.is_enabled,
            is_root_hierarchy: item.parent_hierarchy_id === null,
            hierarchies: children,
          };
        });
    };

    const nestedHierarchy = buildHierarchy(hierarchies);

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "Hierarchies fetched successfully.",
      hierarchies: nestedHierarchy,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

export const getHierarchiesAdvancedFilter = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { program_id } = request.params as { program_id: string };
  const { name, is_enabled, updated_on, page = 1, limit = 10 } = request.body as {
    name?: string;
    is_enabled?: boolean | string;
    updated_on?: number[];
    page?: number;
    limit?: number;
  };
  const traceId = generateCustomUUID();

  try {
    const hasName = !!name;
    const isEnabledValue =
      is_enabled === "true" ? true : is_enabled === "false" ? false : undefined;
    const { updated_on } = request.body as { updated_on: number[] };

    let startDate: number | undefined;
    let endDate: number | undefined;
    if (Array.isArray(updated_on) && updated_on.length === 2) {
      const parsedStartDate = Number(updated_on[0]);
      const parsedEndDate = Number(updated_on[1]);

      if (!isNaN(parsedStartDate) && !isNaN(parsedEndDate)) {
        startDate = parsedStartDate;
        endDate = parsedEndDate;
      }
    }

    const offset = (page - 1) * limit;

    const replacements: any = {
      program_id,
      ...(hasName && { name: `%${name}%` }),
      ...(isEnabledValue !== undefined && { is_enabled: isEnabledValue }),
      ...(startDate !== undefined && endDate !== undefined && { startDate, endDate }),
      limit: Number(limit),
      offset: Number(offset),
    };

    const hierarchies: any[] = await sequelize.query(
      getAllHierarchies(hasName, !!is_enabled, startDate, endDate),
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );
    if (hierarchies.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "No hierarchies found for the given program",
        total_records: 0,
        page,
        limit,
        hierarchies: [],
      });
    }
    const formattedHierarchies = hierarchies.map((hierarchy) => ({
      ...hierarchy,
      is_vendor_neutral_program: Boolean(hierarchy.is_vendor_neutral_program),
    }));
    const total_count = hierarchies[0]?.total_count || 0;

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "Hierarchies fetched successfully.",
      total_records: total_count,
      page,
      limit,
      hierarchies: formattedHierarchies,
    });
  } catch (error: any) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "An error occurred while fetching hierarchies",
      error: error.message,
    });
  }
};

export async function getParentHierarchies(
  request: FastifyRequest<{ Params: { program_id: string } }>,
  reply: FastifyReply
) {
  const { program_id } = request.params;
  const traceId = generateCustomUUID();

  try {
    const parentHierarchies = await sequelize.query(getParentHierarchiesQuery, {
      replacements: { program_id },
      type: QueryTypes.SELECT,
    });

    return reply.code(200).send({
      status_code: 200,
      message: parentHierarchies.length > 0
        ? 'Parent hierarchies retrieved successfully.'
        : 'No parent hierarchies found.',
      data: parentHierarchies,
      trace_id: traceId,
    });

  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: error.message,
    });
  }
}

export const getMspByClient = async (request: FastifyRequest, reply: FastifyReply) => {
  const { program_id } = request.params as { program_id: string };
  const { client_id, hierarchy_id } = request.query as { client_id?: string; hierarchy_id?: string };
  const traceId = generateCustomUUID();

  try {
    if (!client_id && !hierarchy_id) {
      return reply.status(400).send({
        status_code: 400,
        trace_id: traceId,
        message: "At least client_id or hierarchy_id is required in query parameters",
      });
    }

    let managedByIds: string[] = [];

    if (hierarchy_id) {
      const hierarchy = await HierarchiesModel.findOne({
        where: {
          id: hierarchy_id,
          program_id,
          is_enabled: true,
        },
        attributes: ["managed_by"],
        raw: true,
      });

      if (!hierarchy) {
        return reply.status(404).send({
          status_code: 404,
          trace_id: traceId,
          message: "Hierarchy not found for the given hierarchy_id and program_id",
        });
      }

      managedByIds = [hierarchy.managed_by];
    } else {
      const [user]: any = await sequelize.query(userData, {
        replacements: { client_id, program_id },
        type: QueryTypes.SELECT,
      });

      if (!user) {
        return reply.status(404).send({
          status_code: 404,
          trace_id: traceId,
          message: "User not found for given client_id and program_id",
        });
      }

      const { associate_hierarchy_ids, is_all_hierarchy_associate, user_type } = user;

      if (is_all_hierarchy_associate || user_type === "super_user") {
        const hierarchies = await HierarchiesModel.findAll({
          where: {
            program_id,
            is_enabled: true,
          },
          attributes: ["managed_by"],
          raw: true,
        });

        managedByIds = [...new Set(hierarchies.map((h: any) => h.managed_by))];
      } else {
        const hierarchies = await HierarchiesModel.findAll({
          where: {
            id: associate_hierarchy_ids,
            program_id,
            is_enabled: true,
          },
          attributes: ["managed_by"],
          raw: true,
        });

        managedByIds = [...new Set(hierarchies.map((h: any) => h.managed_by))];
      }
    }

    if (!managedByIds.length) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "No MSP found for the given criteria",
        data: [],
      });
    }

    const isSelfManagedPresent = managedByIds.includes("self-managed");

    const tenants = await TenantModel.findAll({
      where: {
        id: managedByIds.filter((id) => id !== "self-managed"),
      },
      attributes: ["id", "name", "display_name"],
    });

    if (isSelfManagedPresent) {
      tenants.unshift({
        id: "self-managed",
        name: "SELF_MANAGED",
        display_name: "SELF MANAGED",
      } as any);
    }

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: "MSP fetched successfully",
      data: tenants,
    });
  } catch (error: any) {
    console.error(error);
    return reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: "An error occurred while fetching MSP",
      error: error.message,
    });
  }
};


export async function bulkCreateHierarchies(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const hierarchiesData = request.body as hierarchiesData[]; // Array of hierarchy objects
  const traceId = generateCustomUUID();

  // Validate input
  if (!Array.isArray(hierarchiesData) || hierarchiesData.length === 0) {
    return reply.status(400).send({
      message: 'Bad Request - Expected array of hierarchy objects'
    });
  }

  const user = request?.user
  const userId = user?.sub;

  logger({
    trace_id: traceId,
    actor: { user_name: user?.preferred_username, user_id: userId },
    data: { count: hierarchiesData.length, program_id },
    eventname: "bulk creating hierarchies",
    status: "in_progress",
    description: `Bulk creating ${hierarchiesData.length} hierarchies for ${program_id}`,
    level: 'info',
    action: request.method,
    url: request.url,
    entity_id: program_id,
    is_deleted: false
  }, HierarchiesModel);

  const transaction = await sequelize.transaction();
  const results = {
    successful: [] as any[],
    failed: [] as any[],
    duplicates: [] as any[]
  };

  try {
    const hierarchyCodes = hierarchiesData.map(h => h.code);

    const existingCodes = await HierarchiesModel.findAll({
      where: {
        code: { [Op.in]: hierarchyCodes },
        program_id,
        is_deleted: false
      },
      attributes: ['code'],
      transaction,
    });

    const existingCodesSet = new Set(existingCodes.map(item => item.code));

    for (let i = 0; i < hierarchiesData.length; i++) {
      const hierarchie = hierarchiesData[i];
      const hierarchyCode = hierarchie.code;

      try {
        if (existingCodesSet.has(hierarchyCode)) {
          results.duplicates.push({
            index: i,
            code: hierarchyCode,
            message: "Hierarchy code already exists"
          });
          continue;
        }

        if (hierarchie.rate_model) {
          const rateModelMap: Record<string, 'bill_rate' | 'markup' | 'pay_rate'> = {
            'Bill Rate (No Markup)': 'bill_rate',
            'Bill Rate (Markup)': 'markup',
            'Pay Rate (Markup)': 'pay_rate'
          };

          const normalizedRateModel = rateModelMap[hierarchie.rate_model];
          if (normalizedRateModel) {
            hierarchie.rate_model = normalizedRateModel;
          } else {
            results.failed.push({
              index: i,
              code: hierarchyCode,
              message: `Invalid rate_model: '${hierarchie.rate_model}'`
            });
            continue;
          }
        }

        let managedById = null;
        if (hierarchie.managed_by) {
          const managedByUser = await TenantModel.findOne({
            where: {
              display_name: hierarchie.managed_by
            },
            attributes: ['id'],
            transaction
          });

          if (managedByUser) {
            managedById = managedByUser.id;
          } else {
            results.failed.push({
              index: i,
              code: hierarchyCode,
              message: `Invalid managed_by: '${hierarchie.managed_by}' not found`
            });
            continue;
          }
        }
        let parentHierarchyId = null;
        if (hierarchie.parent_hierarchy_name && hierarchie.parent_hierarchy_code) {
          const parentHierarchy = await HierarchiesModel.findOne({
            where: {
              name: hierarchie.parent_hierarchy_name,
              code: hierarchie.parent_hierarchy_code,
              program_id,
              is_deleted: false
            },
            attributes: ['id'],
            transaction
          });

          if (parentHierarchy) {
            parentHierarchyId = parentHierarchy.id;
          } else {
            results.failed.push({
              index: i,
              code: hierarchyCode,
              message: `Invalid parent_hierarchy: name='${hierarchie.parent_hierarchy_name}', code='${hierarchie.parent_hierarchy_code}' not found`
            });
            continue;
          }
        }

        const newItem = await HierarchiesModel.create(
          {
            ...hierarchie,
            program_id,
            created_by: userId,
            updated_by: userId,
            managed_by: managedById,
            parent_hierarchy_id: parentHierarchyId,
          },
          { transaction }
        );

        if (Array.isArray(hierarchie.custom_fields) && hierarchie.custom_fields.length > 0) {
          const customFieldNames = hierarchie.custom_fields.map((field: { name: any; value: any }) => field.name);

          const customFieldsFromDB = await CustomField.findAll({
            where: {
              name: { [Op.in]: customFieldNames },
              program_id
            },
            attributes: ['id', 'name'],
            transaction
          });

          const customFieldMap = new Map();
          customFieldsFromDB.forEach((cf: { name: any; id: any; }) => {
            customFieldMap.set(cf.name, cf.id);
          });

          const validCustomFields = [];
          const invalidCustomFields = [];

          for (const field of hierarchie.custom_fields) {
            const customFieldId = customFieldMap.get(field.name);

            if (customFieldId) {
              validCustomFields.push({
                program_id,
                customfield_id: customFieldId,
                value: field.value,
                hierarchy_id: newItem.id,
              });
            } else {
              invalidCustomFields.push(field.name);
            }
          }
          if (invalidCustomFields.length > 0) {
            if (validCustomFields.length > 0) {
              await HierarchyCustomFieldModel.bulkCreate(validCustomFields, { transaction });
            }
          } else {
            await HierarchyCustomFieldModel.bulkCreate(validCustomFields, { transaction });
          }
        }
        existingCodesSet.add(hierarchyCode);

        results.successful.push({
          index: i,
          id: newItem.id,
          code: hierarchyCode,
          message: "Created successfully"
        });

      } catch (itemError) {
        results.failed.push({
          index: i,
          code: hierarchyCode,
          message: (itemError as any).message,
          error: itemError
        });
      }
    }

    await transaction.commit();

    const statusCode = results.failed.length > 0 ? 207 : 201;

    logger({
      trace_id: traceId,
      actor: { user_name: user?.preferred_username, user_id: userId },
      data: {
        total: hierarchiesData.length,
        successful: results.successful.length,
        failed: results.failed.length,
        duplicates: results.duplicates.length
      },
      eventname: "bulk created hierarchies",
      status: results.failed.length > 0 ? "partial_success" : "success",
      description: `Bulk created hierarchies for ${program_id}: ${results.successful.length}/${hierarchiesData.length} successful`,
      level: results.failed.length > 0 ? "warning" : "success",
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false,
    }, HierarchiesModel);

    return reply.status(statusCode).send({
      status_code: statusCode,
      message: `Bulk operation completed. ${results.successful.length} created, ${results.failed.length} failed, ${results.duplicates.length} duplicates`,
      trace_id: traceId,
      summary: {
        total: hierarchiesData.length,
        successful: results.successful.length,
        failed: results.failed.length,
        duplicates: results.duplicates.length
      },
      results: {
        successful: results.successful,
        failed: results.failed,
        duplicates: results.duplicates
      }
    });

  } catch (error) {
    await transaction.rollback();

    logger({
      trace_id: traceId,
      actor: { user_name: user?.preferred_username, user_id: userId },
      data: { count: hierarchiesData.length, program_id },
      eventname: "bulk creating hierarchies",
      status: "error",
      description: `Error bulk creating hierarchies for ${program_id}`,
      level: "error",
      action: request.method,
      url: request.url,
      entity_id: program_id,
      is_deleted: false,
    }, HierarchiesModel);

    console.error(error);
    return reply.status(500).send({
      message: "Failed to bulk create hierarchies",
      error: (error as any).message,
      trace_id: traceId
    });
  }
}