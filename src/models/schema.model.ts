import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";
import { Module } from "./module.model";
import Event from "./event.model";

class Schema extends Model {
    id?: string;
    name?: string
}

Schema.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: true
        },
        field_config: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        ruleFieldInitialTriggerConfigs: {
            type: DataTypes.JSON,
            allowNull: true
        },
        ruleFieldInputConfigs: {
            type: DataTypes.JSON,
            allowNull: true
        },
        ruleFieldOutputConfigs: {
            type: DataTypes.JSON,
            allowNull: true
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        module_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "module",
                key: "id",
            },
        },
        event_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "event",
                key: "id",
            },
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
        },
    },
    {
        sequelize,
        tableName: "workflow_field_conditions",
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
Schema.belongsTo(Module, {
    foreignKey: "module_id",
    as: "module",
});
Schema.belongsTo(Event, {
    foreignKey: "event_id",
    as: "event",
});

export default Schema;
