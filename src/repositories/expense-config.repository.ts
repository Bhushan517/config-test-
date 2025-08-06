export const getExpenseConfigurationQuery = (
    programId: string,
    id: string
  ) => {
    return `
      SELECT
        ec.*,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT('id', h.id, 'name', h.name)
          )
          FROM hierarchies h
          WHERE JSON_CONTAINS(ec.hierarchy_ids, JSON_QUOTE(h.id))
        ) AS hierarchy_ids,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT('id', lc.id, 'name', lc.name)
          )
          FROM labour_category lc
          WHERE JSON_CONTAINS(ec.labor_category_ids, JSON_QUOTE(lc.id))
        ) AS labor_category_ids,
        (
          SELECT JSON_ARRAYAGG(
      JSON_OBJECT('id', mdt.id, 'name', mdt.name)
    )
    FROM master_data_type mdt
    WHERE JSON_OVERLAPS(ec.master_data_types, JSON_ARRAY(mdt.id))
  ) AS master_data_types,
   (
  SELECT JSON_OBJECT(
    'source', ec.projects->>'$.source',
    'options', CASE
      WHEN ec.projects->>'$.source' = 'master_data_type' THEN (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT('id', mdt.id, 'name', mdt.name)
        )
        FROM master_data_type mdt
        WHERE JSON_OVERLAPS(JSON_EXTRACT(ec.projects, '$.options'), JSON_ARRAY(mdt.id))
      )
      WHEN ec.projects->>'$.source' = 'hierarchy' THEN (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT('id', h.id, 'name', h.name)
        )
        FROM hierarchies h
        WHERE JSON_OVERLAPS(JSON_EXTRACT(ec.projects, '$.options'), JSON_ARRAY(h.id))
      )
      WHEN ec.projects->>'$.source' = 'custom_field' THEN (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT('id', cf.id, 'name', cf.name)
        )
        FROM custom_fields cf
        WHERE JSON_OVERLAPS(JSON_EXTRACT(ec.projects, '$.options'), JSON_ARRAY(cf.id))
      )
      ELSE NULL
    END
  )
) AS projects, (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(  'id', et.id,
        'name', et.name,
        'category', et.category,
        'code', et.code,
        'is_enabled', et.is_enabled,
        'is_attachments_mandatory', et.is_attachments_mandatory,
        'is_notes_mandatory', et.is_notes_mandatory,
        'is_msp_fees_applied', et.is_msp_fees_applied,
        'is_tax_applied', et.is_tax_applied,
        'is_negative_expense_allowed', et.is_negative_expense_allowed,
        'is_unit_based', et.is_unit_based,
        'unit_label', et.unit_label,
        'rate_per_unit', et.rate_per_unit,
        'max_unit_limit', et.max_unit_limit
        )
          )
          FROM expense_config_expense_type_mapping etm
          JOIN expense_type et ON etm.expense_type_id = et.id
          WHERE etm.expense_config_id = ec.id
            AND etm.program_id = ec.program_id
        ) AS expense_types
      FROM
        expense_config ec
      WHERE
        ec.program_id = :program_id
        AND ec.id = :id
        AND ec.is_deleted = FALSE;
    `;
  };


  export const getAllExpenseConfigHierarchies = `
WITH distinct_hierarchies AS (
  SELECT DISTINCT
    ec.program_id,
    h.id,
    h.name
  FROM expense_config ec
  JOIN JSON_TABLE(
    ec.hierarchy_ids,
    '$[*]' COLUMNS (
      hierarchy_id CHAR(36) PATH '$'
    )
  ) AS hier ON TRUE
  JOIN hierarchies h ON h.id = hier.hierarchy_id
  WHERE ec.program_id = :program_id
)

SELECT 
  program_id,
  JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', id,
      'name', name
    )
  ) AS hierarchy_ids
FROM distinct_hierarchies
GROUP BY program_id;
`;

export const getExpenseByHierarchy = (hierarchy_ids: string[]) => {
    const hierarchyCondition = hierarchy_ids.length > 0
      ? `AND eth.hierarchy_id IN (${hierarchy_ids.map(() => '?').join(',')})`
      : '';
    return `
     SELECT DISTINCT
      eic.*
     FROM
      expense_config_hierarchy_mapping eth
     LEFT JOIN
      expense_config_expense_type_mapping etm ON eth.expense_config_id = etm.expense_config_id
     INNER JOIN
      expense_type eic ON etm.expense_type_id = eic.id
     WHERE
      eic.program_id =?
       ${hierarchyCondition}
      `;
  };
  