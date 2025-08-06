    export const getCustomsField = ( id: string, tableName: string,columnName:string,customFieldId:string) => `
    SELECT
        COALESCE((
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'custom_field_id', dcf.${customFieldId},
                    'value', dcf.value,
                    'label', cf.label,
                    'field_type', cf.field_type,
                    'manager_name',
                    CASE
                    WHEN u.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
                    ELSE NULL
                    END
                )
            )
            FROM ${tableName} dcf
            JOIN custom_fields cf ON dcf.${customFieldId} = cf.id
            LEFT JOIN user AS u
            ON REPLACE(REPLACE(dcf.value, '"', ''), ' ', '') = TRIM(u.user_id)
            AND u.program_id = cf.program_id
            WHERE dcf.${columnName} = :id
            AND cf.is_enabled = true
            AND cf.is_deleted = false
        ), JSON_ARRAY()) AS custom_fields
    `;
