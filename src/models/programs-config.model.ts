import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";

class ProgramsConfig extends Model {
  id: any;
  configuration_id: any;
  value: any;
}

ProgramsConfig.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "programs",
        key: "id",
      },
    },
    config_model: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    key: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    data_type: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    value: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    value_source: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    source_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    source_params: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_requried: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    is_validations_requried: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    parent_config_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    is_parent_value_required: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    parent_value: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    ui_component_type: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    sr_Number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    options: {
      type: DataTypes.JSON,
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    child_config: {
      type: DataTypes.JSON,
      allowNull: true
    },
    configuration_id: {
      type: DataTypes.UUID,
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
    tableName: "programs_config",
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

ProgramsConfig.belongsTo(Programs, { foreignKey: "program_id", as: "programs" });

export default ProgramsConfig;
