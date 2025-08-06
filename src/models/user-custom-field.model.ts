import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import CustomField from './custom-fields.model';
import hierarchies from './hierarchies.model';

class UserCustomFieldModel extends Model {
  id: any;

}

UserCustomFieldModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customfield_id: {
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
    user_id: {
      type: DataTypes.UUID,
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

  },
  {
    sequelize,
    modelName: 'user_custom_fields',
    tableName: 'user_custom_fields',
    timestamps: false,
  }
);

export default UserCustomFieldModel;
