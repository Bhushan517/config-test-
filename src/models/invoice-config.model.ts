import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import generateSlug from '../plugins/slugGenerate';
import { beforeSave } from '../hooks/timeFormatHook';

class InvoiceConfigModel extends Model {
    id: any;
    uuid: any;
    name: any;
    slug: any;
    parent_id: any;
    hierarchy_ids: any;
    root_parent_id: any;

}

InvoiceConfigModel.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'programs',
                key: 'id'
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        parent_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        root_parent_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        is_all_hierarchy_associate: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        hierarchy_ids: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        consolidation_type: {
            type: DataTypes.ENUM('manual', 'automatic'),
            allowNull: true,
        },
        consolidation_day: {
            type: DataTypes.ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
            allowNull: true,
        },
        consolidation_cycle: {
            type: DataTypes.ENUM('weekly'),
            allowNull: true,
        },
        billing_period_start_day: {
            type: DataTypes.ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
            allowNull: true,
        },
        consolidation_billing_period: {
            type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
            allowNull: true,
        },
        consolidate_till_date: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        consolidation_generation_time: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        rollup_group: {
            type: DataTypes.ENUM('hierarchy', 'vendor', 'program', 'hierarchy_vendor'),
            allowNull: true,
        },
        consolidated_start_number: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        batch_start_number: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        template_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        template_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        template_formats: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        invoice_from: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        invoice_to: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        payment_authorization_enable: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        rollback_enable: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        rollback_config: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        transaction_complete_enable: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        transaction_complete_type: {
            type: DataTypes.ENUM('manual', 'automatic', 'scheduled'),
            allowNull: true,
        },
        transaction_complete_cycle: {
            type: DataTypes.ENUM('weekly', 'daily'),
            allowNull: true,
        },
        transaction_complete_start_day: {
            type: DataTypes.ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
            allowNull: true,
        },
        transaction_complete_time: {
            type: DataTypes.TIME,
            allowNull: true,
        },
        transaction_complete_notes_enable: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        voucher_start_number: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
        enable_timesheet_consolidation: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        enable_expense_consolidation: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        enable_misc_expense_consolidation: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        enable_cancel_consolidation: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        credit_debit: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
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
        tableName: "invoice_config",
        timestamps: false,
        hooks: {
            beforeValidate: (instance) => {
                convertEmptyStringsToNull(instance);
            },
            beforeSave: async (instance) => {
                beforeSave(instance);
                if (instance.name) {
                    instance.slug = generateSlug(instance.name, {
                        lowercase: true,
                        removedspecial: true,
                        replacewithhyphens: true
                    });
                }
            }
        }
    }
);
sequelize.sync();

export default InvoiceConfigModel;
