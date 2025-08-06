import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import CustomField from './custom-fields.model';

class VendorCustomField extends Model {
  id: any;

}

VendorCustomField.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    vendor_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    custom_field_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    value: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'vendor_custom_field',
    tableName: 'vendor_custom_field',
    timestamps: false,
  }
);

export default VendorCustomField;
