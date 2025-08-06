import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { ProgramVendor } from './program-vendor.model';
import { vendorGroupInterface } from '../interfaces/vendor-group.interface';
import { Json } from 'sequelize/types/utils';

class VendorGroup extends Model implements vendorGroupInterface {
  id!: string;
  vendor_group_name!: string;
  description?: Text;
  vendors!: Json;
  hierarchy_levels?: any;
  is_enabled!: boolean;
  program_id!: string;
  created_on?: bigint;
  updated_on?: bigint;
  created_by?: string;
  updated_by?: string;
  is_deleted!: boolean;
  vendor_id?: string;
  program_vendor?: any;
  vendor_name: any;
}

VendorGroup.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    vendor_group_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    vendors: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    hierarchy_levels: {
      type: DataTypes.JSON,
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
        model: Programs,
        key: 'id',
      },
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
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
  },
  {
    sequelize,
    modelName: 'vendor_groups',
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

VendorGroup.belongsTo(Programs, {
  foreignKey: 'program_id',
  as: 'programs',
});

VendorGroup.belongsToMany(ProgramVendor, {
  through: "vendor_groups_mapping",
  as: "program_vendor",
  foreignKey: "program_id",
  otherKey: "vendorId",
});


export default VendorGroup;
