import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import rateType from "./rate-type.model";

class RateConfigurationBaseRateTypes extends Model {
    id: any;
    rate_type: any;
    rates: any;
}

RateConfigurationBaseRateTypes.init(
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
        rate_type_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: rateType,
                key: 'id',
            }
        },
        seq_number: {
            type: DataTypes.NUMBER,
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
        tableName: "rate_configuration_base_rate_types",
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
RateConfigurationBaseRateTypes.belongsTo(rateType, { foreignKey: 'rate_type_id', as: 'rate_type' });
export default RateConfigurationBaseRateTypes;