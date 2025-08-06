import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import CustomField from './custom-fields.model';
import hierarchies from './hierarchies.model';

class ProgramCustomField extends Model {
  id: any;

}

ProgramCustomField.init(
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
  },
  {
    sequelize,
    modelName: 'program_custom_field',
    tableName: 'program_custom_field',
    timestamps: false,
  }
);

ProgramCustomField.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
ProgramCustomField.belongsTo(CustomField, { foreignKey: 'customfield_id', as: 'customField' });

export default ProgramCustomField;
