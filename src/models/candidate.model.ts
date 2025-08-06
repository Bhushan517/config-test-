import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from "./programs.model"
import countriesModel from "./countries.model";
import Tenant from "./tenant.model";
import JobCategoryModel from "./job-category.model";
import IndustriesModel from "./labour-category.model";
import JobTemplateModel from "./job-template.model";
class Candidate extends Model {
    id: any;
    qualifications: any;
    tenant_id: any;
    vendor_id: any;
    candidate_id!: string;
    user_id: any;
}

Candidate.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "tenant",
                key: "id",
            },
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        resume_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        worker_type_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        candidate_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        avatar: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        name_prefix: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        candidate_source: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        first_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        middle_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        last_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name_suffix: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        user_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        birth_date: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        country_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "countries",
                key: "id",
            },
        },
        vendor_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        job_level: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        npi: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        job_category: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "labour_category",
                key: "id",
            },
        },
        job_title: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "job_templates",
                key: "id",
            },
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_pre_identified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        contacts: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        is_all_required_qualification: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        addresses: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        qualifications: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        // custom_fields: {
        //     type: DataTypes.JSON,
        //     allowNull: true,
        // },
        do_not_rehire: {
            type: DataTypes.TINYINT,
            allowNull: true,
            defaultValue: false
        },
        do_not_rehire_reason: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        do_not_rehire_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        state_national_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        unique_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        ssn_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        created_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
        },
        updated_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now()
        },
        created_by: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        updated_by: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
    },
    {
        sequelize: sequelize,
        tableName: "candidates",
        timestamps: false,
        hooks: {
            beforeSave: (instance) => {
                beforeSave(instance);
            },
        }
    }
);

Candidate.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
Candidate.belongsTo(countriesModel, { foreignKey: 'country_id', as: 'country' });
Candidate.belongsTo(IndustriesModel, { foreignKey: 'job_category', as: 'labour_category' });
Candidate.belongsTo(JobTemplateModel, { foreignKey: 'job_title', as: 'job_templates' });
Candidate.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
export default Candidate;
