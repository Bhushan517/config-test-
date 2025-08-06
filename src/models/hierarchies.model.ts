import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";

class Hierarchies extends Model {
  parent_hierarchy_id: any;
  name: any;
  id: any;
  is_enabled: any;
  rate_model!: any;
  program_id!: string;
  code: any;
  managed_by!: string;
  default_date_format : any;
}
Hierarchies.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    parent_hierarchy_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rate_model: {
      type: DataTypes.ENUM(
        'bill_rate',
        'markup',
        'pay_rate'
      ),
      allowNull: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    support_email: {
      type: DataTypes.STRING,
      allowNull: true,
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
    unit_of_measure: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    default_timezone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    default_date_format: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    default_time_format: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    default_currency: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    default_language: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_vendor_neutral_program: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_hide_candidate_img: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    manage_tax: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    manage_adjustment: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    custom_fields: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_not_editable: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    address:{
      type: DataTypes.JSON,
      allowNull: true,
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
    managed_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "hierarchies",
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

export default Hierarchies;
