import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import stateModel from "./state.model";
import countyModel from "./county.model";

class CityModel extends Model {
  [x: string]: any;
}

CityModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  state_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: stateModel,
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  },
  county_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: countyModel,
      key: "id"
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  ref_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  created_on: {
    type: DataTypes.BIGINT.UNSIGNED,
    defaultValue: Date.now(),
    allowNull: true,
  },
  updated_on: {
    type: DataTypes.BIGINT.UNSIGNED,
    defaultValue: Date.now(),
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: "city",
  timestamps: false,
  hooks: {
    beforeValidate: (instance) => {
      convertEmptyStringsToNull(instance);
    },
    beforeSave: (instance) => {
      beforeSave(instance);
    },
  },
});

CityModel.belongsTo(stateModel, { foreignKey: "state_id", as: "state" });
CityModel.belongsTo(countyModel, { foreignKey: "county_id" });

export default CityModel;
