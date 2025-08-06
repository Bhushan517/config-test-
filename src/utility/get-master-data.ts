export const getMasterData = (tableName: string, columnName: string, masterDataType: string, masterData: string, includeIsReadOnly: boolean) => `
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', cmd.id,
      '${masterDataType}', cmd.${masterDataType},
      'foundation_data_type_name', master_data_type.name,
      'foundation_data_id', COALESCE((
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', md.id,
            'name', md.name
          )
        )
        FROM JSON_TABLE(
          cmd.${masterData},
          '$[*]' COLUMNS (
            id CHAR(36) PATH '$'
          )
        ) AS jt
        JOIN master_data md ON md.id = jt.id
        WHERE md.is_enabled = true
      ), JSON_ARRAY())
     ${includeIsReadOnly ? `,'is_read_only', cmd.is_read_only` : ''}
    )
  ) AS master_data
  FROM ${tableName} cmd
  LEFT JOIN master_data_type 
    ON cmd.${masterDataType} = master_data_type.id
    AND master_data_type.is_enabled = true
  WHERE cmd.${columnName} = :id
`;
