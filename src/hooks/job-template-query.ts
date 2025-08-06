import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
import { databaseConfig } from "../config/db";

const config_db = databaseConfig.config.database;

class JobTempletRepository {

  async getJobTemplateByHierarchies(
    program_id: string,
    hierarchy_ids?: string[],
    filter_by_hierarchy?: boolean,
    mspHierarchyIds?: string[]
  ) {
    let query = `
      SELECT
        ji.id,
        ji.template_name,
        ji.job_id,
        ji.program_id,
        ji.created_on,
        CASE 
        WHEN ji.is_all_hierarchy_associated = 1 THEN 'All Hierarchies'
        ELSE GROUP_CONCAT(jc.hierarchy SEPARATOR ',')
      END AS hierarchy
      FROM job_templates AS ji
             LEFT JOIN job_template_hierarchies AS jc ON jc.job_temp_id = ji.id
      WHERE ji.is_deleted = false
        AND ji.program_id = :program_id
    `;

    const replacements: Record<string, any> = {
      program_id,
    };

    if (mspHierarchyIds && mspHierarchyIds.length > 0) {
      query += ` AND (ji.is_all_hierarchy_associated = 1 OR ji.id IN (
      SELECT jth.job_temp_id
      FROM job_template_hierarchies AS jth
      WHERE jth.hierarchy IN (:mspHierarchyIds)
      AND jth.is_deleted = false
    ))`;
      replacements.mspHierarchyIds = mspHierarchyIds;
    }

    if (filter_by_hierarchy && hierarchy_ids && hierarchy_ids.length > 0) {
      query += ` AND (ji.is_all_hierarchy_associated = 1 OR jc.hierarchy IN (:hierarchy_ids))`;
      replacements.hierarchy_ids = hierarchy_ids;
    }

    query += `
    GROUP BY ji.id, ji.template_name, ji.job_id, ji.program_id, ji.created_on,ji.is_all_hierarchy_associated
    ORDER BY ji.created_on DESC
  `;

    const data = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    return data;
  }


  async deleteJobTemplateHierarchy(program_id: string, job_temp_id: string) {
    const deleteQuery = `
      DELETE FROM job_template_hierarchies
      WHERE program_id = :program_id AND job_temp_id = :job_temp_id
    `;
    await sequelize.query(deleteQuery, {
      replacements: { program_id, job_temp_id },
    });
  }

  async getMostUsedJobTemplatesByProgram(
    program_id: string,
    hierarchyIdsArray: string[],
    job_type?: string,
    limit?: number,
    offset?: number,
    is_enabled?: boolean,
    is_shift_rate?: boolean,
    mspHierarchyIds?: string[]
  ) {
    const hierarchyCondition = hierarchyIdsArray.length > 0
      ? `AND (job_templates.is_all_hierarchy_associated= 1 OR job_templates.id IN (
      SELECT job_temp_id
      FROM job_template_hierarchies
      WHERE hierarchy IN (${hierarchyIdsArray.map(() => '?').join(',')})
      GROUP BY job_temp_id
      HAVING COUNT(DISTINCT hierarchy) = ?
    ))`
      : "";

    const mspHierarchyCondition = mspHierarchyIds && mspHierarchyIds.length > 0
      ? `AND (job_templates.is_all_hierarchy_associated = 1 OR job_templates.id IN (
          SELECT job_temp_id
          FROM job_template_hierarchies
          WHERE hierarchy IN (${mspHierarchyIds.map(() => '?').join(',')})
        ))`
      : "";


    const jobTypeCondition = job_type ? `AND JSON_CONTAINS(job_templates.job_type, ?)` : '';
    const isEnabledCondition = is_enabled !== undefined ? `AND job_templates.is_enabled = ?` : '';
    const paginationCondition = limit !== undefined && offset !== undefined ? `LIMIT ? OFFSET ?` : '';
    const isShiftRateCondition = is_shift_rate !== undefined ? `AND job_templates.is_shift_rate = ?` : '';
    const query = `
      SELECT
        job_templates.template_name,
        MIN(job_templates.id) AS id,
        MIN(job_templates.program_id) AS program_id,
        MIN(job_templates.job_type) AS job_type,
        MIN(job_templates.description) AS description,
        MIN(job_templates.template_code) AS template_code,
        MIN(job_category.title) AS job_category,
        MIN(labour_category.name) AS labour_category_name,
        CASE 
        WHEN MIN(job_templates.is_all_hierarchy_associated) = 1 THEN 'All Hierarchies'
        ELSE GROUP_CONCAT(DISTINCT hierarchies.name SEPARATOR ', ')
        END AS hierarchy,
        MAX(job_templates.job_submitted_count) AS job_submitted_count
      FROM job_templates
      LEFT JOIN job_template_hierarchies
        ON job_templates.id = job_template_hierarchies.job_temp_id
      LEFT JOIN hierarchies
        ON job_template_hierarchies.hierarchy = hierarchies.id
      LEFT JOIN job_category ON job_templates.category = job_category.id
      LEFT JOIN labour_category ON job_templates.labour_category = labour_category.id
      WHERE job_templates.program_id = ?
      ${hierarchyCondition}
      ${mspHierarchyCondition}
      ${jobTypeCondition}
      ${isEnabledCondition}
      ${isShiftRateCondition}
      AND job_templates.job_submitted_count >= 1
      GROUP BY job_templates.template_name
      ORDER BY job_submitted_count DESC
      ${paginationCondition};
    `;

    const replacements: (string | number)[] = [program_id];

    if (hierarchyIdsArray.length > 0) {
      replacements.push(...hierarchyIdsArray, hierarchyIdsArray.length);
    }

    if (mspHierarchyIds && mspHierarchyIds.length > 0) {
      replacements.push(...mspHierarchyIds);
    }

    if (job_type) {
      replacements.push(`"${job_type}"`);
    }

    if (is_enabled !== undefined) {
      replacements.push(is_enabled ? 1 : 0);
    }

    if (limit !== undefined && offset !== undefined) {
      replacements.push(limit, offset);
    }

    if (is_shift_rate !== undefined) {
      replacements.push(is_shift_rate ? 1 : 0);
    }

    const data = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    return data;
  }


  async getJobTempletByHierarchies(
    program_id: string,
    hierarchyIdsArray: string[],
    job_type?: string,
    is_enabled?: boolean,
    is_shift_rate?: boolean,
    mspHierarchyIds?: string[]
  ) {
    const hierarchyCondition = hierarchyIdsArray.length > 0
      ? `AND (job_templates.is_all_hierarchy_associated = 1 OR job_templates.id IN (
      SELECT job_temp_id
      FROM job_template_hierarchies
      WHERE hierarchy IN (${hierarchyIdsArray.map(() => '?').join(',')})
      GROUP BY job_temp_id
      HAVING COUNT(DISTINCT hierarchy) = ?
    ))`
      : "";

    const mspHierarchyCondition = mspHierarchyIds && mspHierarchyIds.length > 0
      ? `AND (job_templates.is_all_hierarchy_associated = 1 OR job_templates.id IN (
          SELECT job_temp_id
          FROM job_template_hierarchies
          WHERE hierarchy IN (${mspHierarchyIds.map(() => '?').join(',')})
        ))`
      : "";

    const jobTypeCondition = job_type ? `AND JSON_CONTAINS(job_templates.job_type, ?)` : '';
    const isEnabledCondition = is_enabled !== undefined ? `AND job_templates.is_enabled = ?` : '';
    const isShiftRateCondition = is_shift_rate !== undefined ? `AND job_templates.is_shift_rate = ?` : '';

    const query = `
      SELECT
        job_templates.template_name,
        MIN(job_templates.id) AS id,
        MIN(job_templates.program_id) AS program_id,
        MIN(job_templates.job_type) AS job_type,
        MIN(job_templates.description) AS description,
        MIN(job_templates.template_code) AS template_code,
        MIN(job_category.title) AS job_category,
        MIN(labour_category.name) AS labour_category_name,
        CASE 
        WHEN MIN(job_templates.is_all_hierarchy_associated) = 1 THEN 'All Hierarchies'
        ELSE GROUP_CONCAT(DISTINCT hierarchies.name SEPARATOR ', ')
        END AS hierarchy,
        MIN(job_templates.created_on) AS created_on
      FROM job_templates
      LEFT JOIN job_template_hierarchies
        ON job_templates.id = job_template_hierarchies.job_temp_id
      LEFT JOIN hierarchies
        ON job_template_hierarchies.hierarchy = hierarchies.id
      LEFT JOIN job_category ON job_templates.category = job_category.id
      LEFT JOIN labour_category ON job_templates.labour_category = labour_category.id
      WHERE job_templates.program_id = ?
      ${hierarchyCondition}
      ${mspHierarchyCondition}
      ${jobTypeCondition}
      ${isEnabledCondition}
      ${isShiftRateCondition}
      GROUP BY job_templates.template_name
      ORDER BY created_on DESC;
    `;

    const replacements: (string | number)[] = [program_id];

    if (hierarchyIdsArray.length > 0) {
      replacements.push(...hierarchyIdsArray, hierarchyIdsArray.length);
    }

    if (mspHierarchyIds && mspHierarchyIds.length > 0) {
      replacements.push(...mspHierarchyIds);
    }

    if (job_type) {
      replacements.push(`"${job_type}"`);
    }

    if (is_enabled !== undefined) {
      replacements.push(is_enabled ? 1 : 0);
    }

    if (is_shift_rate !== undefined) {
      replacements.push(is_shift_rate ? 1 : 0);
    }

    const data = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    return data;
  }


  async getAllJobTemplateByHierarchy(
    program_id: string,
    hierarchyIdsArray: string[],
    laborCategoryIdsArray: string[],
    qualificationIdsArray: string[],
    limit?: number,
    offset?: number,
    jobTypeArray?: string[],
    name?: string,
    labour_category_id?: string,
    is_enabled?: boolean,
    is_shift_rate?: boolean,
    isHierarchyIdsArray?: string[],
    mspHierarchyIds?: string[]
  ) {
    const hierarchyCondition = hierarchyIdsArray.length > 0
      ? `(job_templates.is_all_hierarchy_associated = 1 OR job_templates.id IN (
    SELECT job_temp_id
    FROM job_template_hierarchies
    WHERE hierarchy IN (${hierarchyIdsArray.map(() => '?').join(',')})
    GROUP BY job_temp_id
    HAVING COUNT(DISTINCT hierarchy) = ?
  ))`
      : "";

    const mspHierarchyCondition = mspHierarchyIds && mspHierarchyIds.length > 0
      ? `(job_templates.is_all_hierarchy_associated = 1 OR job_templates.id IN (
          SELECT job_temp_id
          FROM job_template_hierarchies
          WHERE hierarchy IN (${mspHierarchyIds.map(() => '?').join(',')})
        ))`
      : "";

    const isHierarchyCondition = isHierarchyIdsArray && isHierarchyIdsArray.length > 0
      ? `(job_templates.is_all_hierarchy_associated = 1 OR job_templates.id IN (
      SELECT job_temp_id
      FROM job_template_hierarchies
      WHERE hierarchy IN (${isHierarchyIdsArray.map(() => '?').join(',')})
      GROUP BY job_temp_id
      HAVING COUNT(DISTINCT hierarchy) = ?
      AND COUNT(DISTINCT hierarchy) = (
        SELECT COUNT(*)
        FROM job_template_hierarchies AS jth_sub
        WHERE jth_sub.job_temp_id = job_template_hierarchies.job_temp_id
      )
    ))`
      : "";

    const conditions = [
      hierarchyCondition,
      mspHierarchyCondition,
      isHierarchyCondition,
      laborCategoryIdsArray.length > 0 && `job_templates.labour_category IN (${laborCategoryIdsArray.map(() => '?').join(',')})`,
      qualificationIdsArray.length > 0 && `qualifications.id IN (${qualificationIdsArray.map(() => '?').join(',')})`,
      jobTypeArray && jobTypeArray.length > 0 && `(${jobTypeArray.map(() => `JSON_CONTAINS(job_templates.job_type, JSON_QUOTE(?))`).join(' OR ')})`,
      name && `job_templates.template_name LIKE ?`,
      labour_category_id && `labour_category.id = ?`,
      is_enabled !== undefined && `job_templates.is_enabled ${is_enabled ? '=1' : '=0'}`,
      is_shift_rate !== undefined && `job_templates.is_shift_rate ${is_shift_rate ? '=1' : '=0'}`
    ].filter(Boolean).join(' AND ');

    const pagination = (limit && offset) ? 'LIMIT ? OFFSET ?' : '';


    const query = `
      SELECT
        job_templates.template_name,
        MIN(job_templates.id) AS id,
        MIN(job_templates.job_id) AS job_id,
        MIN(job_templates.is_shift_rate) AS is_shift_rate,
        MIN(job_templates.program_id) AS program_id,
        MIN(job_templates.job_type) AS job_type,
        MIN(job_templates.description) AS description,
        MIN(job_templates.checklist_version) AS checklist_version,
        MIN(job_templates.checklist_entity_id) AS checklist_entity_id,
        MIN(job_templates.template_code) AS template_code,
        MIN(job_category.title) AS job_category,
        MIN(labour_category.name) AS labour_category_name,
        MIN(labour_category.id) AS labour_category_id,
        JSON_OBJECT(
          'id', ph.id,
          'name', ph.name
        ) AS primary_hierarchy,
        CASE 
  WHEN MIN(job_templates.is_all_hierarchy_associated) = 1 THEN (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'id', h.id,
        'name', h.name
      )
    )
    FROM hierarchies h
    WHERE h.program_id = job_templates.program_id
    AND h.is_enabled = 1
  )
  ELSE JSON_ARRAYAGG(
    CASE 
      WHEN unique_hierarchies.id IS NOT NULL THEN
        JSON_OBJECT(
          'id', unique_hierarchies.id,
          'name', unique_hierarchies.name
        )
    END
  )
END AS hierarchy,
        MIN(qualifications.name) AS qualification_name,
        MIN(qualifications.id) AS qualification_id
      FROM job_templates
      LEFT JOIN job_template_hierarchies
        ON job_templates.id = job_template_hierarchies.job_temp_id
      LEFT JOIN (
        SELECT DISTINCT id, name
        FROM hierarchies
      ) unique_hierarchies
        ON job_template_hierarchies.hierarchy = unique_hierarchies.id
      LEFT JOIN job_category
        ON job_templates.category = job_category.id
      LEFT JOIN labour_category
        ON job_templates.labour_category = labour_category.id
      LEFT JOIN job_template_qualification
        ON job_templates.id = job_template_qualification.job_temp_id
      LEFT JOIN hierarchies AS ph
        ON job_templates.primary_hierarchy = ph.id  
      LEFT JOIN qualifications
        ON JSON_CONTAINS(
            JSON_EXTRACT(job_template_qualification.qualifications, '$[*].qualification_id'),
            JSON_QUOTE(qualifications.id)
        )
      WHERE job_templates.program_id = ?
      ${conditions ? `AND ${conditions}` : ''}
      GROUP BY job_templates.template_name, ph.id, ph.name
      ORDER BY job_templates.template_name
      ${pagination};
    `;

    const replacements: (string | number)[] = [program_id];

    if (hierarchyIdsArray.length > 0) {
      replacements.push(...hierarchyIdsArray, hierarchyIdsArray.length);
    }

    if (mspHierarchyIds && mspHierarchyIds.length > 0) {
      replacements.push(...mspHierarchyIds);
    }

    if (isHierarchyIdsArray && isHierarchyIdsArray.length > 0) {
      replacements.push(...isHierarchyIdsArray, isHierarchyIdsArray.length);
    }
    if (laborCategoryIdsArray.length > 0) {
      replacements.push(...laborCategoryIdsArray);
    }
    if (qualificationIdsArray.length > 0) {
      replacements.push(...qualificationIdsArray);
    }
    if (jobTypeArray && jobTypeArray.length > 0) {
      replacements.push(...jobTypeArray);
    }
    if (name) {
      replacements.push(`%${name}%`);
    }
    if (labour_category_id) {
      replacements.push(labour_category_id);
    }
    if (is_enabled !== undefined) {
      replacements.push(is_enabled ? 1 : 0);
    }
    if (is_shift_rate !== undefined) {
      replacements.push(is_shift_rate ? 1 : 0);
    }
    if (limit && offset) {
      replacements.push(limit, offset);
    }
    const data = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    return data;
  }


  async programQuery(program_id: string): Promise<{
    unique_id: string; name: string
  }[]> {
    const query = `
            SELECT
                programs.name,
                programs.unique_id
            FROM ${config_db}.programs
            WHERE programs.id = :program_id;
        `;

    const data = await sequelize.query<{ name: string, unique_id: string }>(query, {
      replacements: { program_id },
      type: QueryTypes.SELECT,
    });

    return data;
  }

  async getAllJobTemplets(
    program_id: string,
    dynamicConditions: string,
    replacements: any,
    limit: number,
    offset: number
  ) {
    const query = `
      SELECT
        job_templates.program_id,
        job_templates.id,
        job_templates.job_id,
        job_templates.is_enabled,
        job_templates.template_name,
        job_templates.job_submitted_count,
        job_templates.is_shift_rate,
        job_templates.is_checklist_enable,
        job_templates.ot_exempt,
        job_templates.created_on,
        job_templates.updated_on,
        job_templates.checklist_entity_id,
        job_templates.checklist_version,
        job_templates.job_type,
        JSON_OBJECT(
          'id', job_category.id,
          'title', job_category.title
        ) AS job_category,
        JSON_OBJECT(
          'id', labour_category.id,
          'name', labour_category.name
        ) AS industries,
        JSON_OBJECT(
          'id', primary_hierarchy.id,
          'name', primary_hierarchy.name
        ) AS primary_hierarchy, -- Added for primary hierarchy
        COUNT(*) OVER() AS total_count -- Add total_count using window function
      FROM
        job_templates
      LEFT JOIN
        job_category ON job_templates.category = job_category.id
      LEFT JOIN
        labour_category ON job_templates.labour_category = labour_category.id
      LEFT JOIN
        hierarchies AS primary_hierarchy ON job_templates.primary_hierarchy = primary_hierarchy.id
      WHERE
        job_templates.program_id = :program_id
        AND job_templates.is_deleted = false
        ${dynamicConditions}
      ORDER BY
        job_templates.created_on DESC,
        job_templates.job_id DESC
      LIMIT :limit OFFSET :offset;
    `;

    return sequelize.query(query, {
      replacements: { ...replacements, limit, offset },
      type: QueryTypes.SELECT,
    });
  }

  async getJobTempletById(program_id: string, id: string) {
    const query = `
        SELECT
            job_templates.*,
            JSON_OBJECT(
                'id', job_category.id,
                'title', job_category.title
            ) AS job_category,
            JSON_OBJECT(
              'id',checklist.entity_id,
              'name',checklist.name
            ) AS checklist_entity_id	,
            JSON_OBJECT(
                'id', labour_category.id,
                'name', labour_category.name
            ) AS industries,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', hierarchies.id,
                        'name', hierarchies.name
                    )
                )
                FROM job_template_hierarchies
                JOIN hierarchies ON job_template_hierarchies.hierarchy = hierarchies.id
                WHERE job_template_hierarchies.job_temp_id = job_templates.id
            ), JSON_ARRAY()) AS hierarchies,
            JSON_OBJECT(
                'id', primary_hierarchy.id,
                'name', primary_hierarchy.name,
                'default_date_format', primary_hierarchy.default_date_format,
                'default_time_format', primary_hierarchy.default_time_format,
                'default_timezone', primary_hierarchy.default_timezone
            ) AS primary_hierarchy,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'qualification_type_id', qualification_types.id,
                        'name', qualification_types.name,
                        'code', qualification_types.code,
                        'is_required', job_template_qualification.is_required = 1,
                        'qualifications', COALESCE((
                            SELECT JSON_ARRAYAGG(
                                JSON_OBJECT(
                                    'qualification_id', qualifications.id,
                                    'name', qualifications.name,
                                    'code', qualification_types.code,
                                    'is_locked', jq.is_locked,
                                    'is_required', jq.is_required=1,
                                    'level', jq.level
                                )
                            )
                            FROM qualifications
                            JOIN JSON_TABLE(
                                CASE
                                    WHEN JSON_VALID(job_template_qualification.qualifications) THEN job_template_qualification.qualifications
                                    ELSE '[]'
                                END,
                                '$[*]' COLUMNS(
                                    qualification_id CHAR(36) PATH '$.qualification_id',
                                    is_locked BOOLEAN PATH '$.is_locked',
                                    is_required BOOLEAN PATH '$.is_required',
                                    level JSON PATH '$.level'
                                )
                            ) AS jq ON qualifications.id = jq.qualification_id
                        ), JSON_ARRAY())
                    )
                )
                FROM job_template_qualification
                LEFT JOIN qualification_types ON job_template_qualification.qualification_type_id = qualification_types.id
                WHERE job_template_qualification.job_temp_id = job_templates.id
            ), JSON_ARRAY()) AS job_template_qualifications,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', job_template_rate_type.id,
                        'abbreviation', job_template_rate_type.abbreviation,
                        'billable', job_template_rate_type.billable,
                        'name', job_template_rate_type.name,
                        'bill_rate', job_template_rate_type.bill_rate,
                        'pay_rate', job_template_rate_type.pay_rate
                    )
                )
                FROM job_template_rate_type
                JOIN rate_type ON job_template_rate_type.rate_type_id = rate_type.id
                WHERE job_template_rate_type.job_temp_id = job_templates.id
            ), JSON_ARRAY()) AS job_template_rate_types
        FROM
            job_templates
        LEFT JOIN
            job_category ON job_templates.category = job_category.id
        LEFT JOIN
            labour_category ON job_templates.labour_category = labour_category.id
        LEFT JOIN
            hierarchies AS primary_hierarchy ON job_templates.primary_hierarchy = primary_hierarchy.id
        LEFT join checklist on job_templates.checklist_entity_id =checklist.entity_id
        WHERE
            job_templates.program_id = :program_id
            AND job_templates.id = :id
        GROUP BY
        job_templates.id,
        job_category.id,
        job_category.title,
        checklist.entity_id,
        checklist.name,
        labour_category.id,
        labour_category.name,
        primary_hierarchy.id,
        primary_hierarchy.name;
    `;
    const jobTemplate = await sequelize.query(query, {
      replacements: { program_id, id },
      type: QueryTypes.SELECT,
    });
    return jobTemplate;
  }

  async managerQuery(job_manager_id: string, program_id: string) {
    const [managerData] = await sequelize.query<{
      is_all_hierarchy_associate: boolean;
      associate_hierarchy_ids: string[];
      default_hierarchy_id: string | null;
      tenant_id: string;
      user_type: string;
    }>(
      `SELECT associate_hierarchy_ids, is_all_hierarchy_associate, 
        default_hierarchy_id, tenant_id, user_type 
       FROM user 
       WHERE user_id = :job_manager_id 
       AND (
        user_type = 'super_user' 
        OR (user_type != 'super_user' AND program_id = :program_id)
      )`,
      { replacements: { job_manager_id, program_id }, type: QueryTypes.SELECT }
    );

    if (!managerData) return { hierarchies: [], defaultHierarchyId: null };

    const { is_all_hierarchy_associate, associate_hierarchy_ids, default_hierarchy_id, tenant_id, user_type } = managerData;

    if (user_type === 'super_user') {
      return {
        hierarchies: await this.fetchAllHierarchies(program_id),
        defaultHierarchyId: default_hierarchy_id,
      };
    }
    if (user_type === 'vendor') {
      const [programVendorData] = await sequelize.query<{
        all_hierarchy: boolean;
        hierarchies: string[];
      }>(
        `SELECT all_hierarchy, hierarchies FROM program_vendors 
         WHERE tenant_id = :tenant_id AND program_id = :program_id`,
        { replacements: { tenant_id, program_id }, type: QueryTypes.SELECT }
      );

      if (!programVendorData) return { hierarchies: [], defaultHierarchyId: null };

      return programVendorData.all_hierarchy
        ? {
          hierarchies: await this.fetchAllHierarchies(program_id),
          defaultHierarchyId: default_hierarchy_id,
        }
        : {
          hierarchies: programVendorData.hierarchies || [],
          defaultHierarchyId: default_hierarchy_id,
        };
    }

    return is_all_hierarchy_associate
      ? { hierarchies: await this.fetchAllHierarchies(program_id), defaultHierarchyId: default_hierarchy_id }
      : { hierarchies: associate_hierarchy_ids || [], defaultHierarchyId: default_hierarchy_id };
  }

  async fetchAllHierarchies(program_id: string) {
    const allHierarchies = await sequelize.query<{ id: string }>(
      `SELECT id FROM hierarchies WHERE program_id = :program_id AND is_enabled = true`,
      { replacements: { program_id }, type: QueryTypes.SELECT }
    );
    return allHierarchies.map(h => h.id);
  }

  async mspHierarchies(msp_id: string, program_id: string) {
    if (msp_id.toLowerCase() === 'self-managed') {
      return [];
    }

    const hierarchies = await sequelize.query<{ id: string }>(
      `SELECT id FROM hierarchies 
       WHERE program_id = :program_id 
         AND managed_by = :msp_id 
         AND is_enabled = true`,
      {
        replacements: { program_id, msp_id },
        type: QueryTypes.SELECT,
      }
    );

    return hierarchies.map(h => h.id);
  }

  async templateQuery(job_template_id: string) {
    const templateData = await sequelize.query<{ hierarchy: string }>(
      `SELECT hierarchy FROM job_template_hierarchies WHERE job_temp_id = :job_template_id`,
      {
        replacements: { job_template_id },
        type: QueryTypes.SELECT,
      }
    );

    return templateData;
  }
  async sowTemplateQuery(sow_template_id: string) {
    const templateData = await sequelize.query<{ hierarchy_id: string }>(
      `SELECT hierarchy_id FROM sow_template_hierarchy WHERE sow_template_id = :sow_template_id`,
      {
        replacements: { sow_template_id },
        type: QueryTypes.SELECT,
      }
    );

    return templateData;
  }

  async masterDataQuery(master_data_type_id: string, program_id: string) {
    return sequelize.query<{ hierarchy_id: any }>(
      `
      SELECT 
        CASE 
          WHEN mdt.is_all_hierarchy_associated THEN h.id
          ELSE mdth.hierarchy_id
        END AS hierarchy_id
      FROM master_data_type mdt
      LEFT JOIN hierarchies h ON mdt.is_all_hierarchy_associated AND h.program_id = :program_id
      LEFT JOIN master_data_type_hierarchy mdth ON NOT mdt.is_all_hierarchy_associated AND mdth.master_data_type_id = :master_data_type_id
      WHERE mdt.id = :master_data_type_id
      `,
      {
        replacements: { master_data_type_id, program_id },
        type: QueryTypes.SELECT,
      }
    );
  }

  async hierarchyDetailsQuery(commonHierarchyIds: string[]) {
    const hierarchyDetails = await sequelize.query(
      `SELECT * FROM hierarchies WHERE id IN (:commonHierarchyIds);`,
      {
        replacements: { commonHierarchyIds },
        type: QueryTypes.SELECT,
      }
    );

    return hierarchyDetails;
  }

}

export default JobTempletRepository;
