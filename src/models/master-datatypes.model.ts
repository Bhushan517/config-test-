import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";

class FoundationalDataTypes extends Model {
  id: any;
  name: any;
}

FoundationalDataTypes.init(
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
    description: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    configuration: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    associations: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    timesheet_master_data: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_all_hierarchy_associated: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    seq_number:{
      type:DataTypes.INTEGER,
      allowNull:true
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
    tableName: "master_data_type",
    timestamps: false,
    hooks: {
      beforeValidate: (instance) => {
        convertEmptyStringsToNull(instance);
      }
    },
  }
);

sequelize.sync();
FoundationalDataTypes.belongsTo(Programs, {
  foreignKey: "program_id",
  as: "programs",
});

export default FoundationalDataTypes;
