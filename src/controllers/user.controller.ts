import { FastifyRequest, FastifyReply } from "fastify";
import User from "../models/user.model";
import { UserInterface } from "../interfaces/user.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { baseSearch } from "../utility/baseService";
import { UserMappingAttributes } from "../interfaces/user-mapping.interface";
import UserMapping from "../models/user-mapping.model";
import { sequelize } from "../config/instance";
import WorkLocationModel from "../models/work-location.model";
import candidateModel from "../models/candidate.model";
import { CandidateCodeGenerate, CandidateUniqueIdGenerate } from "../utility/code-genrate-service";
import { getHierarchieWithChildren, getMasterData, getWorkLocationTimeZoneByUserId, userQuery, getPendingUserQuery, userHierarchiesQuery, getUserContacts, getUserPrograms, getActiveUsers } from "../utility/queries";
import { QueryTypes } from "sequelize";
import UserMasterDataModel from "../models/user-master-data.model";
import { decodeToken } from "../middlewares/verifyToken";
import JobTempletRepository from "../hooks/job-template-query";
import UserCustomFieldModel from "../models/user-custom-field.model";
import { ProgramVendor } from "../models/program-vendor.model";
import Hierarchies from "../models/hierarchies.model";
import { searchSimilarProfiles } from "../utility/create-candidate";
import { createCandidateHistory } from "../utility/candidate-history";
import GlobalRepository from "../repositories/global.repository";
import { parseValue } from "../utility/parse-value";
import CandidateCustomFieldModel from "../models/cadidate-custom-field.model";
const jobTempletRepositories = new JobTempletRepository();

export async function getUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { is_enabled } = request.query as { is_enabled?: string };
    const whereConditions: any = { is_deleted: false };

    if (is_enabled !== undefined) {
      whereConditions.is_enabled = is_enabled === 'true' ? 1 : 0;
    }

    const result = await User.findAndCountAll({
      where: whereConditions,
      attributes: [
        "id", "name_prefix", "first_name", "middle_name", "last_name",
        "username", "name_suffix", "program_id", "status", "email",
        "avatar", "country_id", "is_enabled", "is_active", "is_deleted"
      ],
      order: [['updated_on', 'DESC']],

    });

    const { rows = [], count } = result;

    if (rows.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "Users not found",
        users: [],
      });
    }

    return reply.status(200).send({
      status_code: 200,
      message: "Users found",
      users: rows,
      total: count,
    });
  } catch (error: any) {
    return reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching users",
      error: error.message,
    });
  }
}

export async function getUserById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params;
    const user = await User.findByPk(id);
    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      user: user ?? [],
      message: user ? undefined : "User not found",
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "Internal server error",
      error: error,
      trace_id: traceId,
    });
  }
}

export async function getUserHierarchiesByProgram(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const { job_template_id } = request.query as { job_template_id: string };
  const user = request?.user;
  try {
    const { id: user_id, program_id } = request.params as { id: string, program_id: string };
    const user = await User.findOne({
      where: { user_id: user_id, program_id },
      attributes: ['associate_hierarchy_ids', 'work_location_ids', 'default_work_location_id', 'default_hierarchy_id', 'is_all_hierarchy_associate'],
    });

    if (!user) {
      return reply.status(200).send({
        status_code: 200,
        trace_id: traceId,
        message: "User not found or no associated hierarchies/work locations for the given program",
        hierarchies: [],
        work_locations: [],
        default_work_location: null,
        default_hierarchy_name: null,
      });
    }

    let associateHierarchyIds = user.is_all_hierarchy_associate
      ? (await Hierarchies.findAll({
        where: { program_id, is_deleted: false, is_enabled: true },
        attributes: ['id'],
      })).map((h: any) => h.id)
      : user.associate_hierarchy_ids ?? [];

    if (job_template_id) {
      const [templateData] = await Promise.all([
        jobTempletRepositories.templateQuery(job_template_id)
      ]);

      const templateHierarchyIds = templateData.map((row: any) => row.hierarchy);

      associateHierarchyIds = associateHierarchyIds.filter((id: string) =>
        templateHierarchyIds.includes(id)
      );
    }

    const hierarchiesWithChildren = await sequelize.query<{ name: any }>(getHierarchieWithChildren, {
      replacements: { program_id },
      type: QueryTypes.SELECT
    });

    if (hierarchiesWithChildren.length === 0) {
      return reply.status(404).send({
        status_code: 404,
        message: 'No hierarchies found for the given program',
        trace_id: traceId,
        hierarchies: [],
        default_hierarchy_name: null,
      });
    }

    const defaultHierarchy = hierarchiesWithChildren.find(
      (hierarchy: any) => hierarchy.id === user.default_hierarchy_id
    );
    const defaultHierarchyName = defaultHierarchy?.name ?? null;

    const buildHierarchy = (data: any, parentId = null) => {
      return data
        .filter((item: any) => item.parent_hierarchy_id === parentId)
        .map((item: any) => {
          const isAssociated = associateHierarchyIds.includes(item.id);
          const children = buildHierarchy(data, item.id);

          if (isAssociated || children.length > 0) {
            return {
              id: item.id,
              parent_hierarchy_id: item.parent_hierarchy_id,
              name: item.name,
              is_enabled: item.is_enabled,
              is_associated: isAssociated,
              hierarchies: children
            };
          }
          return null;
        })
        .filter(Boolean);
    };
    const nestedHierarchy = buildHierarchy(hierarchiesWithChildren);
    const workLocationIds = user?.work_location_ids ?? [];
    const workLocationsData = workLocationIds.length
      ? await WorkLocationModel.findAll({
        where: { id: workLocationIds, is_enabled: true },
        attributes: ['id', 'name'],
      })
      : [];

    const defaultWorkLocation = user?.default_work_location_id
      ? await WorkLocationModel.findByPk(user.default_work_location_id, {
        attributes: ['id', 'name'],
      }) : null;
    const is_all_work_location_associate = workLocationsData.length === 0;

    return reply.status(200).send({
      status_code: 200,
      message: 'Hierarchies and work locations fetched successfully',
      job_manager_hierarchies: {
        user_id,
        program_id,
        default_hierarchy_name: {
          id: user.default_hierarchy_id,
          name: defaultHierarchyName
        },
        hierarchies: nestedHierarchy,
        is_all_work_location_associate,
        work_locations: workLocationsData.map((location) => ({
          id: location.id,
          name: location.name,
        })),
      },
      default_work_location: defaultWorkLocation
        ? { id: defaultWorkLocation.id, name: defaultWorkLocation.name }
        : null,
      trace_id: traceId,
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: error.message,
      trace_id: traceId,
    });
  }
}

export async function createUser(request: FastifyRequest, reply: FastifyReply) {
  const transaction = await sequelize.transaction();

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
  const traceId = (request.body as any)?.trace_id;

  try {
    const { user, user_group_mapping } = request.body as {
      user: UserInterface;
      user_group_mapping: Omit<UserMappingAttributes, "id"> | Omit<UserMappingAttributes, "id">[];
    };

    if (!user?.program_id) {
      await transaction.rollback();
      return reply.status(400).send({
        status_code: 400,
        message: "Missing user or program_id id in request body",
        trace_id: traceId,
      });
    }

    const user_id = user.id;

    const existingUser = await User.findOne({
      where: {
        user_id: user_id,
        tenant_id: user.tenant_id,
        ...(user.program_id && { program_id: user.program_id }),
      },
      transaction,
    });

    if (existingUser) {
      await transaction.rollback();
      return reply.status(400).send({
        status_code: 400,
        message: "User with program_id already exists!",
        trace_id: traceId,
      });
    }

    let newUser;
    const userType = Array.isArray(user_group_mapping)
      ? user_group_mapping[0].user_type.toLowerCase()
      : user_group_mapping.user_type.toLowerCase();

    const { id, ...userWithoutId } = user;
    let candidateId: any;
    let candidateData: any;

    if (userType === "client" || userType === "msp") {
      newUser = await User.create({ ...userWithoutId, user_id: user.id, user_type: userType, created_by: userId, updated_by: userId }, { transaction });
    } else if (userType === "candidate") {
      const program_id = user.program_id;

      if (!program_id) {
        throw new Error("Program ID is required to generate candidate code");
      }

      const vendor = await ProgramVendor.findOne({
        where: {
          program_id: program_id,
          tenant_id: user.tenant_id,
          status: "Active",
        },
      });

      if (!vendor) {
        await transaction.rollback();
        return reply.status(400).send({
          status_code: 400,
          message: "Vendor not found or not active for the given tenant and program.",
          trace_id: traceId,
        });
      }

      let vendor_id = vendor?.id ?? null;

      const existingCandidate = await candidateModel.findOne({
        where: {
          email: user.email,
          vendor_id: vendor_id,
          is_deleted: false,
        },
        transaction,
      });

      if (existingCandidate) {
        await transaction.rollback();
        return reply.status(400).send({
          status_code: 400,
          message: "Candidate with the same email and vendor already exists!",
          trace_id: traceId,
        });
      }

      let candidateCode = await CandidateCodeGenerate(vendor_id, program_id);
      let uniqueId = await CandidateUniqueIdGenerate(program_id, user);

      candidateData = await candidateModel.create({
        ...userWithoutId,
        user_id: user.id,
        candidate_id: candidateCode,
        vendor_id: vendor_id,
        user_type: userType,
        created_by: userId,
        updated_by: userId,
        unique_id: uniqueId
      }, { transaction });

      candidateId = candidateData.id;
      vendor_id = user.tenant_id;
      const candidate_unique_code = candidateData?.candidate_id;

      if (Array.isArray(user.custom_fields) && user.custom_fields.length > 0) {
        const candidateCustomFields = user.custom_fields.map((field: { id: string, value: any }) => ({
          candidate_id: candidateId,
          customfield_id: field.id,
          value: field.value ?? null
        }));
        await CandidateCustomFieldModel.bulkCreate(candidateCustomFields, { transaction });
      }

      createCandidateInAi(user, candidateId, vendor_id, authHeader, program_id, userId, uniqueId, candidateData, candidate_unique_code);
    } else if (userType === "vendor") {
      const vendor = await ProgramVendor.findOne({
        where: {
          program_id: user.program_id,
          tenant_id: user.tenant_id,
          status: "Active",
        },
      });

      if (!vendor) {
        await transaction.rollback();
        return reply.status(400).send({
          status_code: 400,
          message: "Vendor not found or not active for the given tenant and program.",
          trace_id: traceId,
        });
      }

      if (user.program_id) {
        newUser = await User.create({ ...user, user_id: user.id, user_type: userType, created_by: userId, updated_by: userId }, { transaction });
      } else {
        newUser = await User.create({ ...userWithoutId, user_id: user.id, user_type: userType, created_by: userId, updated_by: userId }, { transaction });
      }
    } else {
      newUser = await User.create({ ...userWithoutId, user_id: user.id, user_type: userType, created_by: userId, updated_by: userId }, { transaction });
    }

    if (user.foundational_data && Array.isArray(user.foundational_data)) {
      for (const foundationalEntry of user.foundational_data) {
        await UserMasterDataModel.create({
          user_id: user.id,
          master_data: foundationalEntry.master_data,
          associated_master_data: foundationalEntry.associated_master_data,
          default_master_data: foundationalEntry.default_master_data,
          is_all_associated: foundationalEntry.is_all_associated,
        }, { transaction });
      }
    }

    if (user.foundational_data && Array.isArray(user.foundational_data)) {
      for (const foundationalEntry of user.foundational_data) {
        await UserMasterDataModel.create({
          user_id: user.id,
          master_data: foundationalEntry.master_data,
          associated_master_data: foundationalEntry.associated_master_data,
          default_master_data: foundationalEntry.default_master_data,
          is_all_associated: foundationalEntry.is_all_associated,
        }, { transaction });
      }
    }

    if (Array.isArray(user.custom_fields) && user.custom_fields.length > 0) {
      const customField = user.custom_fields.map((field: { id: any; value: any }) => ({
        program_id: user.program_id,
        user_id: user.id,
        customfield_id: field.id,
        value: field.value,
      }));
      await UserCustomFieldModel.bulkCreate(customField, { transaction });
    }

    if (Array.isArray(user_group_mapping)) {
      for (const mapping of user_group_mapping) {
        await UserMapping.create({ ...mapping, user_type: userType, created_by: userId, updated_by: userId }, { transaction });
      }
    } else {
      await UserMapping.create({ ...user_group_mapping, user_type: userType, created_by: userId, updated_by: userId }, { transaction });
    }

    console.log("Candidate History ------------------------->");
    const compareData = {};
    if (userType === "candidate") {
      console.log("Call  Candidate History");
      createCandidateHistory(user.program_id, authHeader, candidateData, compareData, "Candidate Profile Created")
        .catch(error => {
          console.error("Failed to create candidate history:", error);
        });
    }

    await transaction.commit();
    return reply.status(201).send({
      status_code: 201,
      message: "User created successfully",
      id: newUser instanceof User ? newUser.id : candidateId,
      trace_id: traceId,
    });

  } catch (error: any) {
    await transaction.rollback();
    console.error(error);
    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors[0].path;
      return reply.status(400).send({
        status_code: 400,
        message: `${field} already in use!`,
        trace_id: traceId,
      });
    }

    return reply.status(500).send({
      status_code: 500,
      message: "Internal server error",
      error: error.message,
      trace_id: traceId,
    });
  }
}


function createCandidateInAi(user: any, candidateId: string, vendor_id: any, authHeader: string, program_id: string, userId: string, uniqueId: string, candidateData: any, candidate_unique_code: any) {
  const resumeText = user.resume_url;

  searchSimilarProfiles(candidateId, resumeText, vendor_id, authHeader, program_id, userId, uniqueId, user, candidateData, candidate_unique_code);
}



export async function updateUser(request: FastifyRequest, reply: FastifyReply) {
  const { id, program_id } = request.params as { id: string; program_id: string };
  const { user: userBody, user_group_mapping: userGroupMappings } = request.body as { user: UserInterface; user_group_mapping: UserMappingAttributes };
  const { id: userIdToExclude, ...updates } = userBody;
  const traceId = generateCustomUUID();
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      status_code: 401,
      message: 'Unauthorized - Token not found',
    });
  }

  const token = authHeader.split(' ')[1];
  const decodedUser = await decodeToken(token);
  if (!decodedUser) {
    return reply.status(401).send({
      status_code: 401,
      message: 'Unauthorized - Invalid token',
    });
  }

  const userId = decodedUser.sub;

  try {
    const user = await User.findOne({ where: { user_id: id, program_id } });
    if (!user) {
      return reply.status(404).send({
        status_code: 404,
        message: 'User not found',
        trace_id: traceId,
        user: [],
      });
    }
    updates.updated_on = BigInt(Date.now());
    updates.updated_by = userId;
    updates.updated_by = userId;
    updates.user_type = updates.user_type?.toLowerCase();
    await user.update(updates);
    if (Array.isArray(userBody.foundational_data) && userBody.foundational_data.length > 0) {
      await UserMasterDataModel.destroy({ where: { user_id: user.user_id } });

      const foundationalData = userBody.foundational_data.map((item) => ({
        user_id: user.user_id,
        master_data: item.master_data,
        associated_master_data: item.associated_master_data,
        default_master_data: item.default_master_data || null,
        is_all_associated: item.is_all_associated || false,
      }));

      await UserMasterDataModel.bulkCreate(foundationalData);
    }
    if (Array.isArray(userBody.custom_fields) && userBody.custom_fields.length > 0) {
      await UserCustomFieldModel.destroy({ where: { user_id: user.user_id } });

      const customField = userBody.custom_fields.map((field: { id: string; value: any }) => ({
        program_id,
        customfield_id: field.id,
        value: field.value,
        user_id: user.user_id,
      }));

      await UserCustomFieldModel.bulkCreate(customField);
    }

    if (Array.isArray(userGroupMappings) && userGroupMappings.length > 0) {
      await UserMapping.destroy({ where: { user_id: user.user_id } });

      const groupMappingData = userGroupMappings.map((mapping) => ({
        id: mapping.id,
        tenant_id: mapping.tenant_id,
        user_id: user.user_id,
        user_type: mapping.user_type?.toLowerCase(),
        role_id: mapping.role_id,
        program_id: mapping.program_id,
        is_active: mapping.is_active,
        status: mapping.status,
        updated_on: Date.now(),
      }));

      await UserMapping.bulkCreate(groupMappingData);
    }

    if (userBody.user_type === "vendor") {
      await updateProgramVendor(userBody, id)
    }

    return reply.status(200).send({
      status_code: 200,
      trace_id: traceId,
      message: 'User updated successfully',
      id: user.user_id,
    });
  } catch (error: unknown) {
    console.error('Error updating user:', error);

    return reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}

export async function updateProgramVendor(userBody: any, id: string): Promise<any> {
  const contactInfo = [
    {
      first_name: userBody.first_name,
      middle_name: userBody.middle_name,
      last_name: userBody.last_name,
      email: userBody.email,
      number: userBody.contacts?.[0]?.number,
      iso_code_2: userBody.contacts?.[0]?.iso_code_2,
      isd_code: userBody.contacts?.[0]?.isd_code,
      country: userBody.country_id,
      addresses: Array.isArray(userBody.addresses)
        ? userBody.addresses.map((addr: { type: any; address_line_1: any; address_line_2: any; zipcode: any; city_name: any; state_name: any; county_name: any; }) => ({
          type: addr.type,
          address_line_1: addr.address_line_1,
          address_line_2: addr.address_line_2 || '',
          country: userBody.country_id,
          zipcode: addr.zipcode,
          city_name: addr.city_name,
          state_name: addr.state_name,
          county_name: addr.county_name,
        }))
        : [],
    },
  ];
  const programVendor = await ProgramVendor.findOne({
    where: {
      user_id: id,
      program_id: userBody.program_id,
      tenant_id: userBody.tenant_id
    },
  });
  if (programVendor) {
    await programVendor.update({
      contact: contactInfo,
      addresses: contactInfo?.[0]?.addresses || [],
    });
  }
}

export async function deleteUser(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  const user = request?.user;
  const userId = user?.sub;
  try {
    const { id } = request.params;
    const numRowsDeleted = await User.destroy({ where: { id } });
    if (numRowsDeleted > 0) {
      return reply.status(201).send({
        status_code: 201,
        message: "User deleted succesfully",
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: "User not found",
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while deleting User",
      trace_id: traceId,
      error: error,
    });
  }
}

export async function getAllUserIDAndUserId(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const {
    user_id,
    user_type,
    first_name,
    is_activated,
    role_id,
    tenant_id,
    status,
    email,
    hierarchy_id,
    page = '1',
    limit = '10',
  } = request.query as {
    user_id?: string;
    user_type?: string;
    first_name?: string;
    is_activated?: boolean;
    status?: string;
    role_id?: string;
    tenant_id?: string;
    email?: string;
    hierarchy_id?: string;
    page?: string;
    limit?: string;
  };
  const traceId = generateCustomUUID();
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const user = request?.user;
  let mspHierarchyIds: string[] = [];
  if (user) {
    const hierarchyData = await GlobalRepository.getUserHierarchyData(program_id, user);
    mspHierarchyIds = hierarchyData.mspHierarchyIds || [];
  }
  const hierarchyIdsArray = hierarchy_id ? hierarchy_id.split(',') : [];
  const isActivatedStr = typeof is_activated === 'boolean' ? is_activated.toString() : is_activated;

  try {
    const hierarchyReplacements = Object.fromEntries(
      hierarchyIdsArray.map((id, index) => [`hierarchy_id_${index}`, id])
    );

    const mspHierarchyReplacements = mspHierarchyIds.length > 0
      ? Object.fromEntries(
        mspHierarchyIds.map((id, index) => [`msp_hierarchy_id_${index}`, id])
      )
      : {};

    const users = await sequelize.query(
      userQuery(first_name, email, tenant_id, role_id, isActivatedStr, user_type, status, user_id, hierarchyIdsArray, mspHierarchyIds),
      {
        replacements: {
          program_id,
          user_id,
          user_type,
          status,
          is_activated: isActivatedStr === 'true',
          role_id,
          tenant_id,
          email,
          first_name,
          limit: parseInt(limit),
          offset,
          ...hierarchyReplacements,
          ...mspHierarchyReplacements
        },
        type: QueryTypes.SELECT,
      }
    ) as any[];

    for (const user of users) {
      const masterData = await sequelize.query(getMasterData, {
        replacements: { user_id: user.user_id, program_id },
        type: QueryTypes.SELECT,
      }) as any[];
      user.foundational_data = masterData.map(item => item.foundational_data);
    }

    const total_count = users.length > 0 ? users[0].total_count : 0;

    reply.status(200).send({
      status_code: 200,
      message: 'Users fetched successfully!',
      trace_id: traceId,
      users,
      total_count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error: any) {
    console.log('Error:', error.stack);

    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
}

export async function searchUser(request: FastifyRequest, reply: FastifyReply) {
  const searchFields = ['is_enabled', 'program_id', 'first_name'];
  const responseFields = ['id', 'program_id', 'country_id', 'title', 'name_prefix', 'middle_name', 'is_enabled', 'addresses', 'contacts', 'name_suffix', 'email', 'created_on', 'updated_on', 'created_by', 'updated_by', 'is_deleted', 'ref_id'];
  return baseSearch(request, reply, User, searchFields, responseFields);
}

const setAssociations = async (newUser: any, user: UserInterface, transaction: any) => {
  if (user.associate_hierarchy_ids) {
    await newUser.setHierarchies(user.associate_hierarchy_ids, { transaction });
  }

  if (user.work_location_ids) {
    await newUser.setWork_locations(user.work_location_ids, { transaction });
  }
};
interface UserLocationAndTimeZone {
  work_location: { work_location_id: string; work_location_name: string }[];
  time_zone: { time_zone_id: string; time_zone_name: string }[];
}

export async function getUserWorkLocationAndTimeZone(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const { user_ids } = request.query as { user_ids: string };
  const trace_id = generateCustomUUID();

  if (!user_ids) {
    return reply.status(400).send({
      status_code: 400,
      message: "Missing user_ids in the query string.",
      trace_id,
    });
  }

  try {
    const userIdsArray = user_ids.split(',');

    const [result] = (await sequelize.query(getWorkLocationTimeZoneByUserId, {
      replacements: { user_ids: userIdsArray, program_id },
      type: QueryTypes.SELECT,
    })) as [UserLocationAndTimeZone | undefined];

    if (!result) {
      return reply.status(200).send({
        status_code: 200,
        message: "No data found for the provided user IDs and program ID.",
        data: {
          work_location: [],
          time_zone: [],
        },
        trace_id,
      });
    }

    const uniqueWorkLocations = removeDuplicates(result.work_location || [], 'work_location_id');
    const uniqueTimeZones = removeDuplicates(result.time_zone || [], 'time_zone_name');

    return reply.status(200).send({
      status_code: 200,
      message: "User work locations and time zones retrieved successfully.",
      data: {
        work_location: uniqueWorkLocations,
        time_zone: uniqueTimeZones,
      },
      trace_id,
    });
  } catch (error) {
    console.error("Error retrieving work location and time zone:", error);
    return reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id,
    });
  }
}

function removeDuplicates<T>(array: T[], key: keyof T): T[] {
  const seen = new Set();
  return array.filter((item) => {
    const identifier = item[key];
    if (seen.has(identifier)) return false;
    seen.add(identifier);
    return true;
  });
}


export async function getPendingUser(
  request: FastifyRequest<{
    Params: { program_id: string, user_mapping_id: string };
    // Querystring: { user_mapping_id: string };
  }>,
  reply: FastifyReply
) {
  const { program_id, user_mapping_id } = request.params;
  // const { user_mapping_id } = request.query;
  const traceId = generateCustomUUID()

  try {
    const replacements = { program_id, user_mapping_id };
    const users = await sequelize.query(getPendingUserQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }) as any;

    if (users && users.length > 0) {
      if (users.custom_fields && Array.isArray(users.custom_fields)) {
        users.custom_fields = users.custom_fields.map((field: any) => ({
          ...field,
          value: parseValue(field.value),
        }));
      }
      return reply.code(200).send({
        status_code: 200,
        message: "get pending user data",
        users: [users[0]],
        trace_id: traceId
      });
    } else {
      return reply
        .code(200)
        .send({ status_code: 200, message: "No matching records found.", users: [], trace_id: traceId });
    }
  } catch (error: any) {
    return reply.code(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error.message
    });
  }
}


export async function getUserAndHierarchieId(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const { user_id, hierarchy_id } = request.query as { user_id: string; hierarchy_id: string };
  const traceId = generateCustomUUID();

  if (!user_id || !hierarchy_id) {
    return reply.status(400).send({
      status_code: 400,
      trace_id: traceId,
      message: 'Missing required query parameters: user_id and hierarchy_id are mandatory.',
    });
  }

  const hierarchyIdsArray = hierarchy_id.split(',');

  try {
    const hierarchyReplacements = Object.fromEntries(
      hierarchyIdsArray.map((id, index) => [`hierarchy_id_${index}`, id])
    );
    const user = await sequelize.query(
      userHierarchiesQuery(user_id, hierarchyIdsArray),
      {
        replacements: {
          program_id,
          user_id,
          ...hierarchyReplacements,
        },
        type: QueryTypes.SELECT,
      }
    ) as any[];

    if (user.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: 'User not found',
        trace_id: traceId,
      });
    }

    reply.status(200).send({
      status_code: 200,
      message: 'User fetched successfully!',
      trace_id: traceId,
      user: user[0],
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
}

export async function getActiveUser(request: FastifyRequest, reply: FastifyReply) {
  const userTokenData = request?.user;

  const { program_id } = request.params as { program_id: string };
  const { hierarchy_id ,is_msp } = request.query as { hierarchy_id?: string ,is_msp?:string };
  const traceId = generateCustomUUID();
  const userId = userTokenData?.sub;
  const userType = userTokenData?.userType;

  try {
    let isSuperUser = userType === "super_user";
    let allowedHierarchyIds: string[] | null = null;
    let isAllHierarchyAssociateParam = false;
    let currentUserHierarchyIds: string[] = [];

    if (isSuperUser) {
      if (hierarchy_id) {
        allowedHierarchyIds = hierarchy_id.split(',').map(id => id.trim());
      }
    } else {
      const currentUser = await User.findOne({
        where: { program_id, user_id: userId },
        attributes: ["associate_hierarchy_ids", "is_all_hierarchy_associate"],
      }) as any;

      if (!currentUser) {
        return reply.status(404).send({
          status_code: 404,
          message: "User not found",
          trace_id: traceId,
        });
      }

      const isAllHierarchyAssociate = currentUser.dataValues.is_all_hierarchy_associate;
      isAllHierarchyAssociateParam = isAllHierarchyAssociate;
      currentUserHierarchyIds = currentUser.dataValues.associate_hierarchy_ids || [];

      let accessibleHierarchyIds: string[] = currentUserHierarchyIds.map(String);

      if (hierarchy_id) {
        const filterHierarchyIds = hierarchy_id.split(',').map(id => id.trim());

        if (isAllHierarchyAssociate) {
          allowedHierarchyIds = filterHierarchyIds;
        } else {
          allowedHierarchyIds = filterHierarchyIds.filter(id => accessibleHierarchyIds.includes(id));

          if (allowedHierarchyIds.length === 0) {
            return reply.code(200).send({
              status_code: 200,
              message: "No matching records found.",
              users: [],
              trace_id: traceId,
            });
          }
        }
      } else {
        allowedHierarchyIds = accessibleHierarchyIds.length > 0 ? accessibleHierarchyIds : null;
      }
    }

    const replacements = {
      program_id,
      is_super_user: isSuperUser,
      is_all_hierarchy_associate_param: isAllHierarchyAssociateParam,
      allowed_hierarchy_ids: allowedHierarchyIds ? JSON.stringify(allowedHierarchyIds) : null,
      current_user_hierarchy_ids: currentUserHierarchyIds.length > 0 ? JSON.stringify(currentUserHierarchyIds) : null,
      is_msp: is_msp === 'true' ? true : false,
    };

    console.log("Query parameters:", {
      isSuperUser,
      isAllHierarchyAssociateParam,
      allowedHierarchyIds,
      currentUserHierarchyIds,
      is_msp
    });

    const users = await sequelize.query(getActiveUsers, {
      replacements,
      type: QueryTypes.SELECT,
    });

    return reply.code(200).send({
      status_code: 200,
      message: users.length > 0 ? "Get active user data" : "No matching records found.",
      users,
      trace_id: traceId,
    });
  } catch (error: any) {
    return reply.code(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error.message,
    });
  }
}


export async function getUserContact(
  request: FastifyRequest<{
    Querystring: { tenant_id: string };
  }>,
  reply: FastifyReply
) {

  const { tenant_id } = request.query as { tenant_id: string };
  const traceId = generateCustomUUID();

  try {
    const replacements = {
      tenant_id
    };

    const data = await sequelize.query(getUserContacts, {
      replacements,
      type: QueryTypes.SELECT,
    });

    if (data && data.length > 0) {
      return reply.code(200).send({
        status_code: 200,
        message: "Get user contact user data",
        data,
        trace_id: traceId
      });
    } else {
      return reply
        .code(200)
        .send({ status_code: 200, message: "No matching records found.", data: [], trace_id: traceId });
    }
  } catch (error: any) {
    return reply.code(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error.message
    });
  }
}

export async function getUserProgram(
  request: FastifyRequest<{
    Querystring: { user_id: string; search?: string };
  }>,
  reply: FastifyReply
) {
  const user = request?.user;
  const userType = user?.userType;
  const { user_id, search } = request.query as { user_id: string, search: string };
  const traceId = generateCustomUUID();

  if (!user_id || user_id.trim() === "") {
    return reply.code(400).send({
      status_code: 400,
      message: "Bad Request: user_id is required.",
      trace_id: traceId,
    });
  }

  try {
    const isSuperAdmin = userType === "super_user";
    console.log("isSuperAdmin", isSuperAdmin)
    const replacements: any = isSuperAdmin ? {} : { user_id };
    if (search) {
      replacements.search = `%${search}%`;
    }

    const data = await getUserPrograms(replacements, isSuperAdmin);

    return reply.code(200).send({
      status_code: 200,
      message: data.length > 0 ? "Get user program data" : "No matching records found.",
      data: data.length > 0 ? data : [],
      trace_id: traceId,
    });
  } catch (error: any) {
    return reply.code(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error.message,
    });
  }
}

export async function getAllUserIDAndUser(request: FastifyRequest, reply: FastifyReply) {
  const { program_id } = request.params as { program_id: string };
  const {
    user_id,
    user_type,
    first_name,
    is_activated,
    role_id,
    tenant_id,
    status,
    email,
    hierarchy_id,
    page = '1',
    limit = '10',
  } = request.body as {
    user_id?: string;
    user_type?: string;
    first_name?: string;
    is_activated?: boolean;
    status?: string;
    role_id?: string;
    tenant_id?: string;
    email?: string;
    hierarchy_id?: any;
    page?: string;
    limit?: string;
  };
  const traceId = generateCustomUUID();
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const user = request?.user;
  let mspHierarchyIds: string[] = [];
  if (user) {
    const hierarchyData = await GlobalRepository.getUserHierarchyData(program_id, user);
    mspHierarchyIds = hierarchyData.mspHierarchyIds || [];
  }

  const isActivatedStr = typeof is_activated === 'boolean' ? is_activated.toString() : is_activated;
 const  hierarchyIds = Array.isArray(hierarchy_id) ? hierarchy_id : hierarchy_id ? [hierarchy_id] : [];

  try {
    const hierarchyReplacements = Object.fromEntries(
      hierarchyIds.map((id: any, index: any) => [`hierarchy_id_${index}`, id])
    );

    const mspHierarchyReplacements = mspHierarchyIds.length > 0
      ? Object.fromEntries(
        mspHierarchyIds.map((id, index) => [`msp_hierarchy_id_${index}`, id])
      )
      : {};

    const users = await sequelize.query(
      userQuery(first_name, email, tenant_id, role_id, isActivatedStr, user_type, status, user_id, hierarchy_id, mspHierarchyIds),
      {
        replacements: {
          program_id,
          user_id,
          user_type,
          status,
          is_activated: isActivatedStr === 'true',
          role_id,
          tenant_id,
          email,
          first_name,
          limit: parseInt(limit),
          offset,
          ...hierarchyReplacements,
          ...mspHierarchyReplacements
        },
        type: QueryTypes.SELECT,
      }
    ) as any[];

    for (const user of users) {
      const masterData = await sequelize.query(getMasterData, {
        replacements: { user_id: user.user_id, program_id },
        type: QueryTypes.SELECT,
      }) as any[];
      user.foundational_data = masterData.map(item => item.foundational_data);
    }

    const total_count = users.length > 0 ? users[0].total_count : 0;

    reply.status(200).send({
      status_code: 200,
      message: 'Users fetched successfully!',
      trace_id: traceId,
      users,
      total_count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error: any) {
    console.log('Error:', error.stack);

    reply.status(500).send({
      status_code: 500,
      trace_id: traceId,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
}
