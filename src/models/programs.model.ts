
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import Tenant from "./tenant.model";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import { createProgramModule, createHierarchy, createQualificationTypes, createRateTypes } from "../hooks/afterProgramSave";

class Programs extends Model {
  unique_id: any;
  name: any;
  id: any;
  display_name: any;
  created_on: any;
}

Programs.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    display_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    unique_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    industries: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    config: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    client_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "tenant",
        key: "id",
      },
    },
    msp_id: {
      type: DataTypes.UUID,
      references: {
        model: "tenant",
        key: "id",
      },
      allowNull: true,
      validate: {
        notEmpty: true,
      },
    },
    start_date: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_activated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    ref_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    decoration: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    tableName: "programs",
    timestamps: false,
    hooks: {
      beforeValidate: (instance) => {
        convertEmptyStringsToNull(instance);
      },
      beforeSave: (instance) => {
        beforeSave(instance);

      },
      afterSave: async (instance, options) => {
        const transaction = options.transaction;

        await createProgramModule(instance, transaction);
        await createHierarchy(instance, transaction);
        await createQualificationTypes(instance, transaction);
        await createRateTypes(instance, transaction);
      }
    },
  }
);



Programs.belongsTo(Tenant, { foreignKey: "client_id", as: "client" });
Programs.belongsTo(Tenant, { foreignKey: "msp_id", as: "msp" });
sequelize.sync();
export { Programs };