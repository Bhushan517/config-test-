import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import hierarchies from "./hierarchies.model";

class RateConfigurationHierarchies extends Model {
    hierarchy: any;
    rate_configuration_id: any;
}

RateConfigurationHierarchies.init(
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
        hierarchy_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: hierarchies,
                key: 'id',
            }
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
        tableName: "rate_configuration_hierarchies",
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
RateConfigurationHierarchies.belongsTo(hierarchies, { foreignKey: 'hierarchy_id', as: 'hierarchy' });
export default RateConfigurationHierarchies;