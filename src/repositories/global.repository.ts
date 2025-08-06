import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";

interface MarkupDataInterface {
    program_id?: string,
    rate_model?: string,
    hierarchy?: Array<string>,
    program_industry?: string,
    job_type?: string,
    job_template?: string,
    rate_type?: string,
    work_location?: string,
}

class GlobalRepository {
    static async findVendorMarkups(markupDetail: MarkupDataInterface) {

        const sql = `
        SELECT
            (JSON_UNQUOTE(JSON_EXTRACT(markups, '$.sourced_markup')) AS FLOAT) AS sourced_markup_min,
            (JSON_UNQUOTE(JSON_EXTRACT(markups, '$.payrolled_markup')) AS FLOAT) AS payrolled_markup_max
        FROM
            vendor_markup_config vmc
        WHERE
            AND vmc.program_id = :program_id
            AND (vmc.rate_model = :rate_model OR vmc.rate_model IS NULL)
            AND (vmc.hierarchy IN (:hierarchy) OR vmc.hierarchy IS NULL)
            AND (vmc.program_industry = :program_industry OR vmc.program_industry IS NULL)
            AND (vmc.job_type = :job_type OR vmc.job_type IS NULL)
            AND (vmc.job_template = :job_template OR vmc.job_template IS NULL)
            AND (vmc.rate_type = :rate_type OR vmc.rate_type IS NULL)
            AND (vmc.work_location = :work_location OR vmc.work_location IS NULL)
        LIMIT 1`;

        const markupData = await sequelize.query(sql, {
            replacements: { program_id: markupDetail.program_id, program_industry: markupDetail.program_industry, hierarchy: markupDetail.hierarchy, rate_model: markupDetail.rate_model },
            type: QueryTypes.SELECT,
            raw: true,
        });

        return markupData;
    }

    static async findUser(program_id: string, userId: string): Promise<any> {
        const userHierarchyData = await sequelize.query(
            `SELECT 
             u.user_type, 
             u.tenant_id, 
             u.is_all_hierarchy_associate, 
             u.associate_hierarchy_ids
           FROM user AS u
           WHERE u.user_id = :userId AND u.program_id = :program_id`,
            {
                replacements: { program_id, userId },
                type: QueryTypes.SELECT,
            }
        );

        return userHierarchyData;
    }

    static async getUserHierarchyData(program_id: string, user: any) {
        const userId = user.sub;
        console.log("userId",userId)
        let userType = user.userType;
        let userData: any;
        let mspHierarchyIds: string[] | undefined = undefined;

        if (!userType) {
            userData = await this.findUser(program_id, userId);
            if (userData && userData[0].user_type.toUpperCase() === 'MSP') {
                if (userData[0].is_all_hierarchy_associate) {
                    const hierarchies: any[] = await sequelize.query(
                        `
                    SELECT id FROM hierarchies 
                    WHERE program_id = :program_id 
                      AND managed_by = :tenant_id
                    `,
                        {
                            replacements: { program_id, tenant_id: userData[0].tenant_id },
                            type: QueryTypes.SELECT,
                        }
                    );
                    mspHierarchyIds = hierarchies.map(h => h.id);
                } else {
                    mspHierarchyIds = userData[0].associate_hierarchy_ids;
                }
            }
        }
        console.log("mspHierarchyIds", mspHierarchyIds);
        return { mspHierarchyIds };
    }
}

export default GlobalRepository;