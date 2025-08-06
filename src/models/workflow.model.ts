import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";
import Event from "./event.model";
import { Module } from "./module.model";
import WorkflowMethod from "./workflow-methods.model";

class Workflow extends Model {
    event_id: any;
    method_id: any;
    module: any;
    levels: any;
    flow_count!: number
    workflow_id: any;
    program_id!: string;
    code!: string
    hierarchies: any;
    id: any;
    name: any;
    placement_order!: number;
    flow_type!: string
}

Workflow.init(
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
        flow_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        workflow_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        method_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "workflow_methods",
                key: "id",
            },
        },
        hierarchies: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        is_associated_to_all_hierarchy: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        placement_order: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        module: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "module",
                key: "id",
            },
        },
        initialTrigger: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        config: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        levels: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "programs",
                key: "id",
            },
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        flow_count: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        code: {
            type: DataTypes.STRING,
            allowNull: true
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
        tableName: "workflow_config",
        timestamps: false,
        hooks: {
            beforeValidate: async (instance) => {
                convertEmptyStringsToNull(instance);
                if (!instance.code && instance.program_id) {
                    const program = await Programs.findByPk(instance.program_id);
                    if (program && program.unique_id) {
                        const programPrefix = program.unique_id.substring(0, 3).toUpperCase();
                        const count = await Workflow.count();
                        const sequence = (count + 1).toString().padStart(5, '0');
                        instance.code = `${programPrefix}-AF-${sequence}`;
                    }
                }
            },
            beforeSave: (instance) => {
                beforeSave(instance);
            },
        },
    }
);

sequelize.sync();
Workflow.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});
Workflow.belongsTo(Module, {
    foreignKey: "module",
    as: "Module",
});
Workflow.belongsTo(Event, {
    foreignKey: "event_id",
    as: "event",
});
Workflow.belongsTo(WorkflowMethod, {
    foreignKey: "method_id",
    as: "method",
});

export default Workflow;
