import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Module } from "./module.model";
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import generateSlug from '../plugins/slugGenerate';

class Event extends Model {
  id: any;
  name: any;
  slug: any;
}

Event.init(
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
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    module_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Module,
        key: 'id',
      },
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
    }
  },
  {
    sequelize,
    tableName: 'event',
    timestamps: false,
    hooks: {
      beforeValidate: (instance) => {
        convertEmptyStringsToNull(instance);
      },
      beforeSave: (instance) => {
        beforeSave(instance);
        if (instance.name) {
          instance.slug = generateSlug(instance.name, {
            lowercase: true,
            removedspecial: true,
            replacewithhyphens: false
          });
        }
      },
    },
  }
);

Event.belongsTo(Module, { foreignKey: "module_id", as: "module" });

export default Event;
