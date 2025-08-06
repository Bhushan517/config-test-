import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
import { MinMaxRateQueryParams } from "../interfaces/rate-card-configuration.interface";
import { databaseConfig } from '../config/db';
const auth_db = databaseConfig.config.database_auth;


export const getAllRateCardQuery = (hierarchyIdCount: number, jobTemplateIdCount: number, startDate: number | undefined,
  endDate: number | undefined) => {
  let hierarchyIdCondition = hierarchyIdCount > 0
    ? `AND hj.hierarchy_id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
    : '';
  let jobTemplateIdCondition = jobTemplateIdCount > 0
    ? `AND jt.job_template_id IN (${Array.from({ length: jobTemplateIdCount }, (_, i) => `:job_template_id_${i + 1}`)})`
    : '';
  return `
        SELECT
            rcc.*,
            GROUP_CONCAT(DISTINCT JSON_OBJECT('id', h.id, 'name', h.name)) AS hierarchies,
            GROUP_CONCAT(DISTINCT JSON_OBJECT('id', j.id, 'name', j.template_name)) AS job_templates,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'rate', ex.rate,
                    'max_limit', ex.max_limit,
                    'unit_of_measure', ex.unit_of_measure,
                    'unit_lable', ex.unit_lable,
                    'expense_item_type_config', JSON_OBJECT('id', ex.expense_type_id, 'name', ec.type)
                )
            ) AS expenses
        FROM
            rate_type_configurations rcc
        LEFT JOIN
            JSON_TABLE(rcc.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
            ON hj.hierarchy_id IS NOT NULL
        LEFT JOIN
            hierarchies h ON h.id = hj.hierarchy_id
        LEFT JOIN
            JSON_TABLE(rcc.job_templates, '$[*]' COLUMNS (job_template_id CHAR(36) PATH '$')) AS jt
            ON jt.job_template_id IS NOT NULL
        LEFT JOIN
            job_templates j ON j.id = jt.job_template_id
        LEFT JOIN
            JSON_TABLE(rcc.expenses, '$[*]' COLUMNS (
                expense_type_id CHAR(36) PATH '$.expense_type_id',
                rate DECIMAL(10,2) PATH '$.rate',
                max_limit DECIMAL(10,2) PATH '$.max_limit',
                unit_lable VARCHAR(255) PATH '$.unit_lable',
                unit_of_measure VARCHAR(255) PATH '$.unit_of_measure'
            )) AS ex
            ON ex.expense_type_id IS NOT NULL
        LEFT JOIN
            expense_item_type_config ec ON ec.id = ex.expense_type_id
        WHERE
            rcc.is_deleted = 0
            AND rcc.program_id = :program_id
            AND (:name IS NULL OR rcc.name LIKE :name)
            AND (COALESCE(:is_enabled, rcc.is_enabled) = rcc.is_enabled OR rcc.is_enabled IS NULL)
            AND (COALESCE(:is_shift_rate, rcc.is_shift_rate) = rcc.is_shift_rate OR rcc.is_shift_rate IS NULL)
            ${hierarchyIdCondition}
            ${jobTemplateIdCondition}
            ${startDate !== undefined && endDate !== undefined ? 'AND rcc.updated_on BETWEEN :startDate AND :endDate' : ''}
        GROUP BY
            rcc.id
        ORDER BY
            rcc.created_on DESC
        LIMIT :limit OFFSET :offset;
    `;
};

export const fetchProgramConfigValues = `
   SELECT

    COALESCE(MAX(CASE WHEN programs_config.key = 'default_currency' THEN programs_config.value END)) AS defaultCurrency,

    COALESCE(MAX(CASE WHEN programs_config.key = 'time_zone' THEN programs_config.value END)) AS timeZone,

    COALESCE(MAX(CASE WHEN programs_config.key = 'rate_model_for_program' THEN programs_config.value END)) AS rateModel,
     COALESCE(MAX(CASE WHEN programs_config.key = 'default_date_format' THEN programs_config.value END)) AS preferredDateFormat,
    programs_config.program_id

FROM programs_config

WHERE

    programs_config.program_id =:programId

    AND programs_config.key IN ('default_currency', 'time_zone', 'rate_model_for_program','default_date_format')

GROUP BY programs_config.program_id

LIMIT 0, 1000;


`;

export const getCountQuery = (hierarchyIdCount: number, jobTemplateIdCount: number, startDate: number | undefined,
  endDate: number | undefined) => {
  let hierarchyIdCondition = hierarchyIdCount > 0
    ? `AND hj.hierarchy_id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
    : '';
  let jobTemplateIdCondition = jobTemplateIdCount > 0
    ? `AND jt.job_template_id IN (${Array.from({ length: jobTemplateIdCount }, (_, i) => `:job_template_id_${i + 1}`)})`
    : '';
  return `
        SELECT COUNT(DISTINCT rcc.id) AS total
        FROM rate_type_configurations rcc
        LEFT JOIN
            JSON_TABLE(rcc.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
            ON hj.hierarchy_id IS NOT NULL
        LEFT JOIN
            JSON_TABLE(rcc.job_templates, '$[*]' COLUMNS (job_template_id CHAR(36) PATH '$')) AS jt
            ON jt.job_template_id IS NOT NULL
        WHERE
            rcc.is_deleted = 0
            AND rcc.program_id = :program_id
            AND (:name IS NULL OR rcc.name LIKE :name)
            AND (COALESCE(:is_enabled, rcc.is_enabled) = rcc.is_enabled OR rcc.is_enabled IS NULL)
            AND (COALESCE(:is_shift_rate, rcc.is_shift_rate) = rcc.is_shift_rate OR rcc.is_shift_rate IS NULL)
            ${hierarchyIdCondition}
            ${jobTemplateIdCondition}
            ${startDate !== undefined && endDate !== undefined ? 'AND rcc.updated_on BETWEEN :startDate AND :endDate' : ''}
    `;
};

export const rateCardQuery = `
SELECT
    rcc.*,
    IF(rcc.is_shift_rate = 1, true, false) AS is_shift_rate,
    GROUP_CONCAT(DISTINCT JSON_OBJECT('id', h.id, 'name', h.name)) AS hierarchies,
    GROUP_CONCAT(DISTINCT JSON_OBJECT('id', j.id, 'name', j.template_name)) AS job_templates,
    JSON_ARRAYAGG(JSON_OBJECT(
        'rate', ex.rate,
        'max_limit', ex.max_limit,
        'unit_of_measure', ex.unit_of_measure,
        'unit_lable', ex.unit_lable,
        'expense_item_type_config', JSON_OBJECT('id', ec.id, 'name', ec.type)
    )) AS expenses
FROM
    rate_type_configurations rcc
LEFT JOIN JSON_TABLE(
    COALESCE(rcc.hierarchies, '[]'), '$[*]'
    COLUMNS (
        hierarchy_id CHAR(36) PATH '$'
    )
) AS hj ON hj.hierarchy_id IS NOT NULL
LEFT JOIN hierarchies h ON h.id = hj.hierarchy_id
LEFT JOIN JSON_TABLE(
    COALESCE(rcc.job_templates, '[]'), '$[*]'
    COLUMNS (
        job_template_id CHAR(36) PATH '$'
    )
) AS jt ON jt.job_template_id IS NOT NULL
LEFT JOIN job_templates j ON j.id = jt.job_template_id
LEFT JOIN JSON_TABLE(
    COALESCE(rcc.expenses, '[]'), '$[*]'
    COLUMNS (
        expense_type_id CHAR(36) PATH '$.expense_type_id',
        rate DECIMAL(10,2) PATH '$.rate',
        max_limit DECIMAL(10,2) PATH '$.max_limit',
        unit_lable VARCHAR(255) PATH '$.unit_lable',
        unit_of_measure VARCHAR(255) PATH '$.unit_of_measure'
    )
) AS ex ON ex.expense_type_id IS NOT NULL
LEFT JOIN expense_item_type_config ec ON ec.id = ex.expense_type_id
WHERE
    rcc.is_deleted = 0
    AND rcc.id = :id
GROUP BY
    rcc.id;
`;

export const programVendorQuery = (hasUserId: boolean, hasVendorId: boolean) => `
SELECT
  *
FROM
  program_vendors
WHERE
  program_vendors.program_id = :program_id
  ${hasUserId ? 'AND program_vendors.user_id = :user_id' : ''}
  ${hasVendorId ? 'AND program_vendors.id = :vendor_id' : ''};
`;

export const complianceDocumentGetByUserId = (replacements: any) => {
  let whereClause = `
    vcrm.program_id = :program_id
    AND vcrm.vendor_id = :vendor_id
    AND vcd.program_id = :program_id
    AND (vcrm.program_id IS NULL OR vcrm.program_id = :program_id)
    AND (:name IS NULL OR vcd.name LIKE :name)
    AND (:is_enabled IS NULL OR vcd.is_enabled LIKE :is_enabled)
    AND (:next_expiry_on IS NULL OR vcrm.next_expiry_on = :next_expiry_on)
  `;

  let countWhereClause = `
    vcrm_sub.program_id = :program_id
    AND vcrm_sub.vendor_id = :vendor_id
    AND vcd_sub.program_id = :program_id
    AND (vcrm_sub.program_id IS NULL OR vcrm_sub.program_id = :program_id)
    AND (:name IS NULL OR vcd_sub.name LIKE :name)
    AND (:is_enabled IS NULL OR vcd_sub.is_enabled LIKE :is_enabled)
    AND (:next_expiry_on IS NULL OR vcrm_sub.next_expiry_on = :next_expiry_on)
  `;

  if (replacements.updated_on) {
    whereClause += `
      AND (DATE(FROM_UNIXTIME(vcrm.updated_on / 1000)) = DATE(:updated_on))
    `;
    countWhereClause += `
      AND (DATE(FROM_UNIXTIME(vcrm_sub.updated_on / 1000)) = DATE(:updated_on))
    `;
  }

  if (replacements.compliance_verified) {
    whereClause += `
      AND ( u.first_name LIKE :compliance_verified OR
            u.last_name LIKE :compliance_verified OR
            CONCAT(u.first_name, ' ', u.last_name) LIKE :compliance_verified
          )
    `;
    countWhereClause += `
      AND ( u_sub.first_name LIKE :compliance_verified OR
            u_sub.last_name LIKE :compliance_verified OR
            CONCAT(u_sub.first_name, ' ', u_sub.last_name) LIKE :compliance_verified
          )
    `;
  }

  if (replacements.status && replacements.status.length > 0) {
    const statuses: string[] = replacements.status.map((s: string) => s.trim());
    const statusList = statuses.map((s: string) => `'${s}'`).join(',');

    whereClause += ` AND (vcrm.status IN (${statusList}))`;
    countWhereClause += ` AND (vcrm_sub.status IN (${statusList}))`;
  }

  return `
    SELECT DISTINCT
        vcd.id,
        vcd.program_id,
        vcd.name,
        vcd.act,
        vcd.document_number,
        vcd.upload_document_days,
        vcd.attached_doc_url,
        vcd.created_on,
        vcd.updated_on,
        vcd.is_enabled,
        vcd.is_deleted,
        vcd.to_uploaded,
        vcd.no_of_days,
        vcd.document_details,
        vcrm.id AS doc_id,
        vcrm.next_expiry_on,
        vcrm.status,
        vcrm.file_name,
        vcrm.expiry_on,
        vcrm.url,
        vcrm.audited_on,
        vcrm.compliance_note,
        vcrm.updated_on,
        vcrm.created_on,
        u.first_name,
        u.last_name,
        vcd.uploaded_document,
        (
          SELECT COUNT(DISTINCT vcd_sub.id)
          FROM vendor_compliance_req_doc_mappings vcrm_sub
          LEFT JOIN vendor_compliance_documents vcd_sub ON vcd_sub.id = vcrm_sub.required_document_id
          LEFT JOIN user u_sub ON u_sub.user_id = vcrm_sub.audited_by
          WHERE ${countWhereClause}
        ) AS total_count
    FROM vendor_compliance_req_doc_mappings vcrm
    LEFT JOIN vendor_compliance_documents vcd ON vcd.id = vcrm.required_document_id
    LEFT JOIN user u ON u.user_id = vcrm.audited_by
    WHERE ${whereClause}
    GROUP BY vcd.id
    ORDER BY vcrm.updated_on DESC
    LIMIT :limit OFFSET :offset
  `;
};

export const complianceDocumentGetByUserAndDocumentId = `
    SELECT
        vcd.id,
        vcd.program_id,
        vcd.name,
        vcd.act,
        vcd.document_number,
        vcd.upload_document_days,
        vcd.attached_doc_url,
        vcd.created_on,
        vcd.updated_on,
        vcd.is_enabled,
        vcd.is_deleted,
        vcd.to_uploaded,
        vcd.no_of_days,
        vcd.document_details,
        vcrm.id AS doc_id,
        vcrm.next_expiry_on,
        vcrm.status,
        vcrm.file_name,
        vcrm.expiry_on,
        vcrm.url,
        vcrm.audited_on,
        vcrm.compliance_note,
        vcrm.updated_on,
        vcrm.created_on,
        u.first_name,
        u.last_name,
        vcd.uploaded_document,
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', wl.id,
                    'name', wl.name
                )
            )
            FROM work_locations wl
            WHERE JSON_CONTAINS(vcd.work_locations, JSON_QUOTE(wl.id))
        ) AS work_location
    FROM
        program_vendors pv
    JOIN
      vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group ,JSON_QUOTE(vdg.id))
    LEFT JOIN
        vendor_compliance_documents vcd ON JSON_CONTAINS(vdg.required_documents, JSON_QUOTE(vcd.id))
    LEFT JOIN
        vendor_compliance_req_doc_mappings vcrm ON vcd.id = vcrm.required_document_id AND vcrm.vendor_id=:vendor_id
    LEFT JOIN
        user u ON u.user_id = vcrm.audited_by
    WHERE
        pv.program_id = :program_id
        AND (pv.id IS NULL OR pv.id = :vendor_id)
        AND (:document_id IS NULL OR vcd.id = :document_id)
`;

export const complianceDocumentGetByVendorId = (replacements: any) => {
  let whereClause = `
    vcrm.program_id = :program_id
    AND vcrm.vendor_id = :vendor_id
    AND vcd.program_id = :program_id
    AND (vcrm.program_id IS NULL OR vcrm.program_id = :program_id)
    AND (:name IS NULL OR vcd.name LIKE :name)
    AND (:is_enabled IS NULL OR vcd.is_enabled LIKE :is_enabled)
    AND (:next_expiry_on IS NULL OR vcrm.next_expiry_on = :next_expiry_on)
    AND (:expiry_on IS NULL OR vcrm.expiry_on = :expiry_on)
  `;

  let countWhereClause = `
    vcrm_sub.program_id = :program_id
    AND vcrm_sub.vendor_id = :vendor_id
    AND vcd_sub.program_id = :program_id
    AND (vcrm_sub.program_id IS NULL OR vcrm_sub.program_id = :program_id)
    AND (:name IS NULL OR vcd_sub.name LIKE :name)
    AND (:is_enabled IS NULL OR vcd_sub.is_enabled LIKE :is_enabled)
    AND (:next_expiry_on IS NULL OR vcrm_sub.next_expiry_on = :next_expiry_on)
    AND (:expiry_on IS NULL OR vcrm_sub.expiry_on = :expiry_on)
  `;

  if (replacements.updated_on) {
    whereClause += `
      AND (DATE(FROM_UNIXTIME(vcrm.updated_on / 1000)) = DATE(:updated_on))
    `;
    countWhereClause += `
      AND (DATE(FROM_UNIXTIME(vcrm_sub.updated_on / 1000)) = DATE(:updated_on))
    `;
  }

  if (replacements.compliance_verified) {
    whereClause += `
      AND ( u.first_name LIKE :compliance_verified OR
            u.last_name LIKE :compliance_verified OR
            CONCAT(u.first_name, ' ', u.last_name) LIKE :compliance_verified
          )
    `;
    countWhereClause += `
      AND ( u_sub.first_name LIKE :compliance_verified OR
            u_sub.last_name LIKE :compliance_verified OR
            CONCAT(u_sub.first_name, ' ', u_sub.last_name) LIKE :compliance_verified
          )
    `;
  }

  if (replacements.status && replacements.status.length > 0) {
    const statuses: string[] = replacements.status.map((s: string) => s.trim());
    const statusList = statuses.map((s: string) => `'${s}'`).join(',');

    whereClause += ` AND (vcrm.status IN (${statusList}))`;
    countWhereClause += ` AND (vcrm_sub.status IN (${statusList}))`;
  }

  return `
    SELECT DISTINCT
        vcd.id,
        vcd.program_id,
        vcd.name,
        vcd.act,
        vcd.document_number,
        vcd.upload_document_days,
        vcd.attached_doc_url,
        vcd.created_on,
        vcd.updated_on,
        vcd.is_enabled,
        vcd.is_deleted,
        vcd.to_uploaded,
        vcd.no_of_days,
        vcd.document_details,
        vcrm.id AS doc_id,
        vcrm.next_expiry_on,
        vcrm.status,
        vcrm.file_name,
        vcrm.expiry_on,
        vcrm.url,
        vcrm.audited_on,
        vcrm.compliance_note,
        vcrm.updated_on,
        vcrm.created_on,
        u.first_name,
        u.last_name,
        vcd.uploaded_document,
        (
          SELECT COUNT(DISTINCT vcd_sub.id)
          FROM vendor_compliance_req_doc_mappings vcrm_sub
          LEFT JOIN vendor_compliance_documents vcd_sub ON vcd_sub.id = vcrm_sub.required_document_id
          LEFT JOIN user u_sub ON u_sub.user_id = vcrm_sub.audited_by
          WHERE ${countWhereClause}
        ) AS total_count
    FROM vendor_compliance_req_doc_mappings vcrm
    LEFT JOIN vendor_compliance_documents vcd ON vcd.id = vcrm.required_document_id
    LEFT JOIN user u ON u.user_id = vcrm.audited_by AND (u.user_type = 'super_user' OR u.program_id = :program_id)
    WHERE ${whereClause}
    GROUP BY vcd.id
    ORDER BY vcrm.updated_on DESC
    LIMIT :limit OFFSET :offset
  `;
};

export const complianceDocumentCountByVendorId = `
    SELECT
        COUNT(DISTINCT vcd.id) AS total_count
    FROM
        program_vendors pv
    JOIN
        vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group, JSON_QUOTE(vdg.id))
    LEFT JOIN
        vendor_compliance_documents vcd ON JSON_CONTAINS(vdg.required_documents, JSON_QUOTE(vcd.id))
    WHERE
        pv.program_id = :program_id
        AND (:vendor_id IS NULL OR pv.id = :vendor_id)
`;

export const complianceDocumentGetByVendorAndDocumentId = `
    SELECT
        vcd.id,
        vcd.program_id,
        vcd.name,
        vcd.act,
        vcd.document_number,
        vcd.upload_document_days,
        vcd.attached_doc_url,
        vcd.created_on,
        vcd.updated_on,
        vcd.is_enabled,
        vcd.is_deleted,
        vcd.to_uploaded,
        vcd.no_of_days,
        vcd.document_details,
        vcrm.id AS doc_id,
        vcrm.next_expiry_on,
        vcrm.status,
        vcrm.file_name,
        vcrm.expiry_on,
        vcrm.url,
        vcrm.audited_on,
        vcrm.compliance_note,
        vcrm.updated_on,
        vcrm.created_on,
        u.first_name,
        u.last_name,
        vcd.uploaded_document,
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', wl.id,
                    'name', wl.name
                )
            )
            FROM work_locations wl
            WHERE JSON_CONTAINS(vcd.work_locations, JSON_QUOTE(wl.id))
        ) AS work_location,
        pv.vendor_name
    FROM
        program_vendors pv
    JOIN
        vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group ,JSON_QUOTE(vdg.id))
    LEFT JOIN
        vendor_compliance_documents vcd ON JSON_CONTAINS(vdg.required_documents, JSON_QUOTE(vcd.id))
    LEFT JOIN
        vendor_compliance_req_doc_mappings vcrm ON vcd.id = vcrm.required_document_id AND vcrm.vendor_id=:vendor_id
    LEFT JOIN
        user u ON u.user_id = vcrm.audited_by
    WHERE
        pv.program_id = :program_id
        AND (pv.id IS NULL OR pv.id = :vendor_id)
        AND (:document_id IS NULL OR vcd.id = :document_id)
`;

export const complianceGroupQueryWithUserId = `
  SELECT
    vcd.id AS document_id,
    vcd.*
  FROM
    program_vendors pv
  JOIN
    vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group ,JSON_QUOTE(vdg.id))
  LEFT JOIN
    vendor_compliance_documents vcd ON vcd.id = :document_id
  WHERE
    pv.program_id = :program_id
    AND pv.user_id = :user_id
   AND (vcd.id IS NULL OR vcd.id = :document_id)
  LIMIT 1;
`;

export const complianceGroupQueryWithVendorId = `
  SELECT
    vcd.id AS document_id,
    vcd.*
  FROM
    program_vendors pv
  JOIN
    vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group ,JSON_QUOTE(vdg.id))
  LEFT JOIN
    vendor_compliance_documents vcd ON vcd.id = :document_id
  WHERE
    pv.program_id = :program_id
    AND pv.id = :vendor_id
   AND (vcd.id IS NULL OR vcd.id = :document_id)
  LIMIT 1;
`;

export const getComplianceDocuments = `
  SELECT
    vcd.*
  FROM
    program_vendors pv
  JOIN
   vendor_document_groups vdg ON JSON_CONTAINS(pv.com_doc_group ,JSON_QUOTE(vdg.id))
  LEFT JOIN
    vendor_compliance_documents vcd ON JSON_CONTAINS(vdg.required_documents, JSON_QUOTE(vcd.id))
  WHERE
    pv.program_id = :program_id
    AND pv.user_id = :user_id
`;

export const getHierarchieWithChildren = `
WITH RECURSIVE hierarchy_cte AS (
  SELECT
    h.id,
    h.parent_hierarchy_id,
    h.name,
    h.is_enabled,
    h.default_date_format,
    h.rate_model,
    h.created_on,
    h.updated_on,
    h.code,
    h.program_id,
    h.support_email,
    h.default_timezone,
    h.is_hide_candidate_img,
    h.default_language,
    h.default_currency,
    h.default_time_format,
    h.is_vendor_neutral_program,
    h.managed_by
  FROM hierarchies h
  WHERE h.program_id = :program_id
    AND h.parent_hierarchy_id IS NULL
    AND h.is_deleted = false
    AND h.is_enabled = true
  UNION ALL

  SELECT
    h.id,
    h.parent_hierarchy_id,
    h.name,
    h.is_enabled,
    h.default_date_format,
    h.rate_model,
    h.created_on,
    h.updated_on,
    h.code,
    h.program_id,
    h.support_email,
    h.default_timezone,
    h.is_hide_candidate_img,
    h.default_language,
    h.default_currency,
    h.default_time_format,
    h.is_vendor_neutral_program,
    h.managed_by
  FROM hierarchies h
  INNER JOIN hierarchy_cte hc ON h.parent_hierarchy_id = hc.id
  WHERE h.is_deleted = false
    AND h.is_enabled = true
)
SELECT *
FROM hierarchy_cte;
`;

export const getAllHierarchies = (
  hasName: boolean,
  hasIsEnabled: boolean,
  startDate?: number,
  endDate?: number,
  hasMsp?: boolean,
  hasMspHierarchyFilter?: boolean
) => `
WITH hierarchy_cte AS (
  SELECT
    h.id,
    h.name,
    h.code,
    h.parent_hierarchy_id,
    h.is_enabled,
    h.updated_on,
    h.created_on,
    h.program_id,
    h.is_deleted,
    h.default_date_format,
    h.is_vendor_neutral_program,
    h.is_not_editable,
    h.default_currency,
    ph.name AS parent_hierarchy_name,
    CASE
      WHEN UPPER(h.managed_by) = 'SELF-MANAGED' THEN JSON_OBJECT(
        'id', 'self-managed',
        'name', 'self-managed',
        'display_name', 'self-managed'
      )
      ELSE JSON_OBJECT(
        'id', t.id,
        'name', t.name,
        'display_name', t.display_name
      )
    END AS managed_by
  FROM hierarchies h
  LEFT JOIN hierarchies ph ON h.parent_hierarchy_id = ph.id
  LEFT JOIN tenant t ON h.managed_by = t.id
  WHERE h.program_id = :program_id
    AND h.is_deleted = false
    ${hasName ? 'AND h.name LIKE :name' : ''}
    ${hasIsEnabled ? 'AND h.is_enabled = :is_enabled' : ''}
    ${startDate !== undefined && endDate !== undefined ? 'AND h.updated_on BETWEEN :startDate AND :endDate' : ''}
    ${hasMsp ? 'AND h.managed_by = :msp' : ''}
    ${hasMspHierarchyFilter ? 'AND h.id IN (:mspHierarchyIds)' : ''}

),
total_count_cte AS (
  SELECT COUNT(*) AS total_count FROM hierarchy_cte
)

SELECT
  h.*,
  (SELECT total_count FROM total_count_cte) AS total_count
FROM hierarchy_cte h
ORDER BY
  h.created_on DESC,
  CASE
    WHEN h.parent_hierarchy_id IS NULL THEN 0
    ELSE 1
  END,
  h.id
LIMIT :limit OFFSET :offset;
`;


// export const vendorDataQuery = `
// SELECT
//     pv.id,
//     pv.vendor_name,
//     pv.vendor_type,
//     pv.status,
//     pv.supl_ref_id,
//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', i.id,
//                 'name', i.name
//             )
//         )
//         FROM labour_category i
//         WHERE JSON_CONTAINS(pv.program_industry, JSON_QUOTE(i.id))
//     ) AS program_industry,
//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', wl.id,
//                 'name', wl.name
//             )
//         )
//         FROM work_locations wl
//         WHERE JSON_CONTAINS(pv.work_locations, JSON_QUOTE(wl.id))
//     ) AS work_locations,
//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', h.id,
//                 'name', h.name
//             )
//         )
//         FROM hierarchies h
//         WHERE JSON_CONTAINS(pv.hierarchies, JSON_QUOTE(h.id))
//     ) AS hierarchies,
//        CASE
//        WHEN pv.is_labour_category = 1 THEN TRUE
//         ELSE FALSE
//        END AS is_labour_category,
//     CASE
//        WHEN pv.all_work_locations = 1 THEN TRUE
//         ELSE FALSE
//        END AS all_work_locations,
//     CASE
//         WHEN pv.all_hierarchy = 1 THEN TRUE
//         ELSE FALSE
//        END AS all_hierarchy,
//     CASE
//         WHEN pv.all_job_type = 1 THEN TRUE
//         ELSE FALSE
//          END AS all_job_type,

//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', vg.id,
//                 'vendor_group_name', vg.vendor_group_name
//             )
//         )
//         FROM vendor_groups vg
//         WHERE JSON_CONTAINS(pv.vendor_group_id, JSON_QUOTE(vg.id))
//     ) AS vendor_group_id,
//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', vdg.id,
//                 'name', vdg.name
//             )
//         )
//         FROM vendor_document_groups vdg
//         WHERE JSON_CONTAINS(pv.com_doc_group, JSON_QUOTE(vdg.id))
//     ) AS com_doc_group,
//     pv.bussiness_structure,
//     pv.job_type,
//     pv.program_id,
//     pv.tenant_id,
//     pv.is_enabled,
//     pv.description,
//     pv.company_website,
//     pv.establish_year,
//     pv.social_media,
//     pv.addresses,
//     pv.contact,
//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', vmc.id,
//                 'rate_model', vmc.rate_model,
//                 'sliding_scale', vmc.sliding_scale,
//                 'markups', vmc.markups,
//                 'work_locations', (
//                    SELECT JSON_OBJECT(
//                         'id', wl.id,
//                         'name', wl.name
//                     )
//                     FROM work_locations wl
//                     WHERE wl.id = vmc.work_locations
//                 ),
//                 'hierarchy', (
//                     SELECT JSON_OBJECT(
//                         'id', h.id,
//                         'name', h.name
//                     )
//                     FROM hierarchies h
//                     WHERE h.id = vmc.hierarchy
//                 ),
//                 'program_industry', (
//                      SELECT JSON_OBJECT(
//                         'id', i.id,
//                         'name', i.name
//                     )
//                     FROM labour_category i
//                     WHERE i.id = vmc.program_industry
//                 ),
//                 'is_enabled', vmc.is_enabled
//             )
//         )
//         FROM vendor_markup_config vmc
//         WHERE vmc.program_vendor_id = pv.id
//         ORDER BY
//             ((vmc.work_locations IS NULL) + (vmc.hierarchy IS NULL) + (vmc.program_industry IS NULL)) DESC
//     ) AS markup_config
// FROM program_vendors pv
// WHERE pv.id = :id
//   AND pv.program_id = :program_id;
// `;

export const vendorDataQuery = `
SELECT
    pv.id,
    pv.vendor_name,
    pv.display_name,
    pv.vendor_type,
    pv.status,
    pv.supl_ref_id,
    pv.is_job_auto_opt_in,
    pv.vendor_logo, -- Added vendor_logo here
    pv.updated_on,
    pv.created_on,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', i.id,
                'name', i.name
            )
        )
        FROM labour_category i
        WHERE JSON_CONTAINS(pv.program_industry, JSON_QUOTE(i.id))
    ) AS program_industry,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', wl.id,
                'name', wl.name
            )
        )
        FROM work_locations wl
        WHERE JSON_CONTAINS(pv.work_locations, JSON_QUOTE(wl.id))
    ) AS work_locations,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', h.id,
                'name', h.name
            )
        )
        FROM hierarchies h
        WHERE JSON_CONTAINS(pv.hierarchies, JSON_QUOTE(h.id))
    ) AS hierarchies,
   (
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', vcf.id,
      'custom_field_id', vcf.custom_field_id,
      'name', cf.name,
      'label', cf.label,
      'value', vcf.value,
      'field_type', cf.field_type,
      'manager_name',
        CASE
          WHEN user.user_id IS NOT NULL
          THEN CONCAT(user.first_name, ' ', user.last_name)
          ELSE NULL
        END
    )
  )
  FROM vendor_custom_field vcf
  LEFT JOIN custom_fields cf ON cf.id = vcf.custom_field_id
  LEFT JOIN user ON TRIM(BOTH '"' FROM vcf.value) = user.user_id AND user.program_id = cf.program_id
  WHERE vcf.vendor_id = pv.id
  AND cf.is_enabled=true
  AND cf.is_deleted = false
) AS custom_field,
    CASE
       WHEN pv.is_labour_category = 1 THEN TRUE
        ELSE FALSE
       END AS is_labour_category,
    CASE
       WHEN pv.all_work_locations = 1 THEN TRUE
        ELSE FALSE
       END AS all_work_locations,
    CASE
        WHEN pv.all_hierarchy = 1 THEN TRUE
        ELSE FALSE
       END AS all_hierarchy,
    CASE
        WHEN pv.all_job_type = 1 THEN TRUE
        ELSE FALSE
         END AS all_job_type,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', vg.id,
                'vendor_group_name', vg.vendor_group_name
            )
        )
        FROM vendor_groups vg
        WHERE JSON_CONTAINS(pv.vendor_group_id, JSON_QUOTE(vg.id))
    ) AS vendor_group_id,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', vdg.id,
                'name', vdg.name
            )
        )
        FROM vendor_document_groups vdg
        WHERE JSON_CONTAINS(pv.com_doc_group, JSON_QUOTE(vdg.id))
    ) AS com_doc_group,
    pv.bussiness_structure,
    pv.job_type,
    pv.program_id,
    (
      SELECT JSON_OBJECT(
        'id', t.id,
        'logo', t.logo,
        'display_name', t.display_name
    )
    FROM tenant t WHERE t.id = pv.tenant_id
    ) AS tenant_id,
    pv.description,
    pv.company_website,
    pv.establish_year,
    pv.social_media,
    pv.addresses,
    pv.contact,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', vmc.id,
                'rate_model', vmc.rate_model,
                'sliding_scale', vmc.sliding_scale,
                'markups', vmc.markups,
                'job_type', COALESCE(
                    (
                        SELECT JSON_OBJECT(
                            'id', pi.id,
                            'label', pi.label,
                            'value', pi.value
                        )
                        FROM picklistitems pi
                        WHERE pi.id = vmc.job_type
                    ),
                    JSON_OBJECT('id', 'all', 'label', 'All')
                ),
                'job_template', COALESCE(
                    (
                        SELECT JSON_OBJECT(
                            'id', jt.id,
                            'name', jt.template_name
                        )
                        FROM job_templates jt
                        WHERE jt.id = vmc.job_template
                    ),
                    JSON_OBJECT('id', 'all', 'name', 'All')
                ),
                'worker_type', COALESCE(
                    (
                        SELECT JSON_OBJECT(
                            'id', pi.id,
                            'label', pi.label,
                            'value', pi.value
                        )
                        FROM picklistitems pi
                        WHERE pi.id = vmc.worker_type
                    ),
                    JSON_OBJECT('id', 'all', 'label', 'All')
                ),
                'worker_classification', COALESCE(
                    (
                        SELECT JSON_OBJECT(
                            'id', pi.id,
                            'label', pi.label,
                            'value', pi.value
                        )
                        FROM picklistitems pi
                        WHERE pi.id = vmc.worker_classification
                    ),
                    JSON_OBJECT('id', 'all', 'label', 'All')
                ),
                'rate_type', COALESCE(
                    (
                        SELECT JSON_OBJECT(
                            'id', rt.id,
                            'name', rt.name
                        )
                        FROM rate_type rt
                        WHERE rt.id = vmc.rate_type
                    ),
                    JSON_OBJECT('id', 'all', 'name', 'All')
                ),
                'work_locations', COALESCE(
                    (
                        SELECT JSON_OBJECT(
                            'id', wl.id,
                            'name', wl.name
                        )
                        FROM work_locations wl
                        WHERE wl.id = vmc.work_locations
                    ),
                    JSON_OBJECT('id', 'all', 'name', 'All')
                ),
                'hierarchy', COALESCE(
                    (
                        SELECT JSON_OBJECT(
                            'id', h.id,
                            'name', h.name
                        )
                        FROM hierarchies h
                        WHERE h.id = vmc.hierarchy
                    ),
                    JSON_OBJECT('id', 'all', 'name', 'All')
                ),
                'program_industry', COALESCE(
                    (
                        SELECT JSON_OBJECT(
                            'id', i.id,
                            'name', i.name
                        )
                        FROM labour_category i
                        WHERE i.id = vmc.program_industry
                    ),
                    JSON_OBJECT('id', 'all', 'name', 'All')
                ),
                'is_enabled', vmc.is_enabled
            )
        )
        FROM vendor_markup_config vmc
        WHERE vmc.program_vendor_id = pv.id
        ORDER BY
            ((vmc.work_locations IS NULL) + (vmc.hierarchy IS NULL) + (vmc.program_industry IS NULL)) DESC
    ) AS markup_config
FROM program_vendors pv
WHERE pv.id = :id
  AND pv.program_id = :program_id;
`;

export const foundationDataQuery = `
SELECT
    md.id,
    md.program_id,
    md.name,
    md.is_enabled,
    md.updated_on,
    md.code,
    md.foundational_data_type_id,
    md.depended_fields,
    t.id AS manager_ids,
    t.first_name AS first_name,
    t.last_name AS last_name,
    mdt.name AS foundational_data_type_name
FROM
    master_data AS md
LEFT JOIN
    user AS t
    ON md.manager_ids = t.id
LEFT JOIN
    master_data_type AS mdt
    ON md.foundational_data_type_id = mdt.id
WHERE
    md.program_id = :program_id
    AND md.is_deleted = 0
    AND (:id IS NULL OR md.id = :id)
    AND (:name IS NULL OR md.name LIKE :name)
    AND (:is_enabled IS NULL OR md.is_enabled = :is_enabled)
    AND (:updated_on_start IS NULL OR :updated_on_end IS NULL OR md.updated_on BETWEEN :updated_on_start AND :updated_on_end)
    AND (:manager_ids IS NULL OR md.manager_ids = :manager_ids)
    AND (:code IS NULL OR md.code LIKE :code)
    AND (:foundational_data_type_id IS NULL OR md.foundational_data_type_id = :foundational_data_type_id)
    AND (:first_name IS NULL OR t.first_name LIKE :first_name)
ORDER BY
    md.created_on DESC
LIMIT
    :limit OFFSET :offset;
`;

export const countFoundationDataQuery = `
SELECT COUNT(DISTINCT md.id) AS total
FROM
    master_data AS md
LEFT JOIN
    user AS t
    ON md.manager_ids = t.id
LEFT JOIN
    master_data_type AS mdt
    ON md.foundational_data_type_id = mdt.id
WHERE
    md.program_id = :program_id
    AND md.is_deleted = 0
    AND (:id IS NULL OR md.id = :id)
    AND (:name IS NULL OR md.name LIKE :name)
    AND (:is_enabled IS NULL OR md.is_enabled = :is_enabled)
    AND (:updated_on_start IS NULL OR :updated_on_end IS NULL OR md.updated_on BETWEEN :updated_on_start AND :updated_on_end)
    AND (:manager_ids IS NULL OR md.manager_ids = :manager_ids)
    AND (:code IS NULL OR md.code LIKE :code)
    AND (:foundational_data_type_id IS NULL OR md.foundational_data_type_id = :foundational_data_type_id)
    AND (:first_name IS NULL OR t.first_name LIKE :first_name)
`;

export const existingPairQuery = `
    SELECT rate_type_configurations.id
    FROM rate_type_configurations,
         JSON_TABLE(rate_type_configurations.hierarchies, '$[*]' COLUMNS (hierarchy_id VARCHAR(255) PATH '$')) AS h,
         JSON_TABLE(rate_type_configurations.job_templates, '$[*]' COLUMNS (job_template_id VARCHAR(255) PATH '$')) AS j
    WHERE program_id = :program_id
      AND h.hierarchy_id IN (:hierarchies)
      AND j.job_template_id IN (:jobTemplates)
      AND is_deleted = false
    LIMIT 1
`;

export const getShiftTypesByHierarchiesQuery = `
    SELECT DISTINCT
        st.id AS shift_type_id,
        st.shift_type_name,
        st.shift_type_category,
        st.is_enabled,
        st.shift_type_time,
        st.time_duration
    FROM
        shift_types st
    JOIN
        shift_type_configurations stc ON st.id = stc.shift_type_id
    JOIN
        shift_configuration_hierarchies sch ON stc.shift_config_id = sch.shift_config_id
    WHERE
        sch.hierarchy_id IN (:hierarchy_ids)  -- Use placeholders for dynamic values
    AND
        st.is_enabled = true
    AND
        st.is_deleted = false
    AND
        st.program_id = :program_id
`;


export const rateTypeConfigQuery = (hierarchyIdCount: number, jobTemplateIdCount: number) => {
  let hierarchyIdCondition = hierarchyIdCount > 0
    ? `AND hj.hierarchy_id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
    : '';
  let jobTemplateIdCondition = jobTemplateIdCount > 0
    ? `AND jt.job_template_id IN (${Array.from({ length: jobTemplateIdCount }, (_, i) => `:job_template_id_${i + 1}`)})`
    : '';

  return `
        SELECT DISTINCT
            REPLACE(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(rcc.rate_configuration, '$[*].rate_type_name')), '[', ''), ']', '') AS rate_type_name
        FROM
            rate_type_configurations rcc
        LEFT JOIN
            JSON_TABLE(rcc.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
            ON hj.hierarchy_id IS NOT NULL
        LEFT JOIN
            JSON_TABLE(rcc.job_templates, '$[*]' COLUMNS (job_template_id CHAR(36) PATH '$')) AS jt
            ON jt.job_template_id IS NOT NULL
        WHERE
            rcc.is_deleted = 0
            AND rcc.program_id = :program_id
            AND (COALESCE(:is_enabled, rcc.is_enabled) = rcc.is_enabled OR rcc.is_enabled IS NULL)
            AND (COALESCE(:is_shift_rate, rcc.is_shift_rate) = rcc.is_shift_rate OR rcc.is_shift_rate IS NULL)
            ${hierarchyIdCondition}
            ${jobTemplateIdCondition}
        AND JSON_UNQUOTE(JSON_EXTRACT(rcc.rate_configuration, '$[*].rate_type_name')) IS NOT NULL
        ORDER BY rate_type_name ASC;
    `;
};

export const shiftTypeConfigQuery = (hierarchyIdCount: number, jobTemplateIdCount: number) => {
  let hierarchyIdCondition = hierarchyIdCount > 0
    ? `AND hj.hierarchy_id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
    : '';
  let jobTemplateIdCondition = jobTemplateIdCount > 0
    ? `AND jt.job_template_id IN (${Array.from({ length: jobTemplateIdCount }, (_, i) => `:job_template_id_${i + 1}`)})`
    : '';
  return `
        SELECT DISTINCT
            JSON_UNQUOTE(JSON_EXTRACT(rcc.rate_configuration, '$[0].shift_type')) AS shift_type
        FROM
            rate_type_configurations rcc
        LEFT JOIN
            JSON_TABLE(rcc.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
            ON hj.hierarchy_id IS NOT NULL
        LEFT JOIN
            JSON_TABLE(rcc.job_templates, '$[*]' COLUMNS (job_template_id CHAR(36) PATH '$')) AS jt
            ON jt.job_template_id IS NOT NULL
        WHERE
            rcc.is_deleted = 0
            AND rcc.program_id = '0025d61f-1b53-43fc-951f-e8d19a4e1388'
            AND (COALESCE(NULL, rcc.is_enabled) = rcc.is_enabled OR rcc.is_enabled IS NULL)
            AND (COALESCE(NULL, rcc.is_shift_rate) = rcc.is_shift_rate OR rcc.is_shift_rate IS NULL)
            ${hierarchyIdCondition}
            ${jobTemplateIdCondition}
        AND JSON_UNQUOTE(JSON_EXTRACT(rcc.rate_configuration, '$[0].shift_type')) IS NOT NULL
        ORDER BY shift_type ASC;
    `;
};

export const minMaxRateQuery = ({
  hierarchyIdsJSON,
  jobTemplateId,
  currency,
  unit_of_measure,
  programId,
  is_shift_rate
}: MinMaxRateQueryParams) => {
  const hierarchyIdsArray = typeof hierarchyIdsJSON === 'string'
    ? JSON.parse(hierarchyIdsJSON)
    : hierarchyIdsJSON;
  const isShiftRateValue = is_shift_rate ? '1' : '0';
  return `
    SELECT
        r.unit_of_measure,
        r.currency,
        MIN(r.min_rate) AS min_rate,
        MAX(r.max_rate) AS max_rate
    FROM rate_type_configurations rcc
    JOIN JSON_TABLE(
        rcc.rate_configuration,
        '$[*].rates[*].rate[*]' COLUMNS (
            unit_of_measure VARCHAR(255) PATH '$.unit_of_measure',
            currency VARCHAR(255) PATH '$.currency',
            min_rate DECIMAL(10, 2) PATH '$.min_rate',
            max_rate DECIMAL(10, 2) PATH '$.max_rate'
        )
    ) AS r
    WHERE r.unit_of_measure = '${unit_of_measure}'
      AND r.currency = '${currency}'
      AND JSON_OVERLAPS(rcc.hierarchies, JSON_ARRAY(${hierarchyIdsArray.map((id: string) => `"${id}"`).join(',')}))
      AND JSON_CONTAINS(rcc.job_templates, '"${jobTemplateId}"')
      AND rcc.program_id = '${programId}'
      AND rcc.is_shift_rate='${isShiftRateValue}'
    GROUP BY r.unit_of_measure, r.currency;
    `;
};

export const rateModelQuery = `
WITH RECURSIVE hierarchy_tree AS (
  -- Base case: Start with the selected hierarchies (including parent and child hierarchies)
  SELECT
    h.id,
    h.parent_hierarchy_id,
    h.rate_model
  FROM
    hierarchies h
  WHERE
    h.id IN (:hierarchyIds)
    AND h.program_id = :programId

  UNION ALL

  -- Recursive case: Climb up the hierarchy by joining parents recursively
  SELECT
    parent_h.id,
    parent_h.parent_hierarchy_id,
    parent_h.rate_model
  FROM
    hierarchies parent_h
  JOIN
    hierarchy_tree ht ON parent_h.id = ht.parent_hierarchy_id
  WHERE
    parent_h.program_id = :programId
)

-- 1. First check: If two or more hierarchies share the same rate model, return that rate model
SELECT rate_model
FROM hierarchy_tree
GROUP BY rate_model
HAVING COUNT(DISTINCT id) >= 2  -- Ensure that at least two hierarchies have the same rate model

UNION ALL

-- Second query: If no common rate model, return the rate model of the common parent
SELECT rate_model
FROM (
  SELECT rate_model, id
  FROM hierarchy_tree
  ORDER BY id ASC  -- prioritize closest common parent (by id)
  LIMIT 1
) AS common_parent_rate_model


UNION ALL

-- 3. Third check: If no parent hierarchy is present, fallback to the rate model of the first available child hierarchy
SELECT rate_model
FROM (
  SELECT rate_model
  FROM hierarchy_tree
  WHERE parent_hierarchy_id IS NOT NULL
  ORDER BY rate_model
  LIMIT 1
) AS common_child_rate_model

LIMIT 1;
`;

export const getChildWorkflowsQuery = (hierarchyIdCount: number) => {
  let hierarchyIdCondition = hierarchyIdCount > 0
    ? `AND h.id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
    : '';
  return `
    SELECT wf.id AS workflow_id,
           wf.name AS workflow_name,
           wf.created_on,
           wf.flow_type,
           wf.is_enabled,
           wf.placement_order,
           wf.is_associated_to_all_hierarchy,
           e.id AS event_id,
           e.name AS event_name,
           e.module_id,
           m.id AS module_id,
           m.name AS module_name,
           JSON_ARRAYAGG(JSON_OBJECT('id', h.id, 'name', h.name)) AS hierarchies
    FROM workflow_config wf
    LEFT JOIN event e ON wf.event_id = e.id
    LEFT JOIN module m ON wf.module = m.id
    LEFT JOIN JSON_TABLE(wf.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
      ON hj.hierarchy_id IS NOT NULL
    LEFT JOIN hierarchies h ON h.id = hj.hierarchy_id
    WHERE wf.program_id = :program_id
      AND wf.workflow_id = :workflow_id
      AND wf.flow_type = :flow_type
      AND wf.is_deleted = 0
      AND (:name IS NULL OR wf.name LIKE :name)
      AND (:is_enabled IS NULL OR wf.is_enabled = :is_enabled)
      ${hierarchyIdCondition}
    GROUP BY wf.id, wf.name, wf.created_on, e.id, e.name, m.id, m.name, wf.is_enabled
     ORDER BY wf.placement_order;
    `;
};

export const getparentWorkflowsQuery = (hierarchyIdCount: number) => {
  let hierarchyIdCondition = hierarchyIdCount > 0
    ? `AND h.id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
    : '';
  return `
    SELECT wf.id AS workflow_id,
           wf.name AS workflow_name,
           wf.created_on,
           wf.flow_type,
           wf.is_enabled,
           wf.placement_order,
           wf.is_associated_to_all_hierarchy,
           e.id AS event_id,
           e.name AS event_name,
           e.module_id,
           m.id AS module_id,
           m.name AS module_name,
           JSON_ARRAYAGG(JSON_OBJECT('id', h.id, 'name', h.name)) AS hierarchies
    FROM workflow_config wf
    LEFT JOIN event e ON wf.event_id = e.id
    LEFT JOIN module m ON wf.module = m.id
    LEFT JOIN JSON_TABLE(wf.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
      ON hj.hierarchy_id IS NOT NULL
    LEFT JOIN hierarchies h ON h.id = hj.hierarchy_id
    WHERE wf.id = :workflow_id
      AND wf.program_id = :program_id
      AND wf.flow_type = :flow_type
      AND wf.is_deleted = 0
      AND (:name IS NULL OR wf.name LIKE :name)
      AND (:is_enabled IS NULL OR wf.is_enabled = :is_enabled)
      ${hierarchyIdCondition}
    GROUP BY wf.id, wf.name, wf.created_on, e.id, e.name, m.id, m.name, wf.is_enabled
    ORDER BY wf.placement_order;
    `;
};

export const countChildWorkflowsQuery = (hierarchyIdCount: number) => {
  let hierarchyIdCondition = hierarchyIdCount > 0
    ? `AND h.id IN (${Array.from({ length: hierarchyIdCount }, (_, i) => `:hierarchy_id_${i + 1}`)})`
    : '';
  return `
    SELECT COUNT(DISTINCT wf.id) AS total_workflows
    FROM workflow_config wf
    LEFT JOIN module m ON wf.module = m.id
    LEFT JOIN JSON_TABLE(wf.hierarchies, '$[*]' COLUMNS (hierarchy_id CHAR(36) PATH '$')) AS hj
      ON hj.hierarchy_id IS NOT NULL
    LEFT JOIN hierarchies h ON h.id = hj.hierarchy_id
    WHERE wf.program_id = :program_id
      AND wf.flow_type = :flow_type
      AND wf.workflow_id = :workflow_id
      AND wf.is_deleted = 0
      AND (:name IS NULL OR wf.name LIKE :name)
      AND (:is_enabled IS NULL OR wf.is_enabled = :is_enabled)
      ${hierarchyIdCondition};
    `;
};

export const programVendorAdvancedFilter = (
  hasQueryName: boolean,
  hasCountry: boolean,
  hasStatus: boolean,
  hasEmail: boolean,
  hasFullName: boolean,
  hasComplianceStatus: boolean,
  complianceStatusValue: any,
  hasAudited: boolean,
  hierarchyIdsArray: string[],
  laborCategoryIdsArray: string[],
  workLocationIdsArray: string[],
  jobTypeIdsArray: string[]
) => {
  const formatClause = (array: string[], field: string, paramPrefix: string, includeAllHierarchy = false) => {
    if (!array.length) return '';
    const filters = array
      .map((_, index) =>
        `JSON_CONTAINS(pv.${field}, JSON_QUOTE(:${paramPrefix}${index}), '$')`
      )
      .join(' OR ');
    return `AND (${filters} ${includeAllHierarchy ? 'OR pv.all_hierarchy = true' : ''})`;
  };

  const hierarchyIdsClause = formatClause(hierarchyIdsArray, 'hierarchies', 'hierarchy_ids', true);
  const laborCategoryIdsClause = formatClause(laborCategoryIdsArray, 'program_industry', 'labor_category_id');
  const workLocationIdsClause = formatClause(workLocationIdsArray, 'work_locations', 'work_location_id');
  const jobTypeIdsClause = formatClause(jobTypeIdsArray, 'job_type', 'job_type');

  const countryClause = hasCountry
    ? `AND JSON_UNQUOTE(JSON_EXTRACT(pv.addresses, '$[0].country')) = :country_id`
    : '';

  let complianceStatusClause = '';
  if (hasComplianceStatus) {
    if (complianceStatusValue === true) {
      complianceStatusClause = `AND vcc.compliance_status = 1`;
    } else if (complianceStatusValue === false) {
      complianceStatusClause = `AND vcc.compliance_status = 0`;
    } else {
      complianceStatusClause = `AND vcc.compliance_status IS NULL`;
    }
  }

  return `
    WITH vendor_doc_compliance_check AS (
      SELECT
        pv.id AS vendor_id,
        CASE
          WHEN COUNT(vr.id) = 0 THEN NULL
          WHEN COUNT(vr.id) > 0 AND SUM(CASE WHEN vr.status IN ('Compliant', 'Not-Applicable') THEN 1 ELSE 0 END) = COUNT(vr.id)
            THEN 1
          ELSE 0
        END AS compliance_status
      FROM program_vendors pv
      LEFT JOIN vendor_compliance_req_doc_mappings vr
        ON vr.vendor_id = pv.id
      GROUP BY pv.id
    )

    SELECT
      pv.id,
      pv.program_id,
      pv.tenant_id,
      pv.display_name,
      pv.vendor_name,
      pv.updated_on,
      pv.status,
      pv.contact,
      vcc.compliance_status,
      COUNT(*) OVER() AS total_count
    FROM program_vendors AS pv
    LEFT JOIN vendor_doc_compliance_check vcc
      ON vcc.vendor_id = pv.id
    WHERE
      pv.is_deleted = FALSE
      AND pv.program_id = :program_id
      ${hasQueryName ? 'AND pv.display_name LIKE :display_name' : ''}
      ${hasStatus ? 'AND pv.status = :status' : ''}
      ${hasEmail ? `AND JSON_UNQUOTE(JSON_EXTRACT(pv.contact, '$[0].email')) LIKE :contact_email` : ''}
      ${hasFullName
      ? `AND (
              LOWER(TRIM(CONCAT(
                IFNULL(JSON_UNQUOTE(JSON_EXTRACT(pv.contact, '$[0].first_name')), ''),
                ' ',
                IFNULL(JSON_UNQUOTE(JSON_EXTRACT(pv.contact, '$[0].last_name')), '')
              ))) LIKE LOWER(TRIM(:full_name))
              OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(pv.contact, '$[0].first_name'))) LIKE LOWER(TRIM(:full_name))
              OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(pv.contact, '$[0].last_name'))) LIKE LOWER(TRIM(:full_name))
            )`
      : ''
    }
      ${hierarchyIdsClause}
      ${laborCategoryIdsClause}
      ${workLocationIdsClause}
      ${jobTypeIdsClause}
      ${countryClause}
      ${complianceStatusClause}
      ${hasAudited ? `AND vcc.compliance_status = :is_audited` : ''}
    GROUP BY pv.id
    ORDER BY pv.updated_on DESC
    LIMIT :limit OFFSET :offset;
  `;
};

export const vendorFilterQueryBuilder = (
  hierarchyIdsArray: string[],
  laborCategoryIdsArray: string[],
  workLocationIdsArray: string[]
) => {
  const hierarchyIdsClause = hierarchyIdsArray.length
    ? `AND (${hierarchyIdsArray.map((_, index) =>
      "JSON_CONTAINS(program_vendors.hierarchies, JSON_QUOTE(:hierarchy_ids" + index + "), '$')"
    ).join(' OR ')})`
    : '';

  const laborCategoryIdsClause = laborCategoryIdsArray.length
    ? `AND (${laborCategoryIdsArray.map((_, index) =>
      "JSON_CONTAINS(program_vendors.program_industry, JSON_QUOTE(:labor_category_id" + index + "), '$')"
    ).join(' OR ')})`
    : '';

  const workLocationIdsClause = workLocationIdsArray.length
    ? `AND (${workLocationIdsArray.map((_, index) =>
      "JSON_CONTAINS(program_vendors.work_locations, JSON_QUOTE(:work_location_id" + index + "), '$')"
    ).join(' OR ')})`
    : '';

  return `
        SELECT
            program_vendors.*
        FROM
            program_vendors
        WHERE
            program_vendors.is_deleted = false
            AND program_vendors.program_id = :program_id
            AND status = 'Active'
            ${hierarchyIdsClause}
            ${laborCategoryIdsClause}
            ${workLocationIdsClause}
    `;
};

export const hierarchyDetailsQuery = `
SELECT
    h.id,
    h.name,
    h.parent_hierarchy_id,
    parent_h.name AS parent_name,
    h.rate_model AS rate
FROM
    hierarchies h
LEFT JOIN
    hierarchies parent_h ON h.parent_hierarchy_id = parent_h.id
WHERE
    h.id IN (:hierarchyIds)
    AND h.program_id = :programId
`;

export const parentHierarchyDetailsQuery = `
SELECT
    h.id,
    h.name,
    h.parent_hierarchy_id,
    parent_h.name AS parent_name,
    h.rate_model AS rate
FROM
    hierarchies h
LEFT JOIN
    hierarchies parent_h ON h.parent_hierarchy_id = parent_h.id
WHERE
    h.id IN (:parentHierarchyIds)
    AND h.program_id = :programId
`;

export const parentRateModelQuery = `
          SELECT *
          FROM hierarchies
          WHERE id IN (:parentIds)
          AND program_id = :programId
          LIMIT 1
        `;

export const getWorkLocationTimeZoneByUserId = `
        SELECT
          JSON_ARRAYAGG(
               JSON_OBJECT(
                  'work_location_id', work_locations.id,
                  'work_location_name', work_locations.name
              )
          ) AS work_location,
          JSON_ARRAYAGG(
               JSON_OBJECT(
                  'time_zone_name', user.time_zone_id
              )
          ) AS time_zone
        FROM
          user
        LEFT JOIN
          work_locations ON (
            JSON_CONTAINS(user.work_location_ids, JSON_QUOTE(work_locations.id))
          )
        WHERE
          user.user_id IN (:user_ids) AND user.program_id = :program_id
      `;

export const masterDataQuery = `
    SELECT
        h.id,
        h.parent_hierarchy_id,
        h.name,
        h.is_enabled,
        h.rate_model,
        h.created_on,
        h.updated_on,
        h.code,
        h.is_deleted,
        h.program_id,
        h.default_date_format,
        h.default_time_format,
        h.default_language,
        h.is_vendor_neutral_program,
        h.is_hide_candidate_img,
        h.manage_tax,
        h.manage_adjustment,
        h.custom_fields,
        h.default_timezone,
        h.default_currency,
        h.unit_of_measure,
        h.support_email,
        h.is_not_editable,
        JSON_OBJECT(
            'id', uom.id,
            'name', uom.label
        ) AS default_unit_of_measure,
        ph.name AS parent_hierarchy_name
    FROM
        hierarchies h
    LEFT JOIN
        hierarchies ph
        ON h.parent_hierarchy_id = ph.id
    LEFT JOIN
        picklistitems uom
        ON JSON_UNQUOTE(JSON_EXTRACT(h.unit_of_measure, '$[0].id')) = uom.id
    WHERE
        h.id = :hierarchy_id
    GROUP BY
        h.id, ph.name, uom.id, uom.label
    LIMIT 0, 1000;
`;

export const configAdvancedFilterV2 = (
  hierarchyIds: string[],
  updatedOnDates: string[] | undefined,
  isCountQuery: boolean = false
): string => {
  const hierarchyFilter = hierarchyIds.length
    ? `AND JSON_CONTAINS(ec.hierarchy_id, JSON_ARRAY(${hierarchyIds.map((_, i) => `:hierarchy${i}`).join(', ')}))`
    : '';

  const updatedOnFilter =
    updatedOnDates && updatedOnDates.length === 2
      ? `AND ec.updated_on BETWEEN :updated_on_start AND :updated_on_end`
      : '';

  const selectFields = isCountQuery
    ? 'COUNT(*) AS count'
    : `
      ec.id,
      ec.name,
      ec.is_enabled,
      ec.updated_on
    `;

  return `
    SELECT ${selectFields}
    FROM expense_config ec
    WHERE ec.is_deleted = false
      AND ec.program_id = :program_id
      ${hierarchyFilter}
      ${updatedOnFilter}
      ${'AND (:name IS NULL OR ec.name LIKE :name)'}
      ${'AND (:is_enabled IS NULL OR ec.is_enabled = :is_enabled)'}
    ${!isCountQuery ? 'ORDER BY ec.updated_on DESC LIMIT :limit OFFSET :offset' : ''}
  `;
};

export const getAllExpenseTypeByHierarchies = (
  hierarchyCondition: string,
  isEnabled: boolean | null
): string => {
  const isEnabledCondition = isEnabled !== null ? `AND ec.is_enabled = ${isEnabled}` : "";
  return `
    WITH MatchingExpenseConfigs AS (
      SELECT DISTINCT ec.id AS expense_config_id
      FROM expense_configuration ec
      JOIN expense_config_hierarchy_mapping echm ON ec.id = echm.expense_config_id
      WHERE ec.program_id = :program_id
        AND (${hierarchyCondition})
        ${isEnabledCondition}
    )
    SELECT et.*
    FROM expense_type et
    JOIN MatchingExpenseConfigs mec ON et.expense_config_id = mec.expense_config_id
    WHERE et.program_id = :program_id;
  `;
};

export const resonCode = `
SELECT
    reason_codes.id,
    reason_codes.program_id,
    reason_codes.event_id,
    reason_codes.module_id,
    reason_codes.reason,
    event.name AS event_name,
    module.name AS module_name
FROM reason_codes
INNER JOIN event ON reason_codes.event_id = event.id
INNER JOIN module ON reason_codes.module_id = module.id
WHERE reason_codes.program_id = :program_id
AND (:module_name IS NULL OR module.name LIKE :module_name)
AND (:event_name IS NULL OR event.name LIKE :event_name);
`;

export const rateTypeAdvanceFilter = (
  hasId: boolean,
  hasRateTypeCategory: boolean,
  hasName: boolean,
  hasAbbreviation: boolean,
  hasIsBaseRate: boolean,
  hasIsEnabled: boolean,
  hasUpdatedOn: boolean
) => {
  return `
      SELECT
          rate_type.*,
          COUNT(rate_type.id) OVER () AS total_count
      FROM
          rate_type
      WHERE
          rate_type.is_deleted = false
          AND rate_type.program_id = :program_id
          ${hasId ? 'AND rate_type.id = :id' : ''}
          ${hasRateTypeCategory ? 'AND rate_type.rate_type_category = :rate_type_category' : ''}
          ${hasName ? 'AND rate_type.name LIKE :name' : ''}
          ${hasAbbreviation ? 'AND rate_type.abbreviation LIKE :abbreviation' : ''}
          ${hasIsBaseRate ? 'AND rate_type.is_base_rate = :is_base_rate' : ''}
          ${hasIsEnabled ? 'AND rate_type.is_enabled = :is_enabled' : ''}
          ${hasUpdatedOn ? 'AND rate_type.updated_on BETWEEN :updated_on_start AND :updated_on_end' : ''}
      ORDER BY
          rate_type.created_on DESC
      LIMIT :limit
      OFFSET :offset;
  `;
};

export const timesheetConfigAdvancedFilter = (
  hasId: boolean,
  hasTitle: boolean,
  hierarchyIdsArray: string[],
  laborCategoryIdsArray: string[],
  hasTimesheetRuleGroup: boolean,
  hasTimesheetFormat: boolean,
  hasAllocationMethod: boolean,
  hasIsEnabled: boolean,
  mspHierarchyIds: string[] | any
) => {

  let hierarchyFilterCondition = '';

  if (hierarchyIdsArray.length > 0) {
    const hierarchyFilter = hierarchyIdsArray
      .map(id => `JSON_CONTAINS(timesheet_type_config.hierarchies, JSON_QUOTE('${id}'), '$')`)
      .join(' OR ');
    hierarchyFilterCondition = ` AND ((${hierarchyFilter}) OR timesheet_type_config.is_all_hierarchy_associated = true)`;
  }

  const laborCategoryClause = laborCategoryIdsArray.length
    ? `INNER JOIN JSON_TABLE(timesheet_type_config.labor_category, '$[*]' COLUMNS(labor_category_id VARCHAR(255) PATH '$')) AS laborTable
      ON laborTable.labor_category_id IN (${laborCategoryIdsArray.map((_, index) => `:labor_category_id${index}`).join(', ')})`
    : '';

  let mspHierarchyFilterCondition = '';

  if (mspHierarchyIds) {
    const hierarchyFilter = mspHierarchyIds
      .map((id: any) => `JSON_CONTAINS(timesheet_type_config.hierarchies, JSON_QUOTE('${id}'), '$')`)
      .join(' OR ');
    mspHierarchyFilterCondition = ` AND ((${hierarchyFilter}) OR timesheet_type_config.is_all_hierarchy_associated = true)`;
  }

  return `
      SELECT
        timesheet_type_config.*,
        COUNT(timesheet_type_config.id) OVER () AS total_count,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT('id', h.id, 'name', h.name)
          )
          FROM hierarchies h
          WHERE JSON_CONTAINS(timesheet_type_config.hierarchies, JSON_QUOTE(h.id))
        ) AS hierarchies,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT('id', lc.id, 'name', lc.name)
          )
          FROM labour_category lc
          WHERE JSON_CONTAINS(timesheet_type_config.labor_category, JSON_QUOTE(lc.id))
        ) AS labor_category,
        JSON_OBJECT('id', trg.id, 'name', trg.rule_group_name) AS timesheet_rule_group
      FROM
        timesheet_type_config
      LEFT JOIN timesheet_expense_rule_groups trg ON timesheet_type_config.timesheet_rule_group = trg.id
      ${laborCategoryClause}
      WHERE
        timesheet_type_config.is_deleted = false
        AND timesheet_type_config.program_id = :program_id
        ${hasId ? 'AND timesheet_type_config.id = :id' : ''}
        ${hasTitle ? 'AND timesheet_type_config.title LIKE :title' : ''}
        ${hasIsEnabled ? 'AND timesheet_type_config.is_enabled = :is_enabled' : ''}
        ${hasTimesheetRuleGroup ? 'AND timesheet_type_config.timesheet_rule_group = :timesheet_rule_group' : ''}
        ${hasTimesheetFormat ? 'AND timesheet_type_config.timesheet_format = :timesheet_format' : ''}
        ${hasAllocationMethod ? 'AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(timesheet_type_config.allocations, "$.allocation_method"))) = LOWER(:allocation_method)' : ''}
        ${hierarchyFilterCondition}
        ${mspHierarchyFilterCondition}
      GROUP BY timesheet_type_config.id
      ORDER BY timesheet_type_config.updated_on DESC
      LIMIT :limit
      OFFSET :offset;
  `;
};

export const labourCategoryAdvanceFilter = (
  hasId: boolean,
  name: boolean,
  updatedOnCondition: string,
  hasIsEnabled: boolean
) => {
  return `
    SELECT
      labour_category.*,
      COUNT(*) OVER () AS total_count
    FROM
      labour_category
    WHERE
      labour_category.program_id = :program_id
      AND labour_category.is_deleted = false
      ${hasId ? 'AND labour_category.id = :id' : ''}
      ${hasIsEnabled ? 'AND labour_category.is_enabled = :is_enabled' : ''}
      ${name ? 'AND labour_category.name LIKE :name' : ''}
      ${updatedOnCondition}
    ORDER BY labour_category.updated_on DESC
    LIMIT :limit
    OFFSET :offset;
  `;
};

export const getMasterData = `
SELECT
                    JSON_OBJECT(
                        'master_data', JSON_OBJECT(
                            'id', master_data_type.id,
                            'name', master_data_type.name
                        ),
                        'associated_master_data', COALESCE(
                            CASE
                                WHEN user_master_data.is_all_associated = 1 THEN (
                                    SELECT JSON_ARRAYAGG(
                                        JSON_OBJECT('id', md1.id, 'name', md1.name)
                                    )
                                    FROM master_data AS md1
                                    WHERE md1.foundational_data_type_id = master_data_type.id
                                    AND md1.program_id = :program_id
                                    AND md1.is_enabled = 1
                                )
                                ELSE (
                                    SELECT JSON_ARRAYAGG(
                                        JSON_OBJECT('id', md2.id, 'name', md2.name)
                                    )
                                    FROM master_data AS md2
                                    WHERE md2.foundational_data_type_id = master_data_type.id
                                    AND JSON_CONTAINS(user_master_data.associated_master_data, JSON_QUOTE(md2.id), '$')
                                )
                            END,
                            JSON_ARRAY()
                        ),
                        'default_master_data', COALESCE(
                            (
                                SELECT JSON_ARRAYAGG(
                                    JSON_OBJECT('id', md3.id, 'name', md3.name)
                                )
                                FROM master_data AS md3
                                WHERE md3.foundational_data_type_id = master_data_type.id
                                AND JSON_CONTAINS(user_master_data.default_master_data, JSON_QUOTE(md3.id), '$')
                            ),
                            JSON_ARRAY()
                        ),
                        'is_all_associated', user_master_data.is_all_associated = 1
                    ) AS foundational_data
                FROM user_master_data
                LEFT JOIN master_data_type ON user_master_data.master_data = master_data_type.id
                LEFT JOIN user ON user_master_data.user_id = user.user_id
                WHERE user_master_data.user_id = :user_id
                AND user.program_id = :program_id;
`;

export const getAllRateTypes = (
  hasName: boolean,
  hasId: boolean,
  hasIsEnabled: boolean,
  isShiftRateValue: boolean,
  isBaseRate: boolean,
  hasDifferentialOn: boolean,
  hasRateTypeCategory: boolean,
  hasShiftType: boolean,
  hasRateTypeCategoryLabels: boolean,
  hasAbbreviation: boolean,
  startDate?: number,
  endDate?: number,
  limit?: number,
  offset?: number,
  hasHierarchyShiftFilter?: boolean
) => `
  WITH rate_type AS (
    SELECT
      rt.id,
      rt.name,
      rt.program_id,
      rt.is_enabled,
      rt.is_shift_rate,
      rt.abbreviation,
      rt.is_base_rate,
      rt.rate,
      rt.updated_on,
      COUNT(*) OVER() AS total_records,
      CASE
        WHEN shift_types.id IS NULL THEN NULL
        ELSE JSON_OBJECT('id', shift_types.id, 'name', shift_types.shift_type_name)
      END AS shift_type,
      CASE
        WHEN picklistitems.id IS NULL THEN NULL
        ELSE JSON_OBJECT('id', picklistitems.id, 'label', picklistitems.label, 'value', picklistitems.value)
      END AS rate_type_category,
      JSON_EXTRACT(rt.rate, '$[0].differential_on') AS differential_on
    FROM rate_type rt
    LEFT JOIN shift_types ON rt.shift_type = shift_types.id
    LEFT JOIN picklistitems ON rt.rate_type_category = picklistitems.id
    ${hasHierarchyShiftFilter ? `
    LEFT JOIN shift_type_configurations stc ON rt.shift_type = stc.shift_type_id
    LEFT JOIN shift_configuration_hierarchies sch ON stc.shift_config_id = sch.shift_config_id
    ` : ''}
    WHERE rt.program_id = :program_id
      AND rt.is_deleted = false
      ${hasId ? "AND rt.id = :id" : ""}
      ${hasName ? "AND rt.name LIKE :name" : ""}
      ${hasIsEnabled ? "AND rt.is_enabled = :is_enabled" : ""}
      ${isShiftRateValue ? "AND rt.is_shift_rate = :is_shift_rate" : ""}
      ${isBaseRate ? "AND rt.is_base_rate = :is_base_rate" : ""}
      ${hasDifferentialOn ? "AND LOWER(JSON_EXTRACT(rt.rate, '$[0].differential_on')) LIKE LOWER(:differential_on)" : ""}
      ${hasRateTypeCategory ? "AND rt.rate_type_category = :rate_type_category" : ""}
      ${hasRateTypeCategoryLabels ? "AND picklistitems.value IN (:rate_type_category_labels)" : ""}
      ${hasAbbreviation ? "AND rt.abbreviation LIKE :abbreviation" : ""}
      ${hasShiftType ? "AND rt.shift_type = :shift_type" : ""}
      ${startDate !== undefined && endDate !== undefined ? "AND rt.updated_on BETWEEN :startDate AND :endDate" : ""}
      ${hasHierarchyShiftFilter
    ? `AND (
              picklistitems.value != 'shift'
              OR (picklistitems.value = 'shift' AND sch.hierarchy_id IN (:hierarchy_ids))
            )`
    : ''
  }
    GROUP BY
      rt.id, rt.name, rt.program_id, rt.is_enabled, rt.is_shift_rate,
      rt.abbreviation, rt.is_base_rate, rt.rate, rt.updated_on,
      picklistitems.picklist_id, picklistitems.label, picklistitems.value
  )
  SELECT * FROM rate_type
  ORDER BY updated_on DESC
  LIMIT :limit OFFSET :offset;
`;

export const rateTypeTotalCount = `
  SELECT count(*) AS total_records
  FROM rate_type
  WHERE program_id = :program_id AND is_deleted = false
`;

export const getAllExpenseTypeHierarchy = `
  SELECT
    ec.id AS config_id,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'id', h.id,
        'name', h.name
      )
    ) AS hierarchy
  FROM expense_configuration ec
  LEFT JOIN expense_config_hierarchy_mapping eth ON ec.id = eth.expense_config_id
  LEFT JOIN hierarchies h ON eth.hierarchy_id = h.id
  WHERE ec.program_id = :program_id
  GROUP BY ec.id;
`;

export const getAllRateConfigurationsQuery = async (replacements: any) => {
  let whereConditions = `rc.is_deleted = 0 AND rc.program_id = :program_id`;

  if (replacements.name) {
    whereConditions += ` AND rc.name LIKE CONCAT('%', :name, '%')`;
  }
  if (replacements.is_enabled !== undefined) {
    whereConditions += ` AND rc.is_enabled = :is_enabled`;
  }
  if (replacements.is_shift_rate !== undefined) {
    whereConditions += ` AND rc.is_shift_rate = :is_shift_rate`;
  }
  if (replacements.startDate && replacements.endDate) {
    whereConditions += ` AND rc.updated_on BETWEEN :startDate AND :endDate`;
  }
  if (replacements.job_template_id) {
    whereConditions += ` AND rc.id IN (
          SELECT DISTINCT rcjt.rate_configuration_id
          FROM rate_configuration_job_templates AS rcjt
          WHERE rcjt.job_template_id = :job_template_id
      )`;
  }
  if (replacements.hierarchy_id) {
    whereConditions += ` AND rc.id IN (
          SELECT DISTINCT rch.rate_configuration_id
          FROM rate_configuration_hierarchies AS rch
          WHERE rch.hierarchy_id = :hierarchy_id
      )`;
  }
  if (replacements.rate_type) {
    whereConditions += ` AND rc.id IN (
          SELECT DISTINCT rcbr.rate_configuration_id
          FROM rate_configuration_base_rate_types AS rcbr
          WHERE rcbr.rate_type_id = :rate_type
      )`;
  }

  const sqlQuery = `
    SELECT
      rc.id AS rate_configuration_id,
      rc.name,
      rc.is_enabled,
      rc.is_shift_rate,
      rc.created_on,
      rc.updated_on,
      h.hierarchies,
      jt.job_templates,
      rt.base_rates
    FROM
      rate_configurations AS rc
    LEFT JOIN (
      SELECT rch.rate_configuration_id, JSON_ARRAYAGG(JSON_OBJECT('id', h.id, 'name', h.name)) AS hierarchies
      FROM rate_configuration_hierarchies AS rch
      LEFT JOIN hierarchies AS h ON rch.hierarchy_id = h.id
      GROUP BY rch.rate_configuration_id
    ) AS h ON h.rate_configuration_id = rc.id
    LEFT JOIN (
      SELECT rcjt.rate_configuration_id, JSON_ARRAYAGG(JSON_OBJECT('id', jt.id, 'name', jt.template_name)) AS job_templates
      FROM rate_configuration_job_templates AS rcjt
      LEFT JOIN job_templates AS jt ON rcjt.job_template_id = jt.id
      GROUP BY rcjt.rate_configuration_id
    ) AS jt ON jt.rate_configuration_id = rc.id
    LEFT JOIN (
      SELECT rcbt.rate_configuration_id,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', rt.id,
            'name', rt.name,
            'rate_types', (
              SELECT JSON_ARRAYAGG(JSON_OBJECT('id', rt2.id, 'name', rt2.name))
              FROM rate_configuration_rate_types AS rcrt
              JOIN rate_type AS rt2 ON rcrt.rate_type_id = rt2.id
              WHERE rcrt.base_rate_type_id = rcbt.id
            )
          )
        ) AS base_rates
      FROM rate_configuration_base_rate_types AS rcbt
      LEFT JOIN rate_type AS rt ON rcbt.rate_type_id = rt.id
      GROUP BY rcbt.rate_configuration_id
    ) AS rt ON rt.rate_configuration_id = rc.id
    WHERE ${whereConditions}
    ORDER BY rc.updated_on DESC
    LIMIT :limit OFFSET :offset;
  `;

  return await sequelize.query(sqlQuery, {
    replacements,
    type: QueryTypes.SELECT,
  });
};



export const workflowAdvanceFilter = (
  hasId: boolean,
  eventIdsArray: string[],
  moduleArray: string[],
  hierarchyIdsArray: string[]
) => {
  const hierarchyIdsClause = hierarchyIdsArray.length
    ? `INNER JOIN JSON_TABLE(workflow.hierarchy_ids, '$[*]' COLUMNS(hierarchy_id VARCHAR(255) PATH '$')) AS hierarchyTable
       ON hierarchyTable.hierarchy_id IN (${hierarchyIdsArray.map((_, index) => `:hierarchy_id${index}`).join(', ')})`
    : '';
  const eventIdClause = eventIdsArray.length
    ? `AND workflow.event_id IN (${eventIdsArray.map((_, index) => `:event_id${index}`).join(', ')})`
    : '';
  const moduleClause = moduleArray.length
    ? `AND workflow.module IN (${moduleArray.map((_, index) => `:module${index}`).join(', ')})`
    : '';
  return `
      SELECT
        workflow.*,
        COUNT(workflow.id) OVER () AS total_count
      FROM
        workflow
      ${hierarchyIdsClause}
      WHERE
        workflow.is_deleted = false
        AND workflow.program_id = :program_id
        ${hasId ? 'AND workflow.id = :id' : ''}
        ${eventIdClause}
        ${moduleClause}
      ORDER BY
        workflow.created_on DESC
      LIMIT :limit
      OFFSET :offset;
  `;
};

export const sameRateConfiguration = `
  SELECT rc.id
  FROM rate_configurations rc
  JOIN rate_configuration_hierarchies rh ON rc.id = rh.rate_configuration_id
  JOIN rate_configuration_job_templates rjt ON rc.id = rjt.rate_configuration_id
  WHERE rc.program_id = :program_id
    AND rh.hierarchy_id IN (:hierarchies)
    AND rjt.job_template_id IN (:job_templates)
    AND (
       :job_type IS NULL OR JSON_CONTAINS(rc.job_type, JSON_QUOTE(:job_type))
    )

    
`;


export const sameShiftConfiguration = `
    SELECT sc.id
    FROM shift_configurations sc
    JOIN shift_configuration_hierarchies sch ON sc.id = sch.shift_config_id
    WHERE sc.program_id = :program_id
    AND sch.hierarchy_id IN (:hierarchies)
    `;

export const rateConfigHierarchiesAndJobTemplates = `
    WITH RateConfigurations AS (
      SELECT
        id AS rate_configuration_id
      FROM
        rate_configurations
      WHERE
        program_id = :program_id
    ),
    HierarchiesData AS (
      SELECT
        rh.hierarchy_id
      FROM
        rate_configuration_hierarchies rh
      JOIN
        RateConfigurations rc ON rh.rate_configuration_id = rc.rate_configuration_id
    ),
    JobTemplatesData AS (
      SELECT
        rjt.job_template_id
      FROM
        rate_configuration_job_templates rjt
      JOIN
        RateConfigurations rc ON rjt.rate_configuration_id = rc.rate_configuration_id
    ),
    RateTypesData AS (
      SELECT DISTINCT
        rbrt.rate_type_id,
        rt.name AS rate_name
      FROM
        rate_configuration_base_rate_types rbrt
      JOIN
        rate_type rt ON rbrt.rate_type_id = rt.id
      JOIN
        RateConfigurations rc ON rbrt.rate_configuration_id = rc.rate_configuration_id
    )
    SELECT DISTINCT
      h.id AS hierarchy_id,
      h.name AS hierarchy_name,
      jt.id AS job_template_id,
      jt.template_name AS job_template_name,
      rtd.rate_type_id AS rate_id,
      rtd.rate_name AS rate_name
    FROM
      hierarchies h
    LEFT JOIN
      HierarchiesData hd ON h.id = hd.hierarchy_id
    LEFT JOIN
      job_templates jt ON jt.id IN (SELECT job_template_id FROM JobTemplatesData)
    LEFT JOIN
      RateTypesData rtd ON rtd.rate_type_id IS NOT NULL
    WHERE
      hd.hierarchy_id IS NOT NULL;
`;

export const rateTypeShiftAndRate = `
    WITH RateTypeData AS (
      SELECT
        rt.shift_type,
        rt.rate_type_category
      FROM
        rate_type rt
      WHERE
        rt.program_id = :program_id
    ),
    ShiftTypeDetails AS (
      SELECT
        st.id AS shift_type_id,
        st.shift_type_name AS shift_type_name
      FROM
        shift_types st
      JOIN
        RateTypeData rtd ON rtd.shift_type = st.id
    ),
    RateTypeCategoryDetails AS (
      SELECT
        pi.id AS rate_type_category_id,
        pi.value AS rate_type_category_value
      FROM
        picklistitems pi
      JOIN
        RateTypeData rtd ON rtd.rate_type_category = pi.id
    )
    SELECT
      st.shift_type_id AS shift_id,
      st.shift_type_name AS shift_name,
      rt.rate_type_category_id AS rate_type_id,
      rt.rate_type_category_value AS rate_type_value
    FROM
      ShiftTypeDetails st
    LEFT JOIN
      RateTypeCategoryDetails rt ON st.shift_type_id = rt.rate_type_category_id
    UNION
    SELECT
      st.shift_type_id AS shift_id,
      st.shift_type_name AS shift_name,
      rt.rate_type_category_id AS rate_type_id,
      rt.rate_type_category_value AS rate_type_value
    FROM
      ShiftTypeDetails st
    RIGHT JOIN
      RateTypeCategoryDetails rt ON st.shift_type_id = rt.rate_type_category_id;
  `;

export const getExpenseTypeAndRateType = `
  SELECT
    timesheet_expense_rules.id,
    CASE
      WHEN COUNT(expense_type.id) = 0 THEN NULL
      ELSE JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', expense_type.id,
          'name', expense_type.name
        )
      )
    END AS expense_line_item,
    CASE
      WHEN COUNT(rate_type.id) = 0 THEN NULL
      ELSE JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', rate_type.id,
          'name', rate_type.name,
          'abbreviation', rate_type.abbreviation
        )
      )
    END AS expense_rate_type
  FROM
    timesheet_expense_rules
  LEFT JOIN
    expense_type
    ON JSON_CONTAINS(
      timesheet_expense_rules.expense_line_item,
      JSON_QUOTE(expense_type.id),
      '$'
    )
  LEFT JOIN
    rate_type
    ON JSON_CONTAINS(
      timesheet_expense_rules.apply_rate_type,
      JSON_QUOTE(rate_type.id),
      '$'
    )
  WHERE
    timesheet_expense_rules.program_id = :program_id
    AND timesheet_expense_rules.is_deleted = false
  GROUP BY
    timesheet_expense_rules.id;
  `;
export const getQuery = () => `
    SELECT
        (SELECT id FROM currencies WHERE name = :currencyName LIMIT 1) AS currency,
        (SELECT id FROM language WHERE name = :languageName LIMIT 1) AS language,
        (SELECT id FROM time_zones WHERE name = :timeZoneName LIMIT 1) AS timeZone,
        (SELECT id FROM picklistitems WHERE label = :rateModelLabel LIMIT 1) AS rateModel,
        (SELECT id FROM picklistitems WHERE label = :unitOfMeasureLabel LIMIT 1) AS unitOfMeasure
`;

export const hierarchie = `
    SELECT
        h.id,
        h.parent_hierarchy_id,
        h.name,
        h.is_enabled,
        h.rate_model,
        h.created_on,
        h.updated_on,
        h.code,
        h.is_deleted,
        h.program_id,
        h.default_date_format,
        h.default_time_format,
        h.default_language,
        h.is_vendor_neutral_program,
        h.is_hide_candidate_img,
        h.manage_tax,
        h.manage_adjustment,
        h.default_timezone,
        h.default_currency,
        h.unit_of_measure,
        h.support_email,
        h.is_not_editable,
        h.address,
        CASE
          WHEN UPPER(h.managed_by) = 'SELF-MANAGED' THEN JSON_OBJECT(
            'id', 'self-managed',
            'name', 'self-managed',
            'display_name', 'self-managed'
          )
          ELSE JSON_OBJECT(
            'id', t.id,
            'name', t.name,
            'display_name', t.display_name
          )
        END AS managed_by,
        JSON_OBJECT(
            'id', uom.id,
            'name', uom.label
        ) AS default_unit_of_measure,
           COALESCE((
                 SELECT JSON_ARRAYAGG(JSON_OBJECT(
                   'id', hierarchies_custom_field.id,
                    'custom_field_id', hierarchies_custom_field.customfield_id,
                    'value', hierarchies_custom_field.value,
                    'custom_field_id',custom_fields.id,
                  'manager_name',
                      CASE
                        WHEN user.user_id IS NOT NULL
                      THEN CONCAT(user.first_name, ' ', user.last_name)
                      ELSE NULL
                      END,
                   'name', custom_fields.name,
                   'field_type', custom_fields.field_type
               ))
            FROM hierarchies_custom_field
              LEFT JOIN custom_fields ON hierarchies_custom_field.customfield_id = custom_fields.id
              LEFT JOIN user ON TRIM(BOTH '"' FROM hierarchies_custom_field.value) = user.user_id
              AND user.program_id = hierarchies_custom_field.program_id
              WHERE hierarchies_custom_field.hierarchy_id = h.id
              AND custom_fields.is_deleted = false
              AND custom_fields.is_enabled = true
    ), JSON_ARRAY()) AS custom_fields
    FROM
        hierarchies h
    LEFT JOIN
        picklistitems uom
        ON JSON_UNQUOTE(JSON_EXTRACT(h.unit_of_measure, '$[0].id')) = uom.id
    LEFT JOIN tenant as t on h.managed_by = t.id
    WHERE
        h.id = :hierarchy_id
    LIMIT 0, 1000;
`;



export const getWorklocation = `
SELECT
    wl.program_id,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'id', c.id,
            'name', c.name
        )
    ) AS countries
FROM (
    SELECT DISTINCT
        work_locations.program_id,
        work_locations.country_id
    FROM work_locations
    WHERE work_locations.program_id = :program_id
) AS wl
LEFT JOIN countries c ON wl.country_id = c.id
GROUP BY wl.program_id;`


export const userQuery = (
  first_name?: string,
  email?: string,
  tenant_id?: string,
  role_id?: string,
  is_activated?: string,
  user_type?: string,
  status?: string,
  user_id?: string,
  hierarchy_id?: string[],
  mspHierarchyIds?: string[]
) => `
WITH user_data AS (
  SELECT u.id,
         u.user_id,
         u.username,
         u.last_name,
         u.middle_name,
         u.first_name,
         u.name_suffix,
         u.program_id,
         u.email,
         u.created_on,
         u.updated_on as updated_on,
         u.avatar,
         u.language_id,
         u.is_enabled,
         u.is_deleted,
         u.is_active,
         u.user_type,
         u.is_associated,
         u.supervisor,
         u.date_format,
         MAX(CASE
             WHEN JSON_LENGTH(u.contacts) > 0 THEN u.contacts
             ELSE JSON_ARRAY(
               JSON_OBJECT(
                 'label', '',
                 'number', '',
                 'isd_code', '',
                 'max_phone_length', 0,
                 'min_phone_length', 0,
                 'phoneFormatCountry', ''
               )
             )
         END) AS contacts,
         MAX(CASE
             WHEN JSON_LENGTH(u.applications) > 0 THEN u.applications
             ELSE JSON_ARRAY()
         END) AS applications,
         u.name_prefix,
         u.role_id,
         u.title,
         u.sso_id,
         MAX(CASE WHEN JSON_LENGTH(u.addresses) > 0 THEN u.addresses ELSE JSON_ARRAY() END) AS addresses,
         u.time_zone_id,
         MAX(CASE WHEN u.is_allow_unlimited_authority = 1 THEN true ELSE false END) AS is_allow_unlimited_authority,
         MAX(CASE WHEN u.is_all_work_location_associate = 1 THEN true ELSE false END) AS is_all_work_location_associate,
         MAX(CASE WHEN u.is_all_hierarchy_associate = 1 THEN true ELSE false END) AS is_all_hierarchy_associate,
         MAX(um.id) as user_mapping_id,  -- Aggregate um.id
         MAX(u.status) AS status,
         JSON_OBJECT(
             'id', u.user_id,
             'first_name', u.first_name,
             'last_name', u.last_name
         ) AS supervisor_id,
         (
             SELECT JSON_ARRAYAGG(
                JSON_OBJECT('id', h.id, 'name', h.name)
             )
             FROM hierarchies h
             WHERE JSON_CONTAINS(u.associate_hierarchy_ids, JSON_QUOTE(h.id))
         ) AS associate_hierarchy_ids,
         (
             SELECT JSON_ARRAYAGG(
                JSON_OBJECT('id', wl.id, 'name', wl.name)
             )
             FROM work_locations wl
             WHERE JSON_CONTAINS(u.work_location_ids, JSON_QUOTE(wl.id))
         ) AS work_location_ids,
         COALESCE((
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', custom_fields.id,
                    'name', custom_fields.name,
                    'value', JSON_UNQUOTE(JSON_EXTRACT(user_custom_fields.value, '$'))
                )
            )
            FROM user_custom_fields
            LEFT JOIN custom_fields ON user_custom_fields.customfield_id = custom_fields.id
            WHERE user_custom_fields.user_id = u.id
        ), JSON_ARRAY()) AS custom_fields,
         JSON_OBJECT('id', dh.id, 'name', dh.name, 'default_currency',dh.default_currency) AS default_hierarchy_id,
         JSON_OBJECT('id', dwl.id, 'name', dwl.name) AS default_work_location_id,
         JSON_OBJECT('id', c.id, 'name', c.name) AS countries,
         JSON_OBJECT('id', t.id, 'name', t.name) AS tenant_id
  FROM user u
  LEFT JOIN hierarchies dh ON u.default_hierarchy_id = dh.id
  LEFT JOIN work_locations dwl ON u.default_work_location_id = dwl.id
  LEFT JOIN countries c ON u.country_id = c.id
  LEFT JOIN tenant t ON u.tenant_id = t.id
  LEFT JOIN user_mappings um ON u.user_id = um.user_id
  WHERE u.is_deleted = false AND u.program_id = :program_id
    ${user_id ? 'AND u.user_id = :user_id' : ''}
    ${user_type ? `AND u.user_type IN (${user_type.split(',').map(t => `'${t.trim()}'`).join(',')})` : ''}
    ${status ? 'AND u.status = :status' : ''}
    ${typeof is_activated === 'string' ? 'AND u.is_active = :is_activated' : ''}
    ${role_id ? 'AND u.role_id = :role_id' : ''}
    ${tenant_id ? 'AND u.tenant_id = :tenant_id' : ''}
    ${email ? 'AND u.email = :email' : ''}
    ${first_name ? 'AND u.first_name = :first_name' : ''}
    ${hierarchy_id && hierarchy_id.length > 0
    ? `AND (
            u.is_all_hierarchy_associate = true
            OR (
              u.is_all_hierarchy_associate = false
              AND (${hierarchy_id
      .map((_, index) => `JSON_CONTAINS(u.associate_hierarchy_ids, JSON_QUOTE(:hierarchy_id_${index}))`)
      .join(' OR ')})
            )
          )`
    : ''}
     ${mspHierarchyIds && mspHierarchyIds.length > 0
    ? `AND (
            u.is_all_hierarchy_associate = true
            OR (
              u.is_all_hierarchy_associate = false
              AND (${mspHierarchyIds
      .map((_, index) => `JSON_CONTAINS(u.associate_hierarchy_ids, JSON_QUOTE(:msp_hierarchy_id_${index}))`)
      .join(' OR ')})
            )
          )`
    : ''}
  GROUP BY u.id, dh.id, dwl.id, c.id, t.id
)
SELECT *, (SELECT COUNT(*) FROM user_data) AS total_count
FROM user_data
ORDER BY updated_on DESC
LIMIT :limit OFFSET :offset;

`;

export const userHierarchiesQuery = (user_id?: string, hierarchy_id?: string[]) => `
WITH user_data AS (
  SELECT u.id,
         u.username,
         u.first_name,
         u.last_name,
         u.email,
         u.program_id,
         u.is_active,
         u.created_on,
         u.updated_on as updated_on,
         (
             SELECT JSON_ARRAYAGG(
                JSON_OBJECT('id', h.id, 'name', h.name)
             )
             FROM hierarchies h
             WHERE JSON_CONTAINS(u.associate_hierarchy_ids, JSON_QUOTE(h.id))
         ) AS associate_hierarchy_ids
  FROM user u
  WHERE u.is_deleted = false AND u.program_id = :program_id
    ${user_id ? 'AND u.user_id = :user_id' : ''}
    ${hierarchy_id && hierarchy_id.length > 0
    ? `AND (${hierarchy_id
      .map((_, index) => `JSON_CONTAINS(u.associate_hierarchy_ids, JSON_QUOTE(:hierarchy_id_${index}))`)
      .join(' OR ')})`
    : ''
  }
  GROUP BY u.id
)
SELECT *
FROM user_data
ORDER BY updated_on DESC;
`;

export const getPendingUserQuery = `
  SELECT
    invitation.*,
    invitation.user_email AS email,
    invitation.is_allow_unlimited_autherity AS is_allow_unlimited_authority,
    invitation.updated_on,
    invitation.created_on,
    user_group_mapping.user_type AS user_type,
    user_group_mapping.last_name,
    user_group_mapping.first_name,
    user_group_mapping.middle_name,
    CASE
    WHEN invitation.status = 'SENT' THEN 'Pending'
    ELSE invitation.status
    END AS status,
    JSON_OBJECT(
      'id', tenant.id,
      'name', tenant.name,
      'display_name',tenant.display_name
    ) AS tenant_id,
  JSON_OBJECT('id', ur.id, 'role_name', ur.role_name, 'display_name', ur.display_name) AS user_role,
    JSON_OBJECT(
      'id', countries.id,
      'name', countries.name,
      'isd_code', countries.isd_code,
      'iso_code_2', countries.iso_code_2,
      'iso_code_3', countries.iso_code_3
    ) AS countries,
    JSON_OBJECT(
      'id', hierarchies.id,
      'name', hierarchies.name
    ) AS default_hierarchy_id,
    JSON_OBJECT(
      'id', work_locations.id,
      'name', work_locations.name
    ) AS default_work_location_id,
    JSON_OBJECT(
      'id', user.user_id,
      'first_name', user.first_name,
      'last_name',user.last_name
    ) AS supervisor_id,
    IF(
      invitation.avatar IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(invitation.avatar, '$.url')) IS NULL,
      JSON_OBJECT(),
      JSON_OBJECT(
        'url', JSON_UNQUOTE(JSON_EXTRACT(invitation.avatar, '$.url')),
        'text', JSON_UNQUOTE(JSON_EXTRACT(invitation.avatar, '$.color.text')),
        'color', JSON_UNQUOTE(JSON_EXTRACT(invitation.avatar, '$.color.color'))
      )
    ) AS avatar,
   COALESCE((
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT('id', h.id, 'name', h.name)
  )
  FROM hierarchies h
  WHERE
       invitation.associate_hierarchy_ids IS NOT NULL
      AND JSON_CONTAINS(invitation.associate_hierarchy_ids, JSON_QUOTE(h.id))
      AND h.is_enabled=true
), JSON_ARRAY()) AS associate_hierarchy_ids,
   COALESCE((
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT('id', wl.id, 'name', wl.name)
  )
  FROM work_locations wl
  WHERE (
    invitation.work_location_ids IS NOT NULL
    AND JSON_CONTAINS(invitation.work_location_ids, JSON_QUOTE(wl.id))
    AND wl.is_enabled=true
  )
), JSON_ARRAY()) AS work_location_ids,

   COALESCE((
    SELECT JSON_ARRAYAGG(JSON_OBJECT('id', l.id, 'name', l.name))
    FROM labour_category l
    WHERE JSON_CONTAINS(invitation.associate_labour_category, JSON_QUOTE(l.id), '$')
), JSON_ARRAY()) AS associate_labour_category,
COALESCE((
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'master_data', JSON_OBJECT(
        'id', JSON_UNQUOTE(JSON_EXTRACT(fd.value, '$.master_data')),
        'name', mdt.name
      ),
      'is_all_associated', JSON_EXTRACT(fd.value, '$.is_all_associated'),
      'default_master_data', COALESCE((
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', dmdt.id,
            'name', dmdt.name
          )
        )
        FROM master_data AS dmdt
        WHERE JSON_CONTAINS(
          CASE
            WHEN JSON_TYPE(JSON_EXTRACT(fd.value, '$.default_master_data')) != 'ARRAY'
            THEN JSON_ARRAY(JSON_EXTRACT(fd.value, '$.default_master_data'))
            ELSE JSON_EXTRACT(fd.value, '$.default_master_data')
          END,
          JSON_QUOTE(dmdt.id)
        )
      ), JSON_ARRAY()),
      'associated_master_data', COALESCE((
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', m.id,
            'name', m.name
          )
        )
        FROM master_data AS m
        WHERE (
          (
            JSON_EXTRACT(fd.value, '$.is_all_associated') = true
            AND m.program_id = invitation.program_id
            AND m.foundational_data_type_id = JSON_UNQUOTE(JSON_EXTRACT(fd.value, '$.master_data'))
          )
          OR (
            JSON_EXTRACT(fd.value, '$.is_all_associated') = false
            AND JSON_CONTAINS(
              CASE
                WHEN JSON_TYPE(JSON_EXTRACT(fd.value, '$.associated_master_data')) != 'ARRAY'
                THEN JSON_ARRAY(JSON_EXTRACT(fd.value, '$.associated_master_data'))
                ELSE JSON_EXTRACT(fd.value, '$.associated_master_data')
              END,
              JSON_QUOTE(m.id)
            )
          )
        )
      ), JSON_ARRAY())
    )
  )
  FROM JSON_TABLE(
  CAST(invitation.foundational_data AS JSON),
  '$[*]' COLUMNS (
    value JSON PATH '$'
  )
) AS fd
  JOIN master_data_type AS mdt
    ON JSON_UNQUOTE(JSON_EXTRACT(fd.value, '$.master_data')) = mdt.id
), JSON_ARRAY()) AS foundational_data,
COALESCE((
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'custom_field_id', cf.id,
      'name', cf.name,
      'value', jt.value,
      'label', cf.label,
      'manager_name',
        CASE
          WHEN u.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
          ELSE NULL
        END,
      'field_type', cf.field_type
    )
  )
  FROM (
    SELECT
      JSON_EXTRACT(jt_item, '$.id') AS id,
      JSON_EXTRACT(jt_item, '$.value') AS value
    FROM JSON_TABLE(
      CAST(invitation.custom_fields AS JSON),
      '$[*]' COLUMNS (
        jt_item JSON PATH '$'
      )
    ) jt
  ) jt
  JOIN custom_fields cf ON cf.id = jt.id
  LEFT JOIN user u
    ON TRIM(BOTH '"' FROM jt.value) COLLATE utf8mb4_unicode_ci = u.user_id COLLATE utf8mb4_unicode_ci
   AND u.program_id = invitation.program_id
  WHERE cf.program_id = invitation.program_id
    AND cf.is_deleted = false
    AND cf.is_enabled = true
), JSON_ARRAY()) AS custom_fields




FROM ${auth_db}.invitation
JOIN ${auth_db}.user_group_mapping ON user_group_mapping.id = invitation.user_mapping_id
LEFT JOIN tenant ON invitation.tenant_id = tenant.id
LEFT JOIN countries ON invitation.country_id = countries.id
LEFT JOIN hierarchies ON invitation.default_hierarchy_id = hierarchies.id AND hierarchies.is_enabled=true
LEFT JOIN work_locations ON invitation.default_work_location_id = work_locations.id AND work_locations.is_enabled=true
LEFT JOIN ${auth_db}.user ON invitation.supervisor = user.user_id
LEFT JOIN ${auth_db}.roles ur ON invitation.role_id = ur.id

WHERE invitation.program_id = :program_id
AND invitation.is_deleted=false
AND (:user_mapping_id IS NULL OR invitation.user_mapping_id = :user_mapping_id)
GROUP BY invitation.id
ORDER BY invitation.updated_on DESC
LIMIT 0, 1000;
`;


export const vendorMarkup = `
  SELECT
        vmc.markups,
        vmc.rate_model
    FROM
        vendor_markup_config vmc
    WHERE
        vmc.program_id = :program_id
        AND (vmc.program_vendor_id = :vendor_id OR vmc.program_vendor_id IS NULL)
        AND (vmc.rate_model = :rateModel OR vmc.rate_model IS NULL)
        AND (vmc.hierarchy IN (:hierarchy_id) OR vmc.hierarchy IS NULL)
        AND (vmc.program_industry = :program_industry OR vmc.program_industry IS NULL)
    LIMIT 1
`;

export const fetchTimesheetExpenseRuleGroups = async (
  programId: string,
  ruleCategory?: string,
  ruleGroupName?: string,
  ruleType?: string,
  isEnabled?: boolean | string,
  limit: number = 10,
  offset: number = 0,
  order: string = 'created_on DESC'
) => {
  const searchConditions: string[] = ['tsg.is_deleted = FALSE'];

  if (programId) {
    searchConditions.push(`tsg.program_id = "${programId}"`);
  }

  if (ruleCategory) {
    searchConditions.push(`tsg.rule_category = "${ruleCategory}"`);
  }

  if (ruleGroupName) {
    searchConditions.push(`tsg.rule_group_name LIKE "%${ruleGroupName}%"`);
  }

  if (isEnabled !== undefined) {
    searchConditions.push(`tsg.is_enabled = ${isEnabled === 'true'}`);
  }

  if (ruleType) {
    const ruleTypeNames = ruleType.split(',').map((type) => type.trim());
    const ruleTypeCondition = ruleTypeNames
      .map((type) => `FIND_IN_SET("${type}", (
          SELECT GROUP_CONCAT(DISTINCT ter.rule_type SEPARATOR ', ')
          FROM timesheet_expense_rules ter
          JOIN timesheet_expense_rule_mapping erm ON erm.expense_rule_id = ter.id
          WHERE erm.expense_rule_group_id = tsg.id
      ))`)
      .join(' OR ');
    searchConditions.push(`(${ruleTypeCondition})`);
  }

  const whereClause = searchConditions.length ? `WHERE ${searchConditions.join(' AND ')}` : '';

  const query = `
  SELECT
      tsg.*,
      COALESCE(
          (
              SELECT JSON_ARRAYAGG(
                  JSON_OBJECT(
                      'id', ter.id,
                      'rule_name', ter.rule_name
                  )
              )
              FROM timesheet_expense_rules ter
              JOIN timesheet_expense_rule_mapping erm ON erm.expense_rule_id = ter.id
              WHERE erm.expense_rule_group_id = tsg.id
          ),
          JSON_ARRAY()
      ) AS timesheet_expense_rules,
      COALESCE(
          (
              SELECT GROUP_CONCAT(DISTINCT ter.rule_type SEPARATOR ', ')
              FROM timesheet_expense_rules ter
              JOIN timesheet_expense_rule_mapping erm ON erm.expense_rule_id = ter.id
              WHERE erm.expense_rule_group_id = tsg.id
          ),
          ''
      ) AS rule_type,
      COUNT(*) OVER() AS total_count
  FROM timesheet_expense_rule_groups tsg
  ${whereClause}
  ORDER BY ${order}
  LIMIT ${limit}
  OFFSET ${offset};
  `;

  const [ruleGroups] = await sequelize.query(query) as any[];
  const totalRecords = ruleGroups.length > 0 ? ruleGroups[0].total_count : 0;

  return { ruleGroups, totalRecords };
};

export const rateCardMinRateMaxRate = `
  WITH rate_card_matches AS (
    SELECT
      rc.id AS rate_card_id
    FROM
      rate_card rc
    WHERE
      rc.labor_category_id = :labor_category_id
      AND rc.program_id = :program_id
      AND rc.is_deleted = false
      AND rc.is_enabled = true
  ),
  primary_matches AS (
    SELECT
      d.id,
      d.rate_card_id,
      d.rate_type_id,
      d.min_rate,
      d.max_rate,
      d.hierarchy_id,
      d.job_template_id,
      d.unit_of_measure,
      d.currency,
      d.job_type
    FROM
      rate_card_decision_table d
    JOIN
      rate_card_matches rcm ON d.rate_card_id = rcm.rate_card_id
    WHERE
      (d.hierarchy_id IN (:hierarchyIds) OR d.hierarchy_id IS NULL)
      AND (d.job_template_id IN (:jobTemplateIds) OR d.job_template_id IS NULL)
      AND (d.unit_of_measure = :unit_of_measure OR d.unit_of_measure IS NULL)
      AND (d.currency = :currency_id OR d.currency IS NULL)
      AND (:job_type IS NULL OR d.job_type = :job_type OR d.job_type IS NULL)
  ),
  fallback_matches AS (
    SELECT
      d.id,
      d.rate_card_id,
      d.rate_type_id,
      d.min_rate,
      d.max_rate,
      NULL AS hierarchy_id,
      d.job_template_id,
      d.unit_of_measure,
      d.currency,
      d.job_type
    FROM
      rate_card_decision_table d
    WHERE
      d.hierarchy_id IS NULL
      AND d.job_template_id IN (:jobTemplateIds)
      AND d.unit_of_measure = :unit_of_measure
      AND d.currency = :currency_id
      AND (:job_type IS NULL OR d.job_type = :job_type)
  )
  SELECT *
  FROM primary_matches
  UNION ALL
  SELECT *
  FROM fallback_matches
  WHERE NOT EXISTS (SELECT 1 FROM primary_matches);
`;

export const allNullRate = `
WITH rate_card_matches AS (
  SELECT
      rc.id AS rate_card_id
  FROM
      rate_card rc
  WHERE
      rc.labor_category_id = :labor_category_id
      AND rc.program_id = :program_id
      AND rc.is_deleted = false
      AND rc.is_enabled = true
)
SELECT
  rcdt.min_rate,
  rcdt.max_rate
FROM
  rate_card_decision_table rcdt
INNER JOIN
  rate_card_matches rcm
ON
  rcdt.rate_card_id = rcm.rate_card_id
WHERE
  rcdt.hierarchy_id IS NULL
  AND rcdt.job_template_id IS NULL
  AND rcdt.unit_of_measure IS NULL
  AND rcdt.rate_type_id IS NULL
  AND rcdt.currency IS NULL
  AND rcdt.job_type IS NULL`;

export const getInvoiceConfigByHierarchyId = `
    SELECT *
    FROM invoice_config
    WHERE program_id = :program_id
      AND JSON_CONTAINS(hierarchy_ids, :hierarchy_ids);
`;

export const getActiveUsers = `
SELECT
    user.id,
    user.user_id,
    user.first_name,
    user.last_name,
    user.associate_hierarchy_ids,
    user.program_id,
    user.is_enabled,
    user.user_type,
    user.status
FROM
    user
WHERE
    user.program_id = :program_id
    AND LOWER(user.status) = 'active'
    AND (
    user.user_type = 'client'
    OR (:is_msp = true AND user.user_type = 'msp')
    )
    AND (
        ( -- Super user case
            :is_super_user = true
            AND (
                :allowed_hierarchy_ids IS NULL
                OR JSON_OVERLAPS(user.associate_hierarchy_ids, CAST(:allowed_hierarchy_ids AS JSON))
                OR user.is_all_hierarchy_associate = true
            )
        )
        OR
        ( -- Non-super user case
            :is_super_user = false
            AND (
                -- Case 1: Current user has all hierarchy access
                (
                    :is_all_hierarchy_associate_param = true
                    AND (
                        -- If filtering by specific hierarchies, only show users who have those hierarchies
                        (:allowed_hierarchy_ids IS NOT NULL AND JSON_OVERLAPS(user.associate_hierarchy_ids, CAST(:allowed_hierarchy_ids AS JSON)))
                        OR
                        -- If not filtering, show all users
                        (:allowed_hierarchy_ids IS NULL)
                    )
                )
                OR
                -- Case 2: Current user has limited hierarchy access
                (
                    :is_all_hierarchy_associate_param = false
                    AND (
                        -- Show users who have all hierarchy access
                        user.is_all_hierarchy_associate = true
                        OR
                        -- OR show users whose hierarchies match the current user's hierarchies
                        (
                            JSON_OVERLAPS(user.associate_hierarchy_ids, CAST(:current_user_hierarchy_ids AS JSON))
                            -- And if filtering by hierarchy, ensure those hierarchies match
                            AND (:allowed_hierarchy_ids IS NULL OR JSON_OVERLAPS(user.associate_hierarchy_ids, CAST(:allowed_hierarchy_ids AS JSON)))
                        )
                    )
                )
            )
        )
    )
`;


export const getUserContacts = `
SELECT
    user.id,
    user.user_id,
    user.first_name,
    user.last_name,
    user.tenant_id,
    tenant.name AS tenant_name,
    user.email
FROM
    user
LEFT JOIN tenant ON user.tenant_id = tenant.id
WHERE
    (:tenant_id IS NULL OR user.tenant_id = :tenant_id)
`;

export async function getUserPrograms(replacements: any, isSuperAdmin: boolean) {
  const userProgramsQuery = `
    SELECT DISTINCT
      programs.id,
      programs.industries,
      programs.unique_id,
      programs.name,
      programs.type,
      programs.config,
      programs.msp_id,
      programs.start_date,
      programs.is_activated,
      programs.display_name,
      programs.client_id,
      tenant.id AS client_id,
      tenant.name AS client_name,
      tenant.logo AS logo
    FROM
      programs
    LEFT JOIN tenant ON programs.client_id = tenant.id
    ${!isSuperAdmin ? "LEFT JOIN user_mappings ON user_mappings.program_id = programs.id" : ""}
    WHERE
      ${!isSuperAdmin ? "(user_mappings.user_id = :user_id OR user_mappings.candidate_id = :user_id)" : "1=1"}
       ${replacements.search ? `AND (programs.display_name LIKE :search OR tenant.name LIKE :search)` : ""}
  `;

  try {
    const data = await sequelize.query(userProgramsQuery, {
      replacements,
      type: QueryTypes.SELECT,
    });
    return data;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export const sameFeesConfig = `
    SELECT fees.id
    FROM fees
    WHERE fees.program_id = :program_id
    AND fees.title = :title
    AND JSON_CONTAINS(fees.hierarchy_levels, :hierarchies)
    AND JSON_CONTAINS(fees.labor_category, :labor_category)
    AND JSON_CONTAINS(fees.vendors, :vendors)
`;

export const sameHierarchieRateConfiguration = `
    SELECT rc.id
    FROM rate_configurations rc
    JOIN rate_configuration_hierarchies rh ON rc.id = rh.rate_configuration_id
    JOIN rate_configuration_job_templates rjt ON rc.id = rjt.rate_configuration_id
    WHERE rc.program_id = :program_id
    AND rc.id <> :id
    AND rh.hierarchy_id IN (:hierarchies)
    AND rjt.job_template_id IN (:job_templates)
    AND (
       :job_type IS NULL OR JSON_CONTAINS(rc.job_type, JSON_QUOTE(:job_type))
    )
    `;

export const getMatchingHierarchiesQuery = () => {
  return `
        SELECT
            h.id AS hierarchy_id
        FROM hierarchies h
        WHERE h.program_id = :program_id AND h.id IN (:hierarchy_ids)
      `;
};

export const getUserHierarchiesBasedOnUserType = `
    WITH RECURSIVE user_data AS (
      SELECT
        u.associate_hierarchy_ids,
        u.user_type,
        u.tenant_id,
        u.is_all_hierarchy_associate
      FROM user u
      WHERE u.user_id = :userId
        AND u.program_id = :program_id
    ),
    matched_hierarchies AS (
      SELECT
        h.id,
        h.name,
        h.parent_hierarchy_id,
        h.is_enabled
      FROM hierarchies h
      WHERE h.program_id = :program_id
        AND h.is_deleted = false
        AND (
          -- For super_user: Fetch all hierarchies
          EXISTS (SELECT 1 FROM user_data WHERE user_type = 'super_user')
          OR
          -- For client or msp: Match associate_hierarchy_ids JSON
          EXISTS (
            SELECT 1
            FROM user_data
            WHERE user_type IN ('client', 'msp')
              AND
              (
                user_data.is_all_hierarchy_associate = true
                OR
                JSON_CONTAINS(user_data.associate_hierarchy_ids, JSON_ARRAY(h.id))
              )
          )
          OR
          -- For vendor: Match hierarchies in program_vendors
          EXISTS (
            SELECT 1
            FROM user_data
            JOIN program_vendors pv ON pv.tenant_id = user_data.tenant_id
            WHERE user_data.user_type = 'vendor'
              AND pv.program_id = :program_id
              AND (
              -- If vendor has all_hierarchy = true, return all hierarchies
              pv.all_hierarchy = true
              OR
              -- Else, match specific hierarchies
              (pv.all_hierarchy = false AND JSON_CONTAINS(pv.hierarchies, JSON_ARRAY(h.id)))
            )
          )
        )
    ),
    parent_hierarchies AS (
      SELECT
        h.id,
        h.name,
        h.parent_hierarchy_id,
        h.is_enabled
      FROM matched_hierarchies h
      UNION ALL
      SELECT
        p.id,
        p.name,
        p.parent_hierarchy_id,
        p.is_enabled
      FROM hierarchies p
      JOIN parent_hierarchies ph ON p.id = ph.parent_hierarchy_id
      WHERE p.program_id = :program_id
        AND p.is_deleted = false
    )
    SELECT DISTINCT * FROM parent_hierarchies;
  `;

export const vendorComplianceDocumentFilterQuery = (
  hasId: boolean,
  hasName: boolean,
  hasAct: boolean,
  hasDocumentNumber: boolean,
  hasIsEnabled: boolean,
  hasUpdatedOn: boolean
) => {
  return `
          SELECT
              vendor_compliance_documents.*,
              COUNT(vendor_compliance_documents.id) OVER () AS total_count
          FROM
              vendor_compliance_documents
          WHERE
              vendor_compliance_documents.is_deleted = false
              AND vendor_compliance_documents.program_id = :program_id
              ${hasId ? 'AND vendor_compliance_documents.id = :id' : ''}
              ${hasName ? 'AND vendor_compliance_documents.name LIKE :name' : ''}
              ${hasAct ? 'AND vendor_compliance_documents.act = :act' : ''}
              ${hasDocumentNumber ? 'AND vendor_compliance_documents.document_number = :document_number' : ''}
              ${hasIsEnabled ? 'AND vendor_compliance_documents.is_enabled = :is_enabled' : ''}
              ${hasUpdatedOn ? 'AND vendor_compliance_documents.updated_on BETWEEN :updated_on_start AND :updated_on_end' : ''}
          ORDER BY
              vendor_compliance_documents.updated_on DESC
          LIMIT :limit
          OFFSET :offset;
      `;
};

export const vendorDistributionScheduleFilterQuery = (
  hasId: boolean,
  hasName: boolean,
  hasIsEnabled: boolean,
  hasUpdatedOn: boolean,
  hasDescription: boolean
) => {
  const baseWhereClause = `
    vendor_distribution_schedules.is_deleted = false
    AND vendor_distribution_schedules.program_id = :program_id
    ${hasId ? 'AND vendor_distribution_schedules.id = :id' : ''}
    ${hasName ? 'AND vendor_distribution_schedules.name LIKE :name' : ''}
    ${hasDescription ? 'AND vendor_distribution_schedules.description LIKE :description' : ''}
    ${hasIsEnabled ? 'AND vendor_distribution_schedules.is_enabled = :is_enabled' : ''}
    ${hasUpdatedOn ? 'AND vendor_distribution_schedules.updated_on BETWEEN :updated_on_start AND :updated_on_end' : ''}
  `;

  const dataQuery = `
    SELECT
      vendor_distribution_schedules.*
    FROM
      vendor_distribution_schedules
    WHERE
      ${baseWhereClause}
    ORDER BY
      vendor_distribution_schedules.updated_on DESC
    LIMIT :limit
    OFFSET :offset;
  `;

  const countQuery = `
    SELECT
      COUNT(*) AS total_count
    FROM
      vendor_distribution_schedules
    WHERE
      ${baseWhereClause};
  `;

  return { dataQuery, countQuery };
};

export const vendorDocumentGroupFilterQuery = (
  hasId: boolean,
  hasName: boolean,
  hasDescription: boolean,
  hasIsEnabled: boolean,
  hasUpdatedOn: boolean
) => {
  return `
    SELECT
      vendor_document_groups.*,
      COUNT(vendor_document_groups.id) OVER () AS total_count,
      (
        SELECT
          COUNT(*)
        FROM
          vendor_compliance_documents vcd
        WHERE
          JSON_CONTAINS(vendor_document_groups.required_documents, JSON_QUOTE(vcd.id))
          AND vcd.is_deleted = false
          AND vcd.is_enabled = true
      ) AS total_documents
    FROM
      vendor_document_groups
    WHERE
      vendor_document_groups.is_deleted = false
      AND vendor_document_groups.program_id = :program_id
      ${hasId ? 'AND vendor_document_groups.id = :id' : ''}
      ${hasName ? 'AND vendor_document_groups.name LIKE :name' : ''}
      ${hasDescription ? 'AND vendor_document_groups.description LIKE :description' : ''}
      ${hasIsEnabled ? 'AND vendor_document_groups.is_enabled = :is_enabled' : ''}
      ${hasUpdatedOn ? 'AND vendor_document_groups.updated_on BETWEEN :updated_on_start AND :updated_on_end' : ''}
    ORDER BY
      vendor_document_groups.updated_on DESC
    LIMIT :limit
    OFFSET :offset;
  `;
};

export const vendorGroupFilterQuery = (
  hasId: boolean,
  hasVendorGroupName: boolean,
  hasIsEnabled: boolean,
  hasUpdatedOn: boolean
) => {
  return `
          SELECT
              vendor_groups.*,
              COUNT(vendor_groups.id) OVER () AS total_count
          FROM
              vendor_groups
          WHERE
              vendor_groups.is_deleted = false
              AND vendor_groups.program_id = :program_id
              ${hasId ? 'AND vendor_groups.id = :id' : ''}
              ${hasVendorGroupName ? 'AND vendor_groups.vendor_group_name LIKE :vendor_group_name' : ''}
              ${hasIsEnabled ? 'AND vendor_groups.is_enabled = :is_enabled' : ''}
              ${hasUpdatedOn ? 'AND vendor_groups.updated_on BETWEEN :updated_on_start AND :updated_on_end' : ''}
          ORDER BY
              vendor_groups.created_on DESC
          LIMIT :limit
          OFFSET :offset;
      `;
};

export const rateConfigurationsFilterQuery = (
  hasId: boolean,
  hasName: boolean,
  hasIsShiftRate: boolean,
  hasJobType: boolean,
  hasIsEnabled: boolean,
  hasUpdatedOn: boolean
) => `
  SELECT * FROM rate_configurations
  WHERE program_id = :program_id
  ${hasId ? 'AND id = :id' : ''}
  ${hasName ? 'AND name LIKE :name' : ''}
  ${hasIsShiftRate ? 'AND is_shift_rate = :is_shift_rate' : ''}
  ${hasJobType ? 'AND job_type = :job_type' : ''}
  ${hasIsEnabled ? 'AND is_enabled = :is_enabled' : ''}
  ${hasUpdatedOn ? 'AND updated_on BETWEEN :updated_on_start AND :updated_on_end' : ''}
  ORDER BY created_on DESC
  LIMIT :limit OFFSET :offset;`;


export const getParentHierarchiesQuery = `
  SELECT *
  FROM hierarchies
  WHERE hierarchies.program_id = :program_id
  AND hierarchies.parent_hierarchy_id IS NULL;
  `;

export const getProgramVendorDetails = `
  SELECT
    pv.id AS program_vendor_id,
    pv.program_id,

    (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', h.id, 'name', h.name))
        FROM hierarchies h
        WHERE
            (pv.all_hierarchy = TRUE AND h.program_id = pv.program_id) OR
            (pv.all_hierarchy = FALSE AND JSON_CONTAINS(pv.hierarchies, JSON_QUOTE(h.id)))
    ) AS hierarchies,

    (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', wl.id, 'name', wl.name))
        FROM work_locations wl
        WHERE
            (pv.all_work_locations = TRUE AND wl.program_id = pv.program_id) OR
            (pv.all_work_locations = FALSE AND JSON_CONTAINS(pv.work_locations, JSON_QUOTE(wl.id)))
    ) AS work_locations,

    (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', lc.id, 'name', lc.name))
        FROM labour_category lc
        WHERE
            (pv.is_labour_category = TRUE AND lc.program_id = pv.program_id) OR
            (pv.is_labour_category = FALSE AND JSON_CONTAINS(pv.program_industry, JSON_QUOTE(lc.id)))
    ) AS labour_category,
  (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', vcf.id,
          'custom_field_id', vcf.custom_field_id,
          'name', cf.name,
          'label', cf.label,
          'value', vcf.value,
          'field_type', cf.field_type,
          'manager_name',
            CASE
              WHEN user.user_id IS NOT NULL
              THEN CONCAT(user.first_name, ' ', user.last_name)
              ELSE NULL
            END
        )
      )
      FROM vendor_custom_field vcf
      LEFT JOIN custom_fields cf ON cf.id = vcf.custom_field_id
      LEFT JOIN user ON TRIM(BOTH '"' FROM vcf.value) = user.user_id AND user.program_id = cf.program_id
      WHERE vcf.vendor_id = pv.id
      AND cf.is_deleted = false
      AND cf.is_enabled = true
    ) AS custom_fields

FROM
    program_vendors pv

WHERE
    pv.program_id = :program_id AND
    pv.id = :id;
`;

export const getVendorMarkups = ({
  rate_model,
  hierarchy = [],
  labor_category = [],
  job_template = [],
  worker_type = [],
  worker_classification = [],
  rate_type = [],
}: {
  rate_model?: string;
  hierarchy?: string[];
  labor_category?: string[];
  job_template?: string[];
  worker_type?: string[];
  worker_classification?: string[];
  rate_type?: string[];
}) => {
  const hierarchyPlaceholders = hierarchy.map((_, i) => `:hierarchy${i}`).join(',');
  const laborCategoryPlaceholders = labor_category.map((_, i) => `:labor_category${i}`).join(',');
  const jobTemplatePlaceholders = job_template.map((_, i) => `:job_template${i}`).join(',');
  const workerTypePlaceholders = worker_type.map((_, i) => `:worker_type${i}`).join(',');
  const workerClassificationPlaceholders = worker_classification.map((_, i) => `:worker_classification${i}`).join(',');
  const rateTypePlaceholders = rate_type.map((_, i) => `:rate_type${i}`).join(',');

  return `
      SELECT
          vmc.id,
          vmc.rate_model,
          vmc.sliding_scale,
          vmc.markups,
          COALESCE(
              (SELECT JSON_OBJECT('id', pi.id, 'label', pi.label, 'value', pi.value)
               FROM picklistitems pi WHERE pi.id = vmc.job_type),
              JSON_OBJECT('id', 'any', 'label', 'Any')
          ) AS job_type,
          COALESCE(
              (SELECT JSON_OBJECT('id', jt.id, 'name', jt.template_name)
               FROM job_templates jt WHERE jt.id = vmc.job_template),
              JSON_OBJECT('id', 'any', 'name', 'Any')
          ) AS job_template,
          COALESCE(
              (SELECT JSON_OBJECT('id', pi.id, 'label', pi.label, 'value', pi.value)
               FROM picklistitems pi WHERE pi.id = vmc.worker_type),
              JSON_OBJECT('id', 'any', 'label', 'Any')
          ) AS worker_type,
          COALESCE(
              (SELECT JSON_OBJECT('id', pi.id, 'label', pi.label, 'value', pi.value)
               FROM picklistitems pi WHERE pi.id = vmc.worker_classification),
              JSON_OBJECT('id', 'any', 'label', 'Any')
          ) AS worker_classification,
          COALESCE(
              (SELECT JSON_OBJECT('id', rt.id, 'name', rt.name, 'abbreviation', rt.abbreviation)
               FROM rate_type rt WHERE rt.id = vmc.rate_type),
              JSON_OBJECT('id', 'any', 'name', 'Any', 'abbreviation', 'Any')
          ) AS rate_type,
          COALESCE(
              (SELECT JSON_OBJECT('id', wl.id, 'name', wl.name)
               FROM work_locations wl WHERE wl.id = vmc.work_locations),
              JSON_OBJECT('id', 'any', 'name', 'Any')
          ) AS work_locations,
          COALESCE(
              (SELECT JSON_OBJECT('id', h.id, 'name', h.name)
               FROM hierarchies h WHERE h.id = vmc.hierarchy),
              JSON_OBJECT('id', 'any', 'name', 'Any')
          ) AS hierarchy,
          COALESCE(
              (SELECT JSON_OBJECT('id', i.id, 'name', i.name)
               FROM labour_category i WHERE i.id = vmc.program_industry),
              JSON_OBJECT('id', 'any', 'name', 'Any')
          ) AS program_industry,
          vmc.is_enabled
      FROM vendor_markup_config vmc
      WHERE vmc.program_id = :program_id
      AND vmc.program_vendor_id = :program_vendor_id
      AND vmc.is_deleted = false
      ${rate_model ? "AND vmc.rate_model = :rate_model" : ""}
      ${hierarchy.length > 0 ? `AND (vmc.hierarchy IN (${hierarchyPlaceholders}) OR vmc.hierarchy IS NULL)` : ""}
      ${labor_category.length > 0 ? `AND (vmc.program_industry IN (${laborCategoryPlaceholders}) OR vmc.program_industry IS NULL)` : ""}
      ${job_template.length > 0 ? `AND (vmc.job_template IN (${jobTemplatePlaceholders}) OR vmc.job_template IS NULL)` : ""}
      ${worker_type.length > 0 ? `AND (vmc.worker_type IN (${workerTypePlaceholders}) OR vmc.worker_type IS NULL)` : ""}
      ${worker_classification.length > 0 ? `AND (vmc.worker_classification IN (${workerClassificationPlaceholders}) OR vmc.worker_classification IS NULL)` : ""}
      ${rate_type.length > 0 ? `AND (vmc.rate_type IN (${rateTypePlaceholders}) OR vmc.rate_type IS NULL)` : ""}
      ORDER BY vmc.is_default DESC, vmc.created_on DESC
  `;
};

export const shiftTypesQuery = `
  SELECT DISTINCT
    st.id AS shift_type_id,
    st.shift_type_name,
    st.shift_type_category,
    st.is_enabled,
    st.shift_type_time,
    st.time_duration
  FROM
    shift_types st
    JOIN rate_type rt
      ON rt.shift_type = st.id
    JOIN rate_configuration_rate_types rcrt
      ON rcrt.rate_type_id = rt.id
    JOIN rate_configuration_base_rate_types rcbrt
      ON rcrt.base_rate_type_id = rcbrt.id
    JOIN rate_configurations rc
      ON rcbrt.rate_configuration_id = rc.id
  WHERE
    rc.is_enabled = true
    AND rc.is_deleted = false
    AND rc.program_id = :program_id
    AND rc.is_shift_rate = true
    AND rc.id IN (:configIds)
    AND st.is_enabled = true
    AND st.is_deleted = false
`;

export const getVendorDistributionSchedule = `
  SELECT
    ds.id,
    ds.name,
    ds.description,
    ds.is_enabled,
    dsd.id AS detail_id,
    dsd.duration,
    dsd.measure_unit,
    dsd.condition,
    (
      SELECT
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', pv.id,
            'name', pv.display_name
          )
        )
        FROM program_vendors pv
        WHERE JSON_OVERLAPS(dsd.vendors, JSON_ARRAY(pv.id))
    ) AS vendors,
    (
      SELECT
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', vg.id,
            'name', vg.vendor_group_name
          )
        )
        FROM vendor_groups vg
        WHERE JSON_OVERLAPS(dsd.vendor_group_ids, JSON_ARRAY(vg.id))
    ) AS vendor_groups
    FROM vendor_distribution_schedules ds
    INNER JOIN vendor_dist_schedule_details dsd ON dsd.distribution_id = ds.id
    WHERE ds.id = :id
      AND ds.program_id = :program_id
      AND ds.is_deleted = FALSE
    ORDER BY
      CASE dsd.measure_unit
        WHEN 'hours' THEN 1
        WHEN 'days' THEN 2
        WHEN 'weeks' THEN 3
        ELSE 4
      END,
    dsd.duration ASC;
`;


export const getMasterDataCustomFields = `
   select
master_data_type.id,
 COALESCE((
                 SELECT JSON_ARRAYAGG(JSON_OBJECT(
                   'id', master_data_custom_field.id,
                    'custom_field_id', master_data_custom_field.custom_field_id,
                    'value', master_data_custom_field.value,
                  'manager_name',
                      CASE
                        WHEN user.user_id IS NOT NULL
                      THEN CONCAT(user.first_name, ' ', user.last_name)
                      ELSE NULL
                      END,
                   'name', custom_fields.name,
                   'field_type', custom_fields.field_type
               ))
            FROM master_data_custom_field
              LEFT JOIN custom_fields ON master_data_custom_field.custom_field_id = custom_fields.id
              LEFT JOIN user ON TRIM(BOTH '"' FROM master_data_custom_field.value) = user.user_id
              AND user.program_id = master_data_custom_field.program_id
              WHERE master_data_custom_field.master_data_type_id = master_data_type.id
    ), JSON_ARRAY()) AS custom_fields,
     (
    CASE
      WHEN master_data_type.is_all_hierarchy_associated = TRUE THEN (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', h.id, 'name', h.name))
        FROM hierarchies h
        WHERE h.program_id = master_data_type.program_id AND h.is_deleted = FALSE AND is_enabled = TRUE
      )
      ELSE (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('id', h.id, 'name', h.name))
        FROM master_data_type_hierarchy mdth
        JOIN hierarchies h ON mdth.hierarchy_id = h.id
        WHERE mdth.master_data_type_id = master_data_type.id
        AND h.is_deleted = FALSE
        AND h.is_enabled = TRUE
      )
    END
  ) AS hierarchies

    from master_data_type
    where master_data_type.program_id=:program_id
    AND master_data_type.id=:id
`;

export const userData = `
  SELECT * FROM user WHERE user_id = :client_id
    AND (
      user_type = 'super_user'
        OR program_id = :program_id
      )
    LIMIT 1;
  `;

export const masterDataAdvanceFilterQuery = (hierarchyFilter: string, mspHierarchyFilter: string,userHierarchyFilter:any) => `
  SELECT DISTINCT md.id,
      md.program_id, md.name, md.is_enabled,
      MIN(md.updated_on) AS first_updated_on,
      MAX(md.updated_on) AS last_updated_on,
      md.code, md.foundational_data_type_id, md.depended_fields,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name
          )
        )
        FROM user u
        WHERE JSON_CONTAINS(md.manager_ids, JSON_QUOTE(u.id))
      ) AS manager_ids,
      mdt.name AS foundational_data_type_name,
      COUNT(*) OVER() AS total_count
  FROM master_data AS md
  LEFT JOIN user AS t ON JSON_CONTAINS(md.manager_ids, JSON_QUOTE(t.id))
  LEFT JOIN master_data_type AS mdt ON md.foundational_data_type_id = mdt.id
  WHERE md.program_id = :program_id
      AND md.is_deleted = 0
      AND (:id IS NULL OR md.id = :id)
      AND (:name IS NULL OR md.name LIKE :name)
      AND (:is_enabled IS NULL OR md.is_enabled = :is_enabled)
      AND (:updated_on_start IS NULL OR :updated_on_end IS NULL OR md.updated_on BETWEEN :updated_on_start AND :updated_on_end)
      AND (:manager_ids IS NULL OR JSON_CONTAINS(md.manager_ids, JSON_QUOTE(:manager_ids)))
      AND (:code IS NULL OR md.code LIKE :code)
      AND (:foundational_data_type_id IS NULL OR md.foundational_data_type_id = :foundational_data_type_id)
      AND (:first_name IS NULL OR t.first_name LIKE :first_name)
      ${hierarchyFilter}
      ${mspHierarchyFilter}
      ${userHierarchyFilter || ''}
  GROUP BY md.id, md.program_id, md.name, md.is_enabled, md.code, md.foundational_data_type_id, md.depended_fields,
           md.manager_ids, mdt.name
  ORDER BY last_updated_on DESC
  LIMIT :limit OFFSET :offset;
`;

export const getWorklocationCustomField = `
  SELECT
    work_locations.id,
    work_locations.name,
    COALESCE((
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'custom_field_id', work_location_custom_field.customfield_id,
                'value', work_location_custom_field.value,
                'label', cf.label,
                'field_type', cf.field_type,
                'manager_name',
          CASE
            WHEN u.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
            ELSE NULL
          END
            )
        )
        FROM work_location_custom_field
        JOIN custom_fields cf ON work_location_custom_field.customfield_id = cf.id
        LEFT JOIN user AS u
        ON REPLACE(REPLACE(work_location_custom_field.value, '"', ''), ' ', '') = TRIM(u.user_id) AND u.program_id = work_locations.program_id
        WHERE  work_location_custom_field.work_location_id=work_locations.id
        AND cf.is_enabled = true
        AND cf.is_deleted = false
    ), JSON_ARRAY()) AS custom_fields
FROM work_locations
WHERE work_locations.program_id =:program_id
AND  work_locations.id=:id
  `;

export const timesheetConfigAdvancedGetAllFilter = (
  hasId: boolean,
  hasTitle: boolean,
  hierarchyIdsArray: string[],
  laborCategoryIdsArray: string[],
  hasTimesheetRuleGroup: boolean,
  hasTimesheetFormat: boolean,
  hasAllocationMethod: boolean,
  hasIsEnabled: boolean,
  hasLimit: boolean,
  hasOffset: boolean
) => {
  let hierarchyFilterCondition = '';
  let laborCategoryFilter = '';

  if (hierarchyIdsArray.length > 0) {
    const hierarchyFilter = hierarchyIdsArray
      .map(id => `JSON_CONTAINS(ttc.hierarchies, JSON_QUOTE('${id}'), '$')`)
      .join(' OR ');
    hierarchyFilterCondition = ` AND ((${hierarchyFilter}) OR ttc.is_all_hierarchy_associated = true)`;
  }

  if (laborCategoryIdsArray.length > 0) {
    const laborCategory = laborCategoryIdsArray
      .map(id => `JSON_CONTAINS(ttc.labor_category, JSON_QUOTE('${id}'), '$')`)
      .join(' OR ');
    laborCategoryFilter = ` AND ((${laborCategory}) OR ttc.is_all_labor_category_associate = true)`;
  }

  return `
        SELECT
          ttc.id, ttc.title, ttc.display_title, ttc.is_enabled, ttc.allocations, ttc.updated_on, ttc.slug,
          COUNT(ttc.id) OVER () AS total_count,
          JSON_OBJECT('id', trg.id, 'name', trg.rule_group_name) AS timesheet_rule_group
        FROM
          timesheet_type_config ttc
        LEFT JOIN timesheet_expense_rule_groups trg ON ttc.timesheet_rule_group = trg.id
        WHERE
          ttc.is_deleted = false
          AND ttc.program_id = :program_id
          ${hasId ? 'AND ttc.id = :id' : ''}
          ${hasTitle ? 'AND ttc.title LIKE :title' : ''}
          ${hasIsEnabled ? 'AND ttc.is_enabled = :is_enabled' : ''}
          ${hasTimesheetRuleGroup ? 'AND ttc.timesheet_rule_group = :timesheet_rule_group' : ''}
          ${hasTimesheetFormat ? 'AND ttc.timesheet_format = :timesheet_format' : ''}
          ${hasAllocationMethod ? 'AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(ttc.allocations, "$.allocation_method"))) = LOWER(:allocation_method)' : ''}
          ${hierarchyFilterCondition}
          ${laborCategoryFilter}
        GROUP BY
          ttc.id
         ORDER BY ttc.updated_on DESC
        ${hasLimit ? 'LIMIT :limit' : ''}
        ${hasOffset ? 'OFFSET :offset' : ''};
    `;
};

export const masterDataTypeAdvanceFilter = (hierarchyFilter: string, mspHierarchyFilter: string, hasUpdatedOnFilter: any, orderBySeqNumber: boolean) => `
SELECT
  mdt.id,
  mdt.program_id,
  mdt.name,
  mdt.is_enabled,
  mdt.updated_on,
  mdt.description,
  mdt.configuration,
  mdt.seq_number,
  COALESCE(fdc.total_data_count, 0) AS master_data_count,
  COUNT(*) OVER() AS total_count
FROM master_data_type AS mdt
LEFT JOIN (
  SELECT
    foundational_data_type_id,
    COUNT(*) AS total_data_count
  FROM master_data
  WHERE is_deleted = FALSE
  GROUP BY foundational_data_type_id
) AS fdc ON fdc.foundational_data_type_id = mdt.id
WHERE
  mdt.program_id = :program_id
  AND mdt.is_deleted = FALSE
  AND (
    :name IS NULL
    OR mdt.name LIKE CONCAT('%', :name, '%')
  )
  AND (
    :is_enabled IS NULL
    OR mdt.is_enabled = :is_enabled
  )
  AND (
    :timesheet_master_data IS NULL
    OR JSON_EXTRACT(mdt.configuration, '$.timesheet_master_data') = :timesheet_master_data
  )
  AND (
    :user_association_exclude IS NULL
    OR JSON_EXTRACT(mdt.configuration, '$.user_association_exclude') = :user_association_exclude
  )
  AND (
    :track_owner IS NULL
    OR JSON_EXTRACT(mdt.configuration, '$.track_owner') = :track_owner
  )
  AND (
    :allow_multiple_sows IS NULL
    OR JSON_UNQUOTE(JSON_EXTRACT(mdt.configuration, '$.allow_multiple_sows')) = :allow_multiple_sows
  )
 AND (
  :allow_multiple_jobs IS NULL
  OR JSON_EXTRACT(mdt.configuration, '$.allow_multiple_jobs') IS NOT NULL AND
     JSON_UNQUOTE(JSON_EXTRACT(mdt.configuration, '$.allow_multiple_jobs')) = :allow_multiple_jobs
)
  ${hasUpdatedOnFilter ? 'AND mdt.updated_on BETWEEN :updated_on_start AND :updated_on_end' : ''}
  ${hierarchyFilter}
  ${mspHierarchyFilter}
ORDER BY
  ${orderBySeqNumber ? 'mdt.seq_number ASC' : 'mdt.updated_on DESC'}
LIMIT :limit OFFSET :offset;
`;


export function sameHolidayCalendar(hasHierarchyIds: boolean, excludeCurrent?: boolean) {
  return `
    SELECT hc.id
    FROM holiday_calendar hc
    LEFT JOIN holiday_calendar_hierarchies hch ON hch.holiday_calendar_id = hc.id
    WHERE hc.program_id = :program_id
    AND hc.is_deleted = false
    AND hc.year = :year
    ${excludeCurrent ? 'AND hc.id != :exclude_id' : ''}
    AND (
      :is_all_hierarchy_associated = true
      OR hc.is_all_hierarchy_associated = true
      ${hasHierarchyIds ? `
        OR EXISTS (
          SELECT 1 FROM holiday_calendar_hierarchies hch2
          WHERE hch2.holiday_calendar_id = hc.id
          AND hch2.hierarchy_id IN (:hierarchy_ids)
        )
      ` : ''}
    )
  `;
}

export const getHierarchieListView = `
  SELECT
    h.id,
    h.parent_hierarchy_id,
    h.name,
    h.is_enabled,
    h.default_currency
  FROM hierarchies h
  WHERE h.id IN (:commonHierarchyIds)
`;