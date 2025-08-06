import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";
import WorkflowField from "./workflow-field.model";

class WorkflowFieldConfig extends Model { }

WorkflowFieldConfig.init(
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
            allowNull: false,
        },
        config: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        placement_order: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        nest_level: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        field_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "workflow_field",
                key: "id",
            },
        },
        parent_config_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        schema_id: {
            type: DataTypes.STRING,
            allowNull: true
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
        tableName: "workflow_field_config",
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
WorkflowFieldConfig.belongsTo(WorkflowField, {
    foreignKey: "field_id",
    as: "field",
});

export default WorkflowFieldConfig;
