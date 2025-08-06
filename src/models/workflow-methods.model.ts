import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";
import { Module } from "./module.model";
import Event from "./event.model";

class WorkflowMethod extends Model {
    id: any;
}

WorkflowMethod.init(
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
        description: {
            type: DataTypes.STRING,
            allowNull: true,
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
        tableName: "workflow_methods",
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
WorkflowMethod.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});
WorkflowMethod.belongsTo(Module, {
    foreignKey: "module_id",
    as: "module",
});
WorkflowMethod.belongsTo(Event, {
    foreignKey: "event_id",
    as: "event",
});

export default WorkflowMethod;
