import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import Event from "./event.model";
import { Module } from "./module.model";

class JobWorkFlowModel extends Model {
  id!: string;
  event_id: any;
  method_id: any;
  module: any;
  levels: any;
  flow_count!: number
  workflow_id: any;
  program_id!: string;
  code!: string;
  hierarchies: any;
  event: any;
  moduleDetail: any;
  job_id!: string;
  status!:string;
}

JobWorkFlowModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "pending",
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    events: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    flow_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    event_title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    workflow_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    workflow_trigger_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    module_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    method_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    job_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    candidate_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    hierarchies: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    placement_order: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    module: {
      type: DataTypes.UUID,
      allowNull: true
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
    is_updated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    levels: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    manager: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: true,
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
    unique_key: {
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
    tableName: "workflow",
    timestamps: false,
    hooks: {
      // beforeValidate: async (instance) => {
      //   if (!instance.code && instance.program_id) {
      //     const program = await Programs.findByPk(instance.program_id);
      //     if (program?.unique_id) {
      //       const programPrefix = program.unique_id.substring(0, 3).toUpperCase();
      //       const count = await JobWorkFlowModel.count();
      //       const sequence = (count + 1).toString().padStart(5, '0');
      //       instance.code = `${programPrefix}-AF-${sequence}`;
      //     }
      //   }
      // }

    },
  }
);

sequelize.sync();
JobWorkFlowModel.belongsTo(Programs, {
  foreignKey: "program_id",
  as: "programs",
});
JobWorkFlowModel.belongsTo(Event, {
  foreignKey: "event_id",
  as: "event",
});
JobWorkFlowModel.belongsTo(Module, {
  foreignKey: "module",
  as: "moduleDetail",
});
export default JobWorkFlowModel;