import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
interface CandidateResponse {
    count: number;
    candidates: any[];
}
class CandidateRepository {
    async getCandidatesWithFilters(replacements: any): Promise<CandidateResponse> {
        let whereClause = `WHERE c.program_id = :program_id AND c.is_deleted = false`;

        if (replacements.candidate_id) whereClause += ` AND c.candidate_id LIKE :candidate_id`;
        if (replacements.first_name) {
            whereClause += `
                AND (c.first_name LIKE :first_name
                OR c.last_name LIKE :first_name
                OR CONCAT_WS(' ', c.first_name, c.last_name) LIKE :first_name)`;
        }
        if (replacements.middle_name) whereClause += ` AND c.middle_name LIKE :middle_name`;
        if (replacements.last_name) whereClause += ` AND c.last_name LIKE :last_name`;
        if (replacements.title) whereClause += ` AND c.title LIKE :title`;
        if (replacements.is_active !== undefined) whereClause += ` AND c.is_active = :is_active`;
        if (replacements.worker_type_id.length > 0) {
            const workerTypeIds = replacements.worker_type_id.map((id: string) => `'${id.trim()}'`).join(',');
            whereClause += ` AND c.worker_type_id IN (${workerTypeIds})`;
        }
        if (replacements.updated_on) {
            whereClause += ` AND c.updated_on = :updated_on`;
        }

        if (replacements.search) {
            whereClause += ` AND (
            c.first_name LIKE :search OR
            c.last_name LIKE :search OR
            c.email LIKE :search OR
            CONCAT(c.first_name, ' ', c.last_name, c.email) LIKE :search
          )`
        }

        if (replacements.isMsp) {
            if (replacements.is_all_hierarchy_associate) {
                whereClause += ` AND c.vendor_id IN (
                    SELECT id FROM program_vendors WHERE program_id = :program_id
                )`;
            } else if (replacements.associate_hierarchy_ids && replacements.associate_hierarchy_ids.length > 0) {
                const hierarchyIds = replacements.associate_hierarchy_ids.map((id: string) => `'${id.trim()}'`).join(',');
                whereClause += ` AND c.vendor_id IN (
                    SELECT id FROM program_vendors
                    WHERE program_id = :program_id
                    AND (
                        all_hierarchy = true
                        OR
                        JSON_OVERLAPS(hierarchies, JSON_ARRAY(${hierarchyIds}))
                    )
                )`;
            }
        }

        const countQuery = `
            SELECT COUNT(*) as count
            FROM candidates c
            ${whereClause};
        `;

        const countResult = await sequelize.query<{ count: any }>(countQuery, {
            replacements,
            type: QueryTypes.SELECT,
        });
        const count = countResult[0].count;

        const query = `
        SELECT DISTINCT
        c.id,
        c.first_name,
        c.middle_name,
        c.last_name,
        c.is_active,
        c.name,
        c.email,
        c.program_id,
        c.candidate_id,
        c.worker_type_id,
        c.title,
        c.birth_date,
        c.updated_on,
        c.state_national_id,
        c.do_not_rehire_notes,
        c.do_not_rehire_reason,
        c.do_not_rehire,
        c.is_pre_identified,
        CAST(JSON_UNQUOTE(JSON_EXTRACT(c.contacts, '$[0].number')) AS CHAR) AS phone_number,
        JSON_OBJECT(
            'id', v.id,
            'vendor_name', v.max_vendor_name,
            'display_name', v.max_display_name
        ) AS vendor
        FROM candidates c
        LEFT JOIN (
        SELECT
            MAX(id) AS id,
            MAX(vendor_name) AS max_vendor_name,
            MAX(display_name) AS max_display_name
        FROM program_vendors
        GROUP BY id
        ) v
        ON c.vendor_id = v.id
        ${whereClause}
        ORDER BY c.updated_on DESC
        LIMIT :limit OFFSET :offset;
        `;

        const candidates = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT,
        });

        return { count, candidates };
    }
}

export default CandidateRepository;
