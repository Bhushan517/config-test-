import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';

class TimesheetExpenseRuleGroup extends Model {
    id: any;
    expenseRules: any;
    timesheet_expense_rules: never[] | undefined;
    rule_group_name: any;

}

TimesheetExpenseRuleGroup.init(
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
            references: {
                model: Programs,
                key: 'id',
            },
        },
        rule_group_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        rule_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        rule_category: {
            type: DataTypes.STRING,
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
        created_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
            allowNull: true,
        },
        updated_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
            allowNull: true,
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
        modelName: 'TimesheetExpenseRuleGroup',
        tableName: 'timesheet_expense_rule_groups',
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
TimesheetExpenseRuleGroup.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});


export default TimesheetExpenseRuleGroup;


