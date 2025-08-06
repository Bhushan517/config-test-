import { Model, DataTypes } from 'sequelize';
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { beforeSave } from "../hooks/timeFormatHook";

export class VendorDistributionSchedule extends Model {
  public name!: string;
  public description!: string;
  public is_enabled!: boolean;
  public created_by!: string;
  public updated_by!: string;
  public created_on!: bigint;
  public schedules!: {
    duration: number;
    measure_unit: string;
    vendors?: string[];
  }[];
  id: any;
  distScheduleDetails: any;
}

VendorDistributionSchedule.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
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
}, {
  sequelize,
  modelName: "vendor_distribution_schedules",
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
VendorDistributionSchedule.belongsTo(Programs, { foreignKey: "program_id" });
export default VendorDistributionSchedule;