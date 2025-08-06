export const getSowTemplatesQuery = (whereClause: string) => `
SELECT 
    t.id,
    t.program_id,
    t.type,
    t.template_title,
    t.description,
    t.code,
    t.created_on,
    t.updated_on,
    t.is_sow_assignment,
    t.is_sow_expense,
    t.is_sow_milestones,
    t.is_sow_payment_req,
    t.is_sow_schedule_payments,
    t.is_sow_desc_mandatory,
    COALESCE((
        SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'id', h.hierarchy_id,
            'hierarchy_name', hier.name
        ))
        FROM sow_template_hierarchy h 
        LEFT JOIN hierarchies hier ON h.hierarchy_id = hier.id
        WHERE h.sow_template_id = t.id
    ), '[]') AS hierarchy,
    COALESCE((
        SELECT JSON_OBJECT(
            'id', p.id,
            'label', p.label
        )
        FROM picklistitems p
        WHERE p.id = t.type
        LIMIT 1
    ), NULL) AS picklist_items,
    COALESCE((
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'master_data_type', mdt.id,
      'master_data_type_name', mdt.name,
      'master_data', (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', md.id,
            'name', md.name,
            'seq_no', stm.seq_no
          )
        )
        FROM sow_template_master_data stm
        LEFT JOIN master_data md 
          ON JSON_UNQUOTE(JSON_EXTRACT(stm.master_data, '$[0]')) = md.id
        WHERE stm.master_data_type = mdt.id
          AND stm.sow_temp_id = t.id
      )
    )
  )
  FROM master_data_type mdt
  WHERE EXISTS (
    SELECT 1
    FROM sow_template_master_data stm
    WHERE stm.master_data_type = mdt.id
      AND stm.sow_temp_id = t.id
  )
), JSON_ARRAY()) AS master_data

FROM sow_templates t
WHERE ${whereClause}
ORDER BY t.created_on DESC
LIMIT :limit OFFSET :offset;
`;

export const getSowTemplatesCountQuery = (whereClause: string) => `
    SELECT COUNT(*) AS total 
    FROM sow_templates t
    WHERE ${whereClause};
`;

export const getSowTemplateByIdQuery = `
   SELECT 
    t.id,
    t.code,
    t.type,
    t.template_title,
    t.description,
    t.is_sow_assignment,
    t.is_sow_expense,
    t.is_sow_milestones,
    t.is_sow_payment_req,
    t.is_sow_schedule_payments,
    t.is_sow_desc_mandatory,
    t.upload_description,
    t.is_update_sow_desc,
    t.is_req_doc_mandatory,
    t.is_deleted,
    t.program_id,
    t.created_by,
    t.updated_by,
    t.created_on,
    t.updated_on,
    -- Hierarchy
    COALESCE((
        SELECT JSON_ARRAYAGG(JSON_OBJECT(
            'id', h.hierarchy_id,
            'hierarchy_name', hier.name
        ))
        FROM sow_template_hierarchy h 
        LEFT JOIN hierarchies hier ON h.hierarchy_id = hier.id
        WHERE h.sow_template_id = t.id
    ), '[]') AS hierarchy,

    -- Picklist
    COALESCE((
        SELECT JSON_OBJECT(
            'id', p.id,
            'label', p.label
        )
        FROM picklistitems p
        WHERE p.id = t.type
        LIMIT 1
    ), NULL) AS picklist_items
FROM sow_templates t
WHERE t.id = :id AND t.program_id = :program_id AND t.is_deleted = false
LIMIT 1;
`;