import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import WorkflowLevel from "./workflow-triggering-level-model";

class WorkflowTriggeredRecipientType extends Model { }

WorkflowTriggeredRecipientType.init(
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
        meta_data: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        level_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "workflow_triggered_level",
                key: "id",
            },
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "programs",
                key: "id",
            },
        },
        recipient_type_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        behaviour: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        workflow_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        workflow_trigger_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        job_id: {
            type: DataTypes.STRING,
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
        tableName: "workflow_triggered_recepient",
        timestamps: false,
    }
);

sequelize.sync();
WorkflowTriggeredRecipientType.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});

WorkflowTriggeredRecipientType.belongsTo(WorkflowLevel, {
    foreignKey: "level_id",
    as: "workflow_triggered_level",
});

export default WorkflowTriggeredRecipientType;
