import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import Tenant from "./tenant.model";
import { Programs } from './programs.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';

class VendorMarkupConfig extends Model {
    id: any;
    rate_model: any;
    sliding_scale: any;
    markup_config: any;
    sourced_markup: any;
    payrolled_markup: any;
    labor_category: any;
    hierarchy: any;
    work_locations: any;
    is_default: any;
    created_on: any;
    program_vendor_id: any;
    program_industry: any;
    markups: never[] | undefined;
    is_enabled: any;
    sourced_markup_min!: string;
    sourced_markup_max!: string;
    payrolled_markup_min!: string;
    sourced_markup_avg!: string;
    payrolled_markup_max!: string;
    payrolled_markup_avg!: string;
    is_all_hierarchy!: boolean;
    is_all_work_locations !: boolean;
    is_all_labor_category!: boolean;
}

VendorMarkupConfig.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: Tenant,
                key: 'id',
            },
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: Programs,
                key: 'id',
            },
        },
        program_vendor_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        rate_model: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        sliding_scale: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        markups: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        program_industry: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        hierarchy: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        work_locations: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        is_default: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        job_type: {
            type: DataTypes.UUID,
            allowNull: true
        },
        job_template: {
            type: DataTypes.UUID,
            allowNull: true
        },
        worker_type: {
            type: DataTypes.UUID,
            allowNull: true
        },
        worker_classification: {
            type: DataTypes.UUID,
            allowNull: true
        },
        rate_type: {
            type: DataTypes.UUID,
            allowNull: true
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
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
        }
    },
    {
        sequelize,
        tableName: 'vendor_markup_config',
        timestamps: false,
        hooks: {
            beforeValidate: (instance) => {
                convertEmptyStringsToNull(instance);
            },
            beforeSave: (instance) => {
                beforeSave(instance);
            },
        },
    }
);

VendorMarkupConfig.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
VendorMarkupConfig.belongsTo(Programs, { foreignKey: "program_id", as: "programs" });

export default VendorMarkupConfig;
