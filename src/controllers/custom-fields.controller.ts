import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomFields, GetQueryInterface } from '../interfaces/custom-fields.interface';
import WorkLocationModel from '../models/work-location.model';
import hierarchies from '../models/hierarchies.model';
import generateCustomUUID from '../utility/genrateTraceId';
import customFieldsHierarchie from '../models/custom-field-hierarchie.model';
import customFieldLocations from '../models/custom-field-location.model';
import CustomField from '../models/custom-fields.model'
import { saveCustomFieldsMasterData } from './custom-field-master-data.controller';
import { createCustomFieldLocations } from './custom-field-location.controller';
import { saveCustomFieldsHierarchies } from './custom-field-hierarchie.controller';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { Op, QueryTypes, Sequelize } from 'sequelize';
import PicklistModel from '../models/picklist.model';
import PicklistItemModel from '../models/picklist-item.model';
import CustomFieldMaterData from '../models/custom-field-master-data.model';
import FoundationalDataTypes from '../models/master-datatypes.model';
import Hierarchies from '../models/hierarchies.model';
import { sequelize } from '../config/instance';
import { validateLabel } from '../plugins/labelValidator'


export const saveCustomFields = async (request: FastifyRequest<{}>, reply: FastifyReply) => {
  const { program_id } = request.params as { program_id: string };
  const { work_location_ids, hierarchy_ids, master_data_id, modules, label, name, module_id, ...customFieldData } = request.body as any;
  const traceId = generateCustomUUID();
  const user = request?.user
  if (!validateProgramId(program_id, reply, traceId)) return;

  generateSlugIfNeeded(name, customFieldData);

  try {
    validateLabel(label);

    const existingField = await CustomField.findOne({
      where: {
        program_id,
        is_deleted: false,
        [Op.and]: [{ name }, { label }, { module_id }]
      }
    });

    if (existingField) {
      let errorMessage = 'Custom field already exists';

      if (existingField.name === name) {
        errorMessage += ' with this name';
      }
      if (existingField.label === label) {
        errorMessage += ' with this label';
      }
      if (existingField.module_id === module_id) {
        errorMessage += ' with this module';
      }

      return reply.status(400).send({
        status_code: 400,
        message: errorMessage,
        trace_id: traceId,
      });
    }
    const seqNumber = await CustomField.max('seq_number', {
      where: {
        program_id,
        module_id,
        is_deleted: false,
      },
    }) as number || null;
    const newSeqNumber = (seqNumber || 0) + 1;
    const customField = await createCustomField({ label, name, module_id, seq_number: newSeqNumber, ...customFieldData }, user);
    if (!customField?.id) {
      throw new Error('Failed to create custom field');
    }

    const custom_field_id = customField.id;

    await Promise.all([
      ...(work_location_ids?.map((work_location_id: string) => createCustomFieldLocations(custom_field_id, work_location_id, program_id)) || []),
      ...(hierarchy_ids?.map((hierarchy_id: string) => saveCustomFieldsHierarchies(custom_field_id, hierarchy_id, program_id)) || []),
    ]);

    // Handle master_data_id separately to avoid nested ternary
    if (master_data_id) {
      if (Array.isArray(master_data_id)) {
        await Promise.all(master_data_id.map((m_id: string) =>
          saveCustomFieldsMasterData(custom_field_id, m_id)));
      } else {
        await saveCustomFieldsMasterData(custom_field_id, master_data_id);
      }
    }

    logSuccess(traceId, user, request, program_id);
    return reply.status(201).send({
      status_code: 201,
      message: 'Custom field created successfully.',
      trace_id: traceId,
    });

  } catch (error: any) {
    console.error('Error processing custom field:', error);
    logError(traceId, user, request, program_id);
    return reply.status(200).send({
      status_code: 200,
      message: error.message || 'Validation failed',
      trace_id: traceId,
    });
  }
};

// Helper functions
const validateProgramId = (program_id: string | undefined, reply: FastifyReply, trace_id: string) => {
  const traceId = generateCustomUUID();
  if (!program_id) {
    reply.status(400).send({
      status_code: 400,
      message: 'Program ID is required.',
      trace_id: traceId,
    });
    return false;
  }
  return true;
};

const generateSlugIfNeeded = (name: string | undefined, customFieldData: any) => {
  if (name !== undefined) {
    customFieldData.slug = name.trim().split(' ').length > 1
      ? name.toLowerCase().split(' ').join('-')
      : name.toLowerCase();
  }
};

const validateLabelLength = (label: string | undefined, reply: FastifyReply, trace_id: string) => {
  const traceId = generateCustomUUID();
  if (label && label.length > 64) {
    reply.status(400).send({
      status_code: 400,
      message: 'Invalid label, Maximum 64 characters.',
      trace_id: traceId,
    });
    return false;
  }
  return true;
};

const validateNameLength = (name: string | undefined, reply: FastifyReply, trace_id: string) => {
  const traceId = generateCustomUUID();
  if (name && name.length < 3) {
    reply.status(400).send({
      status_code: 400,
      message: 'Invalid name, Minimum 3 characters.',
      trace_id: traceId,
    });
    return false;
  }
  return true;
};

const validateAuthHeader = async (request: FastifyRequest<{}>, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  if (!(authHeader?.startsWith('Bearer '))) {
    reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    return null;
  }

  const token = authHeader.split(' ')[1];
  const user: any = await decodeToken(token);
  if (!user) {
    reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    return null;
  }
  return user;
};

const logCreatingCustomField = (trace_id: string, user: any, request: FastifyRequest<{}>, program_id: string) => {
  logger({
    trace_id,
    actor: {
      user_name: user?.preferred_username,
      user_id: user?.sub,
    },
    data: request.body,
    eventname: "creating customField",
    status: "success",
    description: `Creating customField for ${program_id}`,
    level: 'info',
    action: request.method,
    url: request.url,
    entity_id: program_id,
    is_deleted: false
  }, CustomField);
};

const logSuccess = (trace_id: string, user: any, request: FastifyRequest<{}>, program_id: string) => {
  logger({
    trace_id,
    actor: {
      user_name: user?.preferred_username,
      user_id: user?.sub,
    },
    data: request.body,
    eventname: "create customField",
    status: "success",
    description: `create customField for ${program_id} successfully`,
    level: 'success',
    action: request.method,
    url: request.url,
    entity_id: program_id,
    is_deleted: false
  }, CustomField);
};

const logError = (trace_id: string, user: any, request: FastifyRequest<{}>, program_id: string) => {
  logger({
    trace_id,
    actor: {
      user_name: user?.preferred_username,
      user_id: user?.sub,
    },
    data: request.body,
    eventname: "create customField",
    status: "error",
    description: `error to create customField for ${program_id}`,
    level: 'error',
    action: request.method,
    url: request.url,
    entity_id: program_id,
    is_deleted: false
  }, CustomField);
};

export const createCustomField = async (data: any, user: any) => {
  try {
    console.log("Data to be inserted:", data);
    const userId = user?.sub
    const customFieldData = await CustomField.create({ ...data, created_by: userId, updated_by: userId });
    console.log("Inserted customFieldData:", customFieldData);
    return customFieldData;
  } catch (error) {
    console.error('Error during custom field creation:', error);
    throw error;
  }
};

export async function getAllCustomFields(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const user = request.user;
  const userId = user?.sub;
  console.log("userId", userId);
  const { program_id } = request.params as { program_id: string };
  const { hierarchy_ids, is_enabled, name, module_name, label, field_type, is_required, updated_on, slug, user_type, is_dependant_field, page = '1', limit = '10' } = request.query as GetQueryInterface;

  try {
    let userType = user?.userType;

    if (userType != 'super_user') {
      const [userTypeResult] = await sequelize.query(
        `SELECT user_type FROM user WHERE program_id = :program_id AND user_id = :user_id`,
        {
          replacements: { program_id, user_id: userId },
          type: QueryTypes.SELECT,
        }
      ) as any;

      userType = userTypeResult?.user_type;
    }
    console.log("userType", userType);
    if (!userType) {
      return reply.status(400).send({
        status_code: 400,
        message: 'User type not found for the given user.',
        trace_id: traceId,
      });
    }

    // Build where clause
    const whereClause: any = {
      program_id,
      is_deleted: false,
    };

    const andConditions: any[] = []

    // Only add general permission check if no module_name filter is specified
    if (userType !== 'super_user' && !module_name) {
      andConditions.push(
        Sequelize.literal(`(
          JSON_CONTAINS(can_edit, JSON_QUOTE(:userType)) OR 
          JSON_CONTAINS(can_view, JSON_QUOTE(:userType))
        )`)
      );
    }

    if (user_type && userType != "super_user") {
      andConditions.push(
        Sequelize.literal(`LOWER(organization_category) = LOWER('${user_type}')`)
      );
    }

    if (is_enabled) {
      const isEnabledValue = is_enabled === 'true' ? 1 : 0;
      whereClause.is_enabled = { [Op.eq]: isEnabledValue };
    }
    if (slug) whereClause.slug = { [Op.like]: `%${slug}%` };
    if (name) whereClause.name = { [Op.like]: `%${name}%` };
    if (label) whereClause.label = { [Op.like]: `%${label}%` };
    if (field_type) whereClause.field_type = { [Op.like]: `%${field_type}%` };

    if (is_required) {
      const isRequiredValue = is_required === 'true' ? 1 : 0;
      whereClause.is_required = { [Op.eq]: isRequiredValue };
    }

    if (updated_on) {
      whereClause.updated_on = { [Op.like]: `${updated_on}` };
    }

    if (module_name) {
      if (module_name === 'Assignment Revision') {
        andConditions.push(
          Sequelize.literal(`
      (
        (
          module_name IN ('Assignment', 'Assignment Revision')
          OR JSON_CONTAINS(linked_modules, JSON_OBJECT('linked', true, 'module_name', 'Assignment'))
          OR JSON_CONTAINS(linked_modules, JSON_OBJECT('linked', true, 'module_name', 'Assignment Revision'))
        )
        ${userType !== 'super_user' ? `AND (
          -- Permissions on root-level can_edit or can_view
          EXISTS (
            SELECT 1 FROM JSON_TABLE(can_edit, '$[*]' COLUMNS (role VARCHAR(255) PATH '$')) AS edit_roles
            WHERE LOWER(edit_roles.role) = LOWER('${userType}')
          )
          OR
          EXISTS (
            SELECT 1 FROM JSON_TABLE(can_view, '$[*]' COLUMNS (role VARCHAR(255) PATH '$')) AS view_roles
            WHERE LOWER(view_roles.role) = LOWER('${userType}')
          )
          -- Permissions inside linked_modules (for Assignment or Assignment Revision)
          OR EXISTS (
            SELECT 1 FROM JSON_TABLE(linked_modules, '$[*]' COLUMNS (
              linked BOOLEAN PATH '$.linked',
              module_name VARCHAR(255) PATH '$.module_name',
              can_edit JSON PATH '$.can_edit',
              can_view JSON PATH '$.can_view'
            )) AS jt_perm
            WHERE jt_perm.linked = true
              AND jt_perm.module_name IN ('Assignment', 'Assignment Revision')
              AND (
                EXISTS (
                  SELECT 1 FROM JSON_TABLE(jt_perm.can_edit, '$[*]' COLUMNS (role VARCHAR(255) PATH '$')) AS edit_roles
                  WHERE LOWER(edit_roles.role) = LOWER('${userType}')
                )
                OR
                EXISTS (
                  SELECT 1 FROM JSON_TABLE(jt_perm.can_view, '$[*]' COLUMNS (role VARCHAR(255) PATH '$')) AS view_roles
                  WHERE LOWER(view_roles.role) = LOWER('${userType}')
                )
              )
          )
        )` : ''}
      )
    `)
        );
      }
      else if (userType === 'super_user') {
        andConditions.push({
          [Op.or]: [
            { module_name: { [Op.eq]: module_name } },
            Sequelize.literal(`
          JSON_CONTAINS(linked_modules, JSON_OBJECT('linked', true, 'module_name', '${module_name}'))
        `)
          ]
        });
      } else {
        andConditions.push(
          Sequelize.literal(`
        (
          (
            -- Check if module is linked and user has permission in linked_modules
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM JSON_TABLE(linked_modules, '$[*]' COLUMNS (
                  linked BOOLEAN PATH '$.linked',
                  module_name VARCHAR(255) PATH '$.module_name'
                )) AS jt_exists
                WHERE jt_exists.linked = true
                  AND jt_exists.module_name = '${module_name}'
              )
              THEN (
                EXISTS (
                  SELECT 1 FROM JSON_TABLE(linked_modules, '$[*]' COLUMNS (
                    linked BOOLEAN PATH '$.linked',
                    module_name VARCHAR(255) PATH '$.module_name',
                    can_edit JSON PATH '$.can_edit',
                    can_view JSON PATH '$.can_view'
                  )) AS jt_perm
                  WHERE jt_perm.linked = true
                    AND jt_perm.module_name = '${module_name}'
                    AND (
                      EXISTS (
                        SELECT 1 FROM JSON_TABLE(jt_perm.can_edit, '$[*]' COLUMNS (role VARCHAR(255) PATH '$')) AS edit_roles
                        WHERE LOWER(edit_roles.role) = LOWER('${userType}')
                      )
                      OR
                      EXISTS (
                        SELECT 1 FROM JSON_TABLE(jt_perm.can_view, '$[*]' COLUMNS (role VARCHAR(255) PATH '$')) AS view_roles
                        WHERE LOWER(view_roles.role) = LOWER('${userType}')
                      )
                    )
                )
              )
              ELSE (
                -- If module is not linked, check root level module and permissions
                module_name LIKE '%${module_name}%'
                AND (
                  EXISTS (
                    SELECT 1 FROM JSON_TABLE(can_edit, '$[*]' COLUMNS (role VARCHAR(255) PATH '$')) AS edit_roles
                    WHERE LOWER(edit_roles.role) = LOWER('${userType}')
                  )
                  OR
                  EXISTS (
                    SELECT 1 FROM JSON_TABLE(can_view, '$[*]' COLUMNS (role VARCHAR(255) PATH '$')) AS view_roles
                    WHERE LOWER(view_roles.role) = LOWER('${userType}')
                  )
                )
              )
            END = 1
          )
        )
      `)
        );
      }
    } else {
      if (userType !== 'super_user') {
        andConditions.push(
          Sequelize.literal(`(
        JSON_CONTAINS(can_edit, JSON_QUOTE('${userType}')) OR 
        JSON_CONTAINS(can_view, JSON_QUOTE('${userType}'))
      )`)
        );
      }
    }


    if (hierarchy_ids) {
      const hierarchyArray = hierarchy_ids.split(',').map((id: string) => `'${id.trim()}'`);
      if (hierarchyArray.length > 0) {
        andConditions.push({
          [Op.or]: [
            {
              id: {
                [Op.in]: Sequelize.literal(`(
                  SELECT custom_field_id
                  FROM custom_fields_hierarchie
                  WHERE hierarchy_id IN (${hierarchyArray.join(',')})
                )`)
              }
            },
            { is_all_hierarchy: true }
          ]
        });
      }
    }

    whereClause[Op.and] = andConditions;
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    const result = await CustomField.findAndCountAll({
      where: whereClause,
      attributes: [
        "id", "name", "is_enabled", "updated_on", "created_on", "module_id",
        "module_name", "field_type", "is_required", "label", "decimal_place",
        "meta_data", "linked_modules", "is_readonly", "supporting_text",
        "placeholder", "description", "can_edit", "can_view", "seq_number"
      ],
      replacements: {
        userType: userType
      },
      order: [["seq_number", "ASC"]],
      offset,
      limit: limitNumber,
    });
    const customFieldsWithPicklistData = await Promise.all(
      result.rows.map(async (customField) => {
        let picklistData: { picklist_name: string, picklist_values: { id: string, value: string }[] } | null = null;

        if (customField.meta_data?.picklist_id) {
          const picklistId = customField.meta_data.picklist_id;
          const picklist = await PicklistModel.findOne({
            where: { id: picklistId },
            attributes: ["name"],
          });

          if (picklist) {
            const picklistItems = await PicklistItemModel.findAll({
              where: { picklist_id: picklistId },
              attributes: ["id", "value"],
            });

            picklistData = {
              picklist_name: picklist.name,
              picklist_values: picklistItems.map(item => ({
                id: item.id,
                value: item.value,
              })),
            };
          }
        }

        let is_edit = false;
        let is_view = false;

        if (userType === 'super_user') {
          is_edit = true;
          is_view = true;
        } else {
          if (module_name) {
            const getRelatedModules = (moduleName: string): string[] => {
              switch (moduleName) {
                case 'Assignment Revision':
                  return ['Assignment', 'Assignment Revision'];
                default:
                  return [moduleName];
              }
            };

            const relatedModules = getRelatedModules(module_name);
            if (relatedModules.includes(customField.module_name)) {
              is_edit = includesRole(customField.can_edit, userType);
              is_view = includesRole(customField.can_view, userType);
            }

            if (!is_edit || !is_view) {
              const linkedModules = Array.isArray(customField.linked_modules)
                ? customField.linked_modules
                : [];

              const relevantLinkedModule = linkedModules.find(
                (lm: any) => lm.linked === true && relatedModules.includes(lm.module_name)
              );

              if (relevantLinkedModule) {
                is_edit = is_edit || includesRole(relevantLinkedModule.can_edit, userType);
                is_view = is_view || includesRole(relevantLinkedModule.can_view, userType);
              }
            }
            if (!is_edit && !is_view) {
              if (customField.module_name?.toLowerCase().includes(module_name.toLowerCase())) {
                is_edit = includesRole(customField.can_edit, userType);
                is_view = includesRole(customField.can_view, userType);
              }
            }
          } else {
            is_edit = includesRole(customField.can_edit, userType);
            is_view = includesRole(customField.can_view, userType);
          }
        }

        return {
          ...customField.toJSON(),
          meta_data: {
            ...customField.meta_data,
            ...(picklistData || {}),
          },
          is_edit,
          is_view,
        };
      })
    );
    let finalCustomFields = customFieldsWithPicklistData;
    if (is_dependant_field === 'true') {
      const dependantLabels = new Set<string>();

      customFieldsWithPicklistData.forEach((field) => {
        const dependsOn = field.meta_data?.depends_on;
        if (dependsOn?.conditions && Array.isArray(dependsOn.conditions)) {
          dependsOn.conditions.forEach((cond: any) => {
            if (cond.label) dependantLabels.add(cond.label.toLowerCase());
          });
        }
      });
      finalCustomFields = customFieldsWithPicklistData.filter(
        (field) =>
          !dependantLabels.has(field.label?.toLowerCase())
      );
    }

    return reply.status(200).send({
      status_code: 200,
      custom_fields: finalCustomFields,
      total_records: result.count,
      page: pageNumber,
      limit: limitNumber,
      message: 'Custom Fields Retrieved Successfully',
      trace_id: traceId,
    });

  } catch (error: any) {
    console.error('Error fetching custom fields:', error);
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while fetching custom fields',
      error: error.message,
      trace_id: traceId,
    });
  }
}

function includesRole(roles: any, userType: string | undefined): boolean {
  if (!userType) return false;
  if (!roles) return false;
  if (Array.isArray(roles)) {
    return roles.some((r) => String(r).toLowerCase() === userType.toLowerCase());
  } else if (typeof roles === 'string') {
    return roles.toLowerCase().includes(userType.toLowerCase());
  }
  return false;
}

export const getCustomFieldById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id, program_id } = request.params as { id: string, program_id: string };
  const traceId = generateCustomUUID();

  if (!program_id) {
    reply.status(400).send({
      status_code: 400,
      message: 'Program ID is required',
      trace_id: traceId,
    });
    return;
  }

  try {
    const customfiedData = await CustomField.findOne({
      where: { id, program_id },
      attributes: [
        "id", "name", "is_enabled", "updated_on", "can_view", "can_edit",
        "is_all_hierarchy", "is_all_work_location", "label", "placeholder",
        "field_type", "is_required", "module_id", "module_name",
        "supporting_text", "description", "is_readonly", "is_required",
        "is_linked", "is_deleted", "created_on", "updated_on",
        "supporting_text", "linked_modules", "meta_data", "job_type",
        "range_applicable", "is_sensitive_data", "organization_category"
      ],
    });

    if (customfiedData) {
      const customFieldId = customfiedData.id;

      let workLocations: WorkLocationModel[] = [];
      if (!customfiedData.is_all_work_location) {
        const locationRecords = await customFieldLocations.findAll({
          where: { custom_field_id: customFieldId },
          attributes: ["work_location_id"],
        });

        const locationIds = locationRecords.map((record: { work_location_id: any; }) => record.work_location_id);

        workLocations = await WorkLocationModel.findAll({
          where: { id: locationIds },
          attributes: ["id", "name"],
        });
      }

      let hierarchie: hierarchies[] = [];
      if (!customfiedData.is_all_hierarchy) {
        const hierarchyRecords = await customFieldsHierarchie.findAll({
          where: { custom_field_id: customFieldId },
          attributes: ["hierarchy_id"],
        });

        const hierarchyIds = hierarchyRecords.map((record) => record.hierarchy_id);

        hierarchie = await hierarchies.findAll({
          where: { id: hierarchyIds },
          attributes: ["id", "name"],
        });
      }

      let picklistData: { picklist_name: string, picklist_values: { id: string, value: string }[] } | null = null;
      if (customfiedData.meta_data?.picklist_id) {
        const picklistId = customfiedData.meta_data.picklist_id;
        const picklist = await PicklistModel.findOne({
          where: { id: picklistId },
          attributes: ["name"],
        });

        if (picklist) {
          const picklistItems = await PicklistItemModel.findAll({
            where: { picklist_id: picklistId },
            attributes: ["id", "value"],
          }) as any;

          picklistData = {
            picklist_name: picklist.name,
            picklist_values: picklistItems.map((item: { id: any; value: any; }) => ({
              id: item.id,
              value: item.value,
            })),
          };
        }
      }
      const customFieldMasterData = await CustomFieldMaterData.findAll({
        where: { custom_field_id: customFieldId },
        attributes: ["master_data_id"],
      });

      let masterData: { id: string, name: string }[] = [];

      if (customFieldMasterData.length > 0) {
        const masterDataIds = customFieldMasterData.map((record) => record.master_data_id);

        masterData = await FoundationalDataTypes.findAll({
          where: { id: masterDataIds },
          attributes: ["id", "name"],
        }) as any;
      }

      reply.status(200).send({
        status_code: 200,
        customField: {
          ...customfiedData.toJSON(),
          hierarchies: hierarchie,
          workLocations: workLocations,
          master_data: masterData,
          meta_data: {
            ...customfiedData.meta_data,
            ...picklistData || {},
          },
        },
        message: 'Custom Fields Type Get Successfully',
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'Custom Fields Type Not Found',
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: (error as Error).message,
    });
  }
};



export const updateCustomFieldById = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  const { id, program_id } = request.params as { id: string, program_id: string };
  const updates = request.body as CustomFields;

  const user = request?.user
  const userId = user?.sub;

  const { hierarchy_ids, work_location_ids, linked_modules, master_data_ids, name, label, module_id } = updates as {
    hierarchy_ids?: string[];
    work_location_ids?: string[];
    linked_modules?: Array<{ is_linked: boolean }>;
    master_data_ids?: string[];
    name?: string;
    label: string;
    module_id?: string
  };


  if (!program_id) {
    return sendError(reply, 400, 'Program ID is required');
  }
  validateLabel(label);

  try {
    const customFieldRecord = await findCustomField(id, program_id);
    if (!customFieldRecord) {
      return sendError(reply, 404, 'Custom Field not found');
    }
    if (updates.id) {
      const existingDuplicate = await CustomField.findOne({
        where: {
          program_id,
          module_id,
          [Op.and]: [
            { label },
            { name }
          ],
          id: { [Op.ne]: id },
          is_deleted: false
        }
      });

      if (existingDuplicate) {
        return reply.send({
          status_code: 409,
          message: "Custom field with the same name and label already exists in this module.",
          traceId: traceId
        });
      }
    }
    const changes = await detectChanges(updates, customFieldRecord);
    if (changes) {
      await CustomField.update(
        {
          ...updates,
          updated_on: Date.now(),
          updated_by: userId,
        },
        {
          where: { id, program_id },
        }
      );
    }

    await processHierarchyIds(hierarchy_ids, id, program_id);
    await processWorkLocationIds(work_location_ids, id, program_id);
    await processMasterDataIds(master_data_ids, id);
    await processLinkedModules(linked_modules, id, program_id);

    return reply.status(200).send({
      status_code: 200,
      message: 'Custom field updated successfully.',
      trace_id: traceId,
    });
  } catch (error: any) {
    console.error('Error updating custom field:', error.message);
    return sendError(reply, 500, 'Internal Server Error: Failed to update Custom Fields');
  }
};

const sendError = (reply: FastifyReply, statusCode: number, message: string) => {
  const traceId = generateCustomUUID();
  reply.status(statusCode).send({
    status_code: statusCode,
    message,
    trace_id: traceId,
  });
};

const findCustomField = async (id: string, program_id: string) => {
  return await CustomField.findOne({ where: { id, program_id } });
};

const detectChanges = async (updates: any, customFieldRecord: any) => {
  const recordData = customFieldRecord.get();
  const otherFieldsUpdates = { ...updates };
  delete otherFieldsUpdates.work_location_ids;

  return Object.keys(otherFieldsUpdates).some((key) => {
    const k = key as keyof CustomFields;
    if (Array.isArray(updates[k])) {
      return JSON.stringify(updates[k]) !== JSON.stringify(recordData[k]);
    }
    return updates[k] !== recordData[k];
  });
};

const processHierarchyIds = async (hierarchy_ids: string[] | undefined, customFieldId: string, program_id: string) => {
  if (!hierarchy_ids || hierarchy_ids.length === 0) return;

  const existingHierarchyRecords = await customFieldsHierarchie.findAll({ where: { custom_field_id: customFieldId } });
  const existingHierarchyIds = existingHierarchyRecords.map((record) => record.hierarchy_id);

  await Promise.all(hierarchy_ids.map(async (hierarchy_id) => {
    const existingRecord = existingHierarchyRecords.find((record) => record.hierarchy_id === hierarchy_id);
    if (!existingRecord) {
      await customFieldsHierarchie.create({ custom_field_id: customFieldId, hierarchy_id, program_id: program_id });
    }
  }));

  const hierarchyIdsToDelete = existingHierarchyIds.filter(existingId => !hierarchy_ids.includes(existingId));
  if (hierarchyIdsToDelete.length > 0) {
    await customFieldsHierarchie.destroy({ where: { custom_field_id: customFieldId, hierarchy_id: hierarchyIdsToDelete } });
  }
};

const processWorkLocationIds = async (work_location_ids: string[] | undefined, customFieldId: string, program_id: string) => {
  if (!work_location_ids || work_location_ids.length === 0) return;

  const existingWorkLocationRecords = await customFieldLocations.findAll({ where: { custom_field_id: customFieldId } });
  const existingWorkLocationIds = existingWorkLocationRecords.map((record: { work_location_id: any; }) => record.work_location_id);

  await Promise.all(work_location_ids.map(async (work_location_id) => {
    const existingRecord = existingWorkLocationRecords.find((record: { work_location_id: string; }) => record.work_location_id === work_location_id);
    if (!existingRecord) {
      await customFieldLocations.create({ custom_field_id: customFieldId, work_location_id, program_id });
    }
  }));

  const workLocationIdsToDelete = existingWorkLocationIds.filter((existingId: string) => !work_location_ids.includes(existingId));
  if (workLocationIdsToDelete.length > 0) {
    await customFieldLocations.destroy({ where: { custom_field_id: customFieldId, work_location_id: workLocationIdsToDelete } });
  }
};

const processMasterDataIds = async (master_data_ids: string[] | undefined, customFieldId: string) => {
  if (!master_data_ids || master_data_ids.length === 0) return;

  const existingMasterDataRecords = await CustomFieldMaterData.findAll({ where: { custom_field_id: customFieldId } });
  const existingMasterDataIds = existingMasterDataRecords.map((record) => record.master_data_id);

  await Promise.all(master_data_ids.map(async (master_data_id) => {
    const existingRecord = existingMasterDataRecords.find((record) => record.master_data_id === master_data_id);
    if (!existingRecord) {
      await CustomFieldMaterData.create({ custom_field_id: customFieldId, master_data_id });
    }
  }));

  const masterDataIdsToDelete = existingMasterDataIds.filter(existingId => !master_data_ids.includes(existingId));
  if (masterDataIdsToDelete.length > 0) {
    await CustomFieldMaterData.destroy({ where: { custom_field_id: customFieldId, master_data_id: masterDataIdsToDelete } });
  }
};

const processLinkedModules = async (linked_modules: Array<{ is_linked: boolean }> | undefined, customFieldId: string, program_id: string) => {
  if (linked_modules?.every((module) => module.is_linked === false)) {
    await CustomField.update({ is_linked: false }, { where: { id: customFieldId, program_id } });
  }
};
export const deleteCustomField = async (request: FastifyRequest<{ Params: { id: string, program_id: string } }>, reply: FastifyReply) => {
  const { id, program_id } = request.params;
  const traceId = generateCustomUUID();

  try {
    const customFieldItem = await CustomField.findOne({ where: { id, program_id } });

    if (customFieldItem) {
      const user = request?.user
      const userId = user?.sub
      if ((customFieldItem as any).is_linked === false) {
        await customFieldItem.update({
          is_deleted: true, updated_on: Date.now(), updated_by: userId,
        }, { where: { id, program_id } });
        reply.status(200).send({
          status_code: 200,
          message: 'Custom Field marked as deleted successfully',
          trace_id: traceId,
        });
      } else {
        reply.status(500).send({
          status_code: 500,
          message: 'Custom field cannot be deleted as it is linked with modules. deletion can be possible only if the linked module is removed.',
          trace_id: traceId,
        });

      }
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'Custom Field not found',
        trace_id: traceId,
      });
    }
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      trace_id: traceId,
      error: error
    });
  }
};

export async function updateCustomFieldsIsdisable(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const { id, program_id } = request.params as { id: string, program_id: string };
  const { is_enabled } = request.body as { is_enabled: boolean };
  const user = request?.user
  const userId = user?.sub;

  if (is_enabled === undefined || is_enabled === null) {
    return reply.status(400).send({
      status_code: 400,
      message: 'Invalid request: is_enabled field is required.',
      trace_id: traceId,
    });
  }

  try {
    const customFieldRecord = await CustomField.findOne({ where: { id, program_id } });

    if (!customFieldRecord) {
      return reply.status(404).send({
        status_code: 404,
        message: 'Custom field not found',
        trace_id: traceId,
      });
    }

    await CustomField.update(
      {
        is_enabled,
        updated_on: new Date(),
        updated_by: userId,
      },
      {
        where: { id, program_id },
      }
    );

    if (customFieldRecord.linked_modules) {
      const updatedLinkedModules = customFieldRecord.linked_modules.map((module: any) => ({
        ...module,
        is_linked: is_enabled,
      }));

      await CustomField.update(
        { linked_modules: updatedLinkedModules },
        {
          where: { id, program_id },
        }
      );
    }

    return reply.status(200).send({
      status_code: 200,
      message: 'Custom field updated successfully.',
      trace_id: traceId,
    });
  } catch (error) {
    console.error('Error updating custom field:', error);
    return reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error: Failed to update Custom Field',
      trace_id: traceId,
    });
  }
}

export async function searchCustomFields(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { module_name, is_enabled, field_type } = request.query as { module_name: string, is_enabled: string, field_type: string };
    const { program_id } = request.params as { program_id: string };
    const searchFields: any = { is_deleted: false };

    if (module_name) {
      searchFields.module_name = module_name;
    }
    if (is_enabled) {
      searchFields.is_enabled = is_enabled === "true" ? 1 : 0;
    }

    if (field_type) {
      const fieldTypesArray = field_type.split(",");
      searchFields.field_type = { [Op.in]: fieldTypesArray };
    }

    if (program_id) {
      searchFields.program_id = program_id;
    }

    const result = await CustomField.findAndCountAll({
      where: searchFields,
    });

    if (result.rows.length === 0) {
      reply.status(200).send({ status_code: 200, message: "Modules not found", modules: [] });
      return;
    }

    reply.status(200).send({
      status_code: 200,
      message: "Custom search successfully",
      total_records: result.count,
      items: result.rows,
    });
  } catch (error: any) {
    console.log(error.stack);
    reply.status(500).send({ status_code: 500, error: "Internal Server Error" });
  }
}

export const advanceFilterCustomFiled = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };
  const body = request.body as {
    page?: number;
    limit?: number;
    is_enabled?: boolean;
    slug?: string;
    name?: string;
    module_name?: string;
    label?: string;
    field_type?: string;
    is_required?: boolean;
    updated_on?: string;
    hierarchies?: any[];
  };

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const whereClause: any = {
    program_id,
    is_deleted: false,
  };

  if (body.is_enabled !== undefined) whereClause.is_enabled = body.is_enabled;
  if (body.slug) whereClause.slug = { [Op.like]: `%${body.slug}%` };
  if (body.name) whereClause.name = { [Op.like]: `%${body.name}%` };
  if (body.module_name) whereClause.module_id = { [Op.like]: `%${body.module_name}%` };
  if (body.label) whereClause.label = { [Op.like]: `%${body.label}%` };
  if (body.field_type) {
    if (Array.isArray(body.field_type)) {
      whereClause.field_type = { [Op.in]: body.field_type };
    } else {
      whereClause.field_type = { [Op.like]: `%${body.field_type}%` };
    }
  }
  if (body.is_required !== undefined) whereClause.is_required = body.is_required;
  if (Array.isArray(body.updated_on) && body.updated_on.length === 2) {
    const [startDate, endDate] = body.updated_on.map(date => new Date(date).getTime());

    if (!isNaN(startDate) && !isNaN(endDate)) {
      whereClause.updated_on = { [Op.between]: [startDate, endDate] };
    }
  }

  if (Array.isArray(body.hierarchies) && body.hierarchies.length > 0) {
  const hierarchyIds = body.hierarchies.map((id: string) => `'${id}'`);
  whereClause[Op.or] = [
    Sequelize.literal(`id IN (
      SELECT custom_field_id
      FROM custom_fields_hierarchie
      WHERE hierarchy_id IN (${hierarchyIds.join(',')})
    )`),
    { is_all_hierarchy: true }
  ];
}

  try {
    const result = await CustomField.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "name",
        "is_enabled",
        "updated_on",
        "created_on",
        "module_id",
        "module_name",
        "field_type",
        "is_required",
        "label",
        "decimal_place",
        "meta_data",
        "linked_modules",
        "is_readonly",
        "supporting_text",
        "placeholder",
        "description",
        "can_edit",
        "can_view",
        "is_all_hierarchy"
      ],
      order: [["updated_on", "DESC"]],
      offset: (page - 1) * limit,
      limit: limit,
    });

    const customFieldsWithPicklistData = await Promise.all(
      result.rows.map(async (customField) => {
        const customFieldId = customField.id;

        let picklistData: { picklist_name: string, picklist_values: { id: string, value: string }[] } | null = null;

        if (customField.meta_data?.picklist_id) {
          const picklistId = customField.meta_data.picklist_id;

          const picklist = await PicklistModel.findOne({
            where: { id: picklistId },
            attributes: ["name"],
          });

          if (picklist) {
            const picklistItems = await PicklistItemModel.findAll({
              where: { picklist_id: picklistId },
              attributes: ["id", "value"],
            });

            picklistData = {
              picklist_name: picklist.name,
              picklist_values: picklistItems.map(item => ({
                id: item.id,
                value: item.value,
              })),
            };
          }
        }

        let transformedHierarchies: { id: string; name: string }[] = [];
        if (customField.is_all_hierarchy) {
          const allHierarchies = await Hierarchies.findAll({
            where: { program_id, is_enabled: true },
            attributes: ["id", "name"]
          });

          transformedHierarchies = allHierarchies.map(h => ({
            id: h.id,
            name: h.name,
          }));
        } else {
          const hierarchies = await customFieldsHierarchie.findAll({
            where: { custom_field_id: customFieldId },
            attributes: ["hierarchy_id"],
            include: [
              {
                model: Hierarchies,
                as: "hierarchy",
                attributes: ["id", "name"],
              },
            ],
          });

          transformedHierarchies = hierarchies.map(item => ({
            id: item.hierarchy?.id ?? item.hierarchy_id,
            name: item.hierarchy?.name ?? "",
          }));
        }

        return {
          ...customField.toJSON(),
          meta_data: {
            ...customField.meta_data,
            ...picklistData || {},
          },
          hierarchies: transformedHierarchies
        };
      })
    );

    return reply.status(200).send({
      status_code: 200,
      custom_fields: customFieldsWithPicklistData,
      total_records: result.count,
      page: page,
      limit: limit,
      message: "Custom Fields Get Successfully",
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: "An error occurred while fetching custom fields",
      error: error,
      trace_id: traceId,
    });
  }
}

export async function reorderCustomFields(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const { program_id } = request.params as { program_id: string };
  const { module_name, custom_field_ids } = request.body as {
    module_name: string;
    custom_field_ids: { id: string; seq_number: number }[];
  };

  await sequelize.transaction(async (t) => {
    await Promise.all(
      custom_field_ids.map(field =>
        CustomField.update(
          { seq_number: field.seq_number },
          {
            where: { program_id, id: field.id, module_name },
            transaction: t
          }
        )
      )
    );
  });

  reply.send({
    status_code: 200,
    message: "Custom field sequence updated successfully",
    traceId: traceId,
  });
}



