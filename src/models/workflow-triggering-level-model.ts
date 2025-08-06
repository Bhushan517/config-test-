import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";

class WorkflowTriggeredLevel extends Model {
    id: any;
    workflow_trigger_id?: any;
    job_id?: any
}

WorkflowTriggeredLevel.init(
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
        tableName: "workflow_triggered_level",
        timestamps: false,
    }
);

sequelize.sync();
WorkflowTriggeredLevel.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});

export default WorkflowTriggeredLevel;
