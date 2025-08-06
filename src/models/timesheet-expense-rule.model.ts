import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from "./programs.model";

class TimesheetExpenseRuleModel extends Model {
    id: any;
    apply_rate_type: any;
    rate_type: any;
    penalty_rules: any;
}

TimesheetExpenseRuleModel.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    rule_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    rule_type: {
        type: DataTypes.STRING,
        allowNull: true
    },
    rule_duration: {
        type: DataTypes.STRING,
        allowNull: true
    },
    break_type: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_paid_break: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_mandatory_break: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    rule_category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    weekend_days: {
        type: DataTypes.JSON,
        allowNull: true
    },
    conditions: {
        type: DataTypes.JSON,
        allowNull: true
    },
    penalty_rules: {
        type: DataTypes.JSON,
        allowNull: true
    },
    is_penalty_rule_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    apply_rate_type: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    expense_line_item: {
        type: DataTypes.JSON,
        allowNull: true,
    },

    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },

    program_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Programs,
            key: 'id',
        },
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
        modelName: 'timesheet_expense_rule',
        timestamps: false,
        hooks: {
            beforeValidate: (instance) => {
                convertEmptyStringsToNull(instance);
            },
            beforeSave: (instance) => {
                beforeSave(instance);
            },
        },
    });

sequelize.sync();
TimesheetExpenseRuleModel.belongsTo(Programs, { foreignKey: "program_id", as: "programs" });
export default TimesheetExpenseRuleModel;


