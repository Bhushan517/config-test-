import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import User from "./user.model";
import { Programs } from "./programs.model";
import { beforeSave } from "../hooks/timeFormatHook";
import Tenant from "./tenant.model";


class ProgramVendor extends Model {
    program_id: any;
    vendor_type: any;
    program_industry: any;
    work_locations: any;
    id: any;
    rate_model: any;
    vendor_name: any;
    is_labour_category: any;
    supl_ref_id: any;
    background_logo_color: any;
    hierarchies: any;
    all_hierarchy: any;
    all_job_type: any;
    vendor_group_id: any;
    com_doc_group: any;
    bussiness_structure: any;
    is_deleted: any;
    job_type: any;
    created_by: any;
    updated_by: any;
    markup_config: any;
    tenant_id: any;
    all_work_locations: any;
    addresses: any;
    contact: any;
    description: any;
    company_website: any;
    establish_year: any;
    social_media: any;
    status: any;
    vendor_code!: string;
    display_name: any;
    compliance_status!: { status: string; is_audited: any; is_compliant: any; };
    diversity_details: any;
    vendor_id: any;
    user_id: any;
}
ProgramVendor.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        vendor_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        vendor_type: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        supl_ref_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        program_industry: {
            type: DataTypes.JSON,
            allowNull: true
        },
        work_locations: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        vendor_code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        hierarchies: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        all_work_locations: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true,
        },
        all_hierarchy: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        vendor_group_id: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        com_doc_group: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        background_logo_color: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        bussiness_structure: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        job_type: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        all_job_type: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_labour_category: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        },
        display_name: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: false
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "programs",
                key: "id",
            }
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "tenant",
                key: "id",
            }
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        status: {
            type: DataTypes.ENUM("Active", "Inactive", "Pending Setup"),
            defaultValue: "Pending Setup",
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        company_website: {
            type: DataTypes.STRING,
            allowNull: true
        },
        establish_year: {
            type: DataTypes.STRING,
            allowNull: true
        },
        vendor_logo: {
            type: DataTypes.STRING,
            allowNull: true
        },
        social_media: {
            type: DataTypes.JSON,
            allowNull: true
        },
        addresses: {
            type: DataTypes.JSON,
            allowNull: true
        },
        contact: {
            type: DataTypes.JSON,
            allowNull: true
        },
        diversity_details: {
            type: DataTypes.JSON,
            allowNull: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "user",
                key: "user_id",
            }
        },
        compliance_status: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {
                is_compliant: false,
                status: 'PENDING',
                is_audited: false
            }
        },
        job: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "0"
        },
        job_title: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        candidate: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "0"
        },
        is_job_auto_opt_in: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
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
        modelName: "program_vendors",
        timestamps: false,
        hooks: {
            beforeSave: (instance) => {
                beforeSave(instance);
            },
        },
    }
);
sequelize.sync()

ProgramVendor.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "program",
});
ProgramVendor.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
});
ProgramVendor.belongsTo(Tenant, {
    foreignKey: "tenant_id",
    as: "tenant",
});

export { ProgramVendor };
