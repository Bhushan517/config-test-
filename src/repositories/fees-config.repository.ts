import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
import { FastifyRequest } from "fastify";

class FeesConfigRepository {
  static async getFeesConfig(program_id: string, hierarchy_levels: any, labor_category: any, vendors: any) {
    let result: any;
    let sql: any;

    sql = `
            SELECT * FROM fees WHERE program_id = :program_id
            AND JSON_CONTAINS(fees.hierarchy_levels, :hierarchies)
            AND JSON_CONTAINS(fees.labor_category, :labor_category)
            AND JSON_CONTAINS(fees.vendors, :vendors)
        `;

    const replacements = {
      program_id,
      hierarchies: JSON.stringify(hierarchy_levels),
      labor_category: JSON.stringify(labor_category),
      vendors: JSON.stringify(vendors),
    };

    result = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });

    return result;
  }

  static async feesAdvancedFilter(
    request: FastifyRequest,
    program_id: string,
    paginationOverride?: { page?: number; limit?: number },
    mspHierarchyIds?: string[],
    filtersInput: Record<string, any> = {}
  ) {
    const filters = filtersInput.filters || filtersInput;

    const page = paginationOverride?.page || 1;
    const limit = paginationOverride?.limit || 10;
    const offset = (page - 1) * limit;

    const whereClause: string[] = [
      "fees.is_deleted = false",
      "fees.program_id = :program_id",
    ];
    const replacements: Record<string, any> = { program_id };

    if (mspHierarchyIds && mspHierarchyIds.length > 0) {
      whereClause.push(`(
      fees.is_all_hierarchy_associated = 1
      OR EXISTS (
        SELECT 1 FROM JSON_TABLE(fees.hierarchy_levels, '$[*]' COLUMNS (hierarchy_id VARCHAR(255) PATH '$')) AS jt
        WHERE jt.hierarchy_id IN (:mspHierarchyIds)
      )
    )`);
      replacements.mspHierarchyIds = mspHierarchyIds;
    }

    if (filters.hierarchy_levels) {
      whereClause.push("JSON_CONTAINS(fees.hierarchy_levels, :hierarchies)");
      replacements.hierarchies = JSON.stringify(filters.hierarchy_levels);
    }

    if (filters.labor_category) {
      whereClause.push("JSON_CONTAINS(fees.labor_category, :labor_category)");
      replacements.labor_category = JSON.stringify(filters.labor_category);
    }

    if (filters.vendors) {
      whereClause.push("JSON_CONTAINS(fees.vendors, :vendors)");
      replacements.vendors = JSON.stringify(filters.vendors);
    }

    if (filters.source_model) {
      whereClause.push("fees.source_model LIKE :source_model");
      replacements.source_model = `%${filters.source_model[0]}%`;
    }

    if (filters.is_enabled !== undefined) {
      whereClause.push("fees.is_enabled = :is_enabled");
      replacements.is_enabled = filters.is_enabled;
    }

    if (filters.title) {
      whereClause.push("fees.title LIKE :title");
      replacements.title = `%${filters.title}%`;
    }

    if (filters.updated_on && Array.isArray(filters.updated_on)) {
      const [startDateStr, endDateStr] = filters.updated_on;
      if (startDateStr) {
        const startDate = new Date(startDateStr).getTime();
        whereClause.push("fees.updated_on >= :start_date");
        replacements.start_date = startDate;
      }
      if (endDateStr) {
        const endDate = new Date(endDateStr).getTime() + (24 * 60 * 60 * 1000) - 1;
        whereClause.push("fees.updated_on <= :end_date");
        replacements.end_date = endDate;
      }
    }

    const whereSql = whereClause.length
      ? `WHERE ${whereClause.join(" AND ")}`
      : "";

    const sql = `
        SELECT 
          fees.id, fees.title, fees.source_model, fees.vendors, fees.funding_model, fees.labor_category, fees.updated_on, fees.is_enabled,
          fees.is_all_labor_category,fees.is_all_hierarchy_associated,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT('id', h.id, 'name', h.name)
            )
            FROM JSON_TABLE(fees.hierarchy_levels, '$[*]' COLUMNS (hierarchy_id VARCHAR(255) PATH '$')) AS jt
            JOIN hierarchies h ON h.id = jt.hierarchy_id
          ) AS hierarchy_levels,
           (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT('id', l.id, 'name', l.name)
            )
            FROM JSON_TABLE(fees.labor_category, '$[*]' COLUMNS (labour_category_id VARCHAR(255) PATH '$')) AS jt
            JOIN labour_category l ON l.id = jt.labour_category_id
          ) AS labor_category,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT('id', pv.id, 'name', pv.display_name)
            )
            FROM JSON_TABLE(fees.vendors, '$[*]' COLUMNS (vendor_id VARCHAR(255) PATH '$')) AS jt
            JOIN program_vendors pv ON pv.id = jt.vendor_id
          ) AS vendors
        FROM fees
        ${whereSql}
        LIMIT :limit OFFSET :offset
      `;

    const countSql = `SELECT COUNT(*) as total FROM fees ${whereSql} `;

    replacements.limit = limit;
    replacements.offset = offset;

    const rows = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const countResult: any = await sequelize.query(countSql, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const count = countResult[0]?.total || 0;

    return { count, rows };
  }
}

export default FeesConfigRepository;
