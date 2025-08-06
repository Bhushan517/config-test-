import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";
import { Programs } from "./programs.model";
import WorkflowLevel from "./workflow-level-model.model";
import RecipientType from "./recipient-types.model";

class WorkflowRecipientType extends Model { }

WorkflowRecipientType.init(
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
                model: "workflow_level",
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
            allowNull: false,
            references: {
                model: "recipient_type",
                key: "id",
            },
        },
        behaviour: {
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
        tableName: "workflow_recepient_type",
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
WorkflowRecipientType.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});

WorkflowRecipientType.belongsTo(WorkflowLevel, {
    foreignKey: "level_id",
    as: "workflow_level",
});

WorkflowRecipientType.belongsTo(RecipientType, {
    foreignKey: "recipient_type_id",
    as: "recipient_type",
});

export default WorkflowRecipientType;
