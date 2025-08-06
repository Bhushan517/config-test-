import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";

class RateConfigurationRateDifferentials extends Model {
    differential_on: any;
    differential_value: any;
    differential_type: any;
}

RateConfigurationRateDifferentials.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        rate_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        differential_on: {
            type: DataTypes.STRING,
            allowNull: true
        },
        differential_type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        differential_value: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        unit_of_measure: {
            type: DataTypes.STRING,
            allowNull: true
        },
        currency: {
            type: DataTypes.STRING,
            allowNull: true
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
        tableName: "rate_configuration_rate_differentials",
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
export default RateConfigurationRateDifferentials;