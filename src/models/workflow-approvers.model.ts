import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";
import WorkflowMethod from "./workflow-methods.model";
import { Programs } from "./programs.model";
import { Module } from "./module.model";
import Event from "./event.model";
import Workflow from "./workflow.model";

class WorkFlowApprover extends Model { }

WorkFlowApprover.init(
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
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "programs",
                key: "id",
            },
        },
        workflow_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "workflow",
                key: "id",
            },
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
        method_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "workflow_methods",
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
        tableName: "workflow_approvers",
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
WorkFlowApprover.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});
WorkFlowApprover.belongsTo(Module, {
    foreignKey: "module",
    as: "Module",
});
WorkFlowApprover.belongsTo(Event, {
    foreignKey: "event_id",
    as: "event",
});
WorkFlowApprover.belongsTo(WorkflowMethod, {
    foreignKey: "method_id",
    as: "method",
});
WorkFlowApprover.belongsTo(Workflow, {
    foreignKey: "workflow_id",
    as: "workflow",
});

export default WorkFlowApprover;
