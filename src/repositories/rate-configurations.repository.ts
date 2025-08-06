import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";

class RateConfigurationsRepository {

    static async getRateConfigurationsByProgramId(program_id: string, is_shift_rate: any, hierarchyIds: string[], jobTemplateIds: string[], job_type: string | undefined){
        let result: any;
        let sql: any;
        let whereClause = '';

        if (job_type) {
            whereClause = `AND (:job_type IS NULL OR JSON_CONTAINS(rc.job_type, JSON_QUOTE(:job_type)))`;
        }

        sql = `
            SELECT DISTINCT rc.id, rc.program_id, rc.name, rc.is_shift_rate
            FROM rate_configurations rc
            INNER JOIN rate_configuration_hierarchies rch ON rc.id = rch.rate_configuration_id
            INNER JOIN rate_configuration_job_templates rcjt ON rc.id = rcjt.rate_configuration_id
            WHERE rc.program_id = :program_id
            AND rc.is_shift_rate = :is_shift_rate
            AND rc.is_enabled = true
            AND rc.is_deleted = false
            AND rch.hierarchy_id IN (:hierarchyIds)
            AND rcjt.job_template_id IN (:jobTemplateIds)
            ${whereClause}
        `;

        const replacements = {
            program_id,
            is_shift_rate,
            hierarchyIds,
            jobTemplateIds,
            job_type
        };

        // Log SQL query with replacement values
        console.log("SQL Query:", sql);
        console.log("Replacement Values:", JSON.stringify(replacements, null, 2));

        result = await sequelize.query(sql, {
            replacements,
            type: QueryTypes.SELECT
        });

        return result;
    }

}

export default RateConfigurationsRepository;