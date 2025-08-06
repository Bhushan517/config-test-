import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";
class CountryModel extends Model {
  id: any;
  name: any;
  user_id: any;
}

CountryModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: DataTypes.CHAR(100),
    allowNull: false,
  },
  isd_code: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  iso_code_2: {
    type: DataTypes.CHAR(2),
    allowNull: false,
  },
  iso_code_3: {
    type: DataTypes.CHAR(3),
    allowNull: false,
  },
  min_phone_length: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  max_phone_length: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
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
    modelName: 'countries',
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


export default CountryModel;