import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";

class CustomFieldMaterData extends Model {
  id: any;
  custom_field_id: any;
  master_data_id: any;
}

CustomFieldMaterData.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    custom_field_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    master_data_id: {
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
    tableName: 'custom_fields_master_data',
    timestamps: false,
    hooks: {
      beforeValidate: convertEmptyStringsToNull,
      beforeSave: beforeSave,
    },
  }
);

export default CustomFieldMaterData;