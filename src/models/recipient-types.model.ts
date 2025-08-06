import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";
import Event from "./event.model";
import { Module } from "./module.model";

class RecipientType extends Model {
    id: any;
    name: any
    parameter_schema: any;
}

RecipientType.init(
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
        event_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "event",
                key: "id",
            },
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        meta_data: {
            type: DataTypes.JSON,
            allowNull: true
        },
        is_chain: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        parameter_schema: {
            type: DataTypes.JSON,
            allowNull: true
        },
        method_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        module_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "module",
                key: "id",
            },
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
        tableName: "recipient_type",
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
RecipientType.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});
RecipientType.belongsTo(Event, {
    foreignKey: "event_id",
    as: "event",
});
RecipientType.belongsTo(Module, {
    foreignKey: "module_id",
    as: "module",
});

export default RecipientType;
