import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import CustomField from './custom-fields.model';

class MasterDataCustomFieldModel extends Model {
  id: any;

}

MasterDataCustomFieldModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Programs,
        key: 'id',
      },
    },
    custom_field_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "custom_fields",
        key: 'id',
      },
    },
    value: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    master_data_type_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "master_data_type",
        key: 'id',
      },
    },
    created_on: {
      type: DataTypes.BIGINT.UNSIGNED,
      defaultValue: Date.now(),
      allowNull:true,    
    },
    updated_on: {
      type: DataTypes.BIGINT.UNSIGNED,
      defaultValue: Date.now(),
      allowNull:true,
    },
  },
  {
    sequelize,
    modelName: 'master_data_custom_field',
    tableName: 'master_data_custom_field',
    timestamps: false,
  }
);

// Define associations
MasterDataCustomFieldModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
MasterDataCustomFieldModel.belongsTo(CustomField, { foreignKey: 'custom_field_id', as: 'customField' });

export default MasterDataCustomFieldModel;
