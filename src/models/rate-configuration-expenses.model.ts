import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import ExpenseTypeModel from "./expense-type.model";

class RateConfigurationExpenses extends Model {
    expense_type: any;
    rate_configuration_id: any;
}

RateConfigurationExpenses.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        rate_configuration_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        expense_type_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: ExpenseTypeModel,
                key: 'id',
            }
        },
        unit_of_measure: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        unit_lable: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        rate: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        max_limit: {
            type: DataTypes.FLOAT,
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
        tableName: "rate_configuration_expenses",
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

sequelize.sync();
RateConfigurationExpenses.belongsTo(ExpenseTypeModel, { foreignKey: 'expense_type_id', as: 'expense_type' });
export default RateConfigurationExpenses;