import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import TimesheetExpenseRuleModel from './timesheet-expense-rule.model';

class TimesheetExpenseRuleMapping extends Model {
    expense_rule_id: any;

}

TimesheetExpenseRuleMapping.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        expense_rule_group_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        expense_rule_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: TimesheetExpenseRuleModel,
                key: 'id',
            },
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'programs',
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
        tableName: 'timesheet_expense_rule_mapping',
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

TimesheetExpenseRuleMapping.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
TimesheetExpenseRuleMapping.belongsTo(TimesheetExpenseRuleModel, { foreignKey: 'expense_rule_id', as: 'expense_rule' });

export default TimesheetExpenseRuleMapping;
