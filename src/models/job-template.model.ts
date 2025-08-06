import { DataTypes, Model } from "sequelize";
import { sequelize } from '../config/instance';
import jobCategoryModel from "./job-category.model";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import JobTempletRepository from "../hooks/job-template-query";
const jobTempletRepositories = new JobTempletRepository();
class JobTemplateModel extends Model {
    id: any;
    job_id: any;
    job_category: any;
    program_id: any;
    template_name: any;
    job_submitted_count: number | undefined;
    custom_field_id: any;
    is_automatic_distribution: any;
    is_automatic_distribute_submit: any;
    labour_category: any;
    is_tiered_distribute_schedule: any;
  is_all_hierarchy_associated: any;
}

JobTemplateModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true
        },
        template_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        job_type: {
            type: DataTypes.JSON,
            allowNull: true
        },
        category: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: jobCategoryModel,
                key: 'id'
            }
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        checklist_entity_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        checklist_version: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        template_code: {
            type: DataTypes.STRING,
            allowNull: true
        },
        level: {
            type: DataTypes.NUMBER,
            allowNull: true
        },
        labour_category: {
            type: DataTypes.UUID,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        description_url: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null
        },
        is_submission_exceed_max_bill_rate: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true
        },
        allow_express_offer: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true
        },
        is_qualification_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true
        },
        user_roles: {
            type: DataTypes.JSON,
            allowNull: true
        },
        is_onboarding_checklist: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        available_start_date: {
            type: DataTypes.JSON,
            allowNull: true
        },
        submission_limit_vendor: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        is_expense_allowed_editable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true
        },
        is_expense_allowed: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true
        },
        is_resume_mandatory: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true
        },
        allow_user_description: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true
        },
        is_description_editable: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true
        },
        job_submitted_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_shift_rate: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        primary_hierarchy: {
            type: DataTypes.UUID,
            allowNull: true
        },
        is_description_required: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        is_checklist_enable: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        is_description_upload_required: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        default_hours_per_day: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        default_hours_per_shift: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        default_working_day_per_week: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        default_shift_per_week: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        // is_available_start_date: {
        //     type: DataTypes.BOOLEAN,
        //     allowNull: true
        // },
        is_country_mandatory: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        is_address_mandatory: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        default_expense_value: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        allow_pre_identified_candidate: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        is_tiered_distribute_submit: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_manual_distribute_submit: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_automatic_distribution: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_distribute_final_approval: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_review_configured_or_submit: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        job_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        ot_exempt: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        available_start_date_limit: {
            type: DataTypes.JSON
        },
        submit_type: {
            type: DataTypes.STRING
        },
        distribution_schedule: {
            type: DataTypes.UUID,
            allowNull: true
        },
        is_all_hierarchy_associated:{
           type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        created_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
            allowNull: true
        },
        updated_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
            allowNull: true
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "job_templates",
        timestamps: false,
        hooks: {
            beforeValidate: async (instance) => {
                convertEmptyStringsToNull(instance);
                if (!instance.job_id && instance.program_id) {
                    const programData = await jobTempletRepositories.programQuery(
                        instance.program_id
                    );
                    if (programData.length > 0 && programData[0].unique_id) {
                        const programPrefix = programData[0].unique_id
                            .substring(0, 3)
                            .toUpperCase();
                        const count = await JobTemplateModel.count({ where: { program_id: instance.program_id } });
                        const sequence = (count + 1).toString().padStart(3, "0");
                        instance.job_id = `${programPrefix}-JT-${sequence}`;
                    }
                }
            },

        },
    }

);

sequelize.sync();

JobTemplateModel.belongsTo(jobCategoryModel, { foreignKey: "category", as: "job_category" });
export default JobTemplateModel;
