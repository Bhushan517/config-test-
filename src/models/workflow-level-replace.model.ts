import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";
import { Programs } from "./programs.model";
import Workflow from "./workflow.model";


class WorkflowLevelReplace extends Model { }

WorkflowLevelReplace.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        program_id: {
            type: DataTypes.UUID,
            references: {
                model: "programs",
                key: "id",
            },
        },
        workflow_id: {
            type: DataTypes.UUID,
            references: {
                model: "workflow",
                key: "id",
            },
        },
        user_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        notes: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        placement_order: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
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
        tableName: "workflow_level_replace",
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
WorkflowLevelReplace.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});

WorkflowLevelReplace.belongsTo(Workflow, {
    foreignKey: "workflow_id",
    as: "workflow",
});
export default WorkflowLevelReplace;
