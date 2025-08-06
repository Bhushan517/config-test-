import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import WorkflowLevel from "./workflow-level-model.model";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";

class WorkflowLevelCondition extends Model { }

WorkflowLevelCondition.init(
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
        source_field_meta: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        target_field_value: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        level_id: {
            type: DataTypes.UUID,
            references: {
                model: "workflow_level",
                key: "id",
            },
        },
        operator_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        program_id: {
            type: DataTypes.UUID,
            references: {
                model: "programs",
                key: "id",
            },
        },
        indent: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        field_config_id: {
            type: DataTypes.UUID,
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
        tableName: "workflow_level_condition",
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
WorkflowLevelCondition.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});

WorkflowLevelCondition.belongsTo(WorkflowLevel, {
    foreignKey: "level_id",
    as: "workflow-level",
});

export default WorkflowLevelCondition;
