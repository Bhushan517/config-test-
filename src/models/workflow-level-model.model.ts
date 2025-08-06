import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import Workflow from "./workflow.model";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";

class WorkflowLevel extends Model {
    id: any;
}

WorkflowLevel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        placement_order: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
                model: "workflow_config",
                key: "id",
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
        tableName: "workflow_level",
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
WorkflowLevel.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});

WorkflowLevel.belongsTo(Workflow, {
    foreignKey: "workflow_id",
    as: "workflow_config",
});

export default WorkflowLevel;
