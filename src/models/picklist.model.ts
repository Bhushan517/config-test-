import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/instance';
import picklistAttributes from '../interfaces/picklist.interface';
import picklistItemModel from './picklist-item.model';
import { Programs } from './programs.model';
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";

interface PicklistCreationAttributes extends Optional<picklistAttributes, 'id'> { }

class PicklistModel extends Model<picklistAttributes, PicklistCreationAttributes> implements picklistAttributes {
  public id!: string;
  public picklist_id!: string | null;
  public name!: string;
  public program_id!: string;
  public description!: string | null;
  public is_enabled!: boolean;
  public is_deleted!: boolean;
  public created_on!: bigint;  
  public updated_on!: bigint;
  public created_by!: string | null;
  public updated_by!: string | null;
  public defined_by!: string;
  public multiselect!: boolean;
  public slug?: string | null;
  public disabled_program?: object | null;
  public is_visible!: boolean;
  picklistItems: any;

  static findByIdAndUpdate(picklistId: any, updates: unknown, arg2: { new: boolean; }) {
    throw new Error('Method not implemented.');
  }
}

PicklistModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  program_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'programs',
      key: 'id',
    },
  },
  picklist_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
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
  defined_by: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  multiselect: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  disabled_program: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
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
  modelName: 'picklist',
  timestamps: false,
  hooks: {
    beforeValidate: convertEmptyStringsToNull,
    beforeSave: (instance) => {
      beforeSave(instance);
    },
  },
});

// Define the relationship
PicklistModel.hasMany(picklistItemModel, {
  foreignKey: 'picklist_id',
  as: 'picklistItems'
});

picklistItemModel.belongsTo(PicklistModel, {
  foreignKey: 'picklist_id',
  as: 'picklist'
});

sequelize.sync()

PicklistModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
export default PicklistModel;
