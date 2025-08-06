import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";
import { Model, DataTypes } from "sequelize";

class ShiftConfigurationHierarchies extends Model {
  hierarchy_id: any;
  shift_config_id!: string;
  id: any;

}
ShiftConfigurationHierarchies.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  shift_config_id: {
    type: DataTypes.UUID,
    allowNull: true,

  },
  hierarchy_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  

}, {

  sequelize,
  tableName: 'shift_configuration_hierarchies',
  timestamps: false,
  hooks: {
    beforeValidate: convertEmptyStringsToNull,
    beforeSave: beforeSave,
  },
}
);
sequelize.sync();

export default ShiftConfigurationHierarchies;