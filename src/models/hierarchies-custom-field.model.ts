import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import CustomField from './custom-fields.model';
import hierarchies from './hierarchies.model';

class HierarchyCustomFieldModel extends Model {
  id: any;

}

HierarchyCustomFieldModel.init(
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
    hierarchy_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "hierarchies",
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
    created_by: {
      type: DataTypes.UUID,
 
    },
    updated_by: {
      type: DataTypes.UUID,
  
    },
  },
  {
    sequelize,
    modelName: 'hierarchies_custom_field',
    tableName: 'hierarchies_custom_field',
    timestamps: false,
  }
);

// Define associations
HierarchyCustomFieldModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
HierarchyCustomFieldModel.belongsTo(CustomField, { foreignKey: 'customfield_id', as: 'customField' });
HierarchyCustomFieldModel.belongsTo(hierarchies, { foreignKey: 'hierarchy_id', as: 'hierarchy' });

export default HierarchyCustomFieldModel;
