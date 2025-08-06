import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';

class CandidateCustomField extends Model {
  id: any;
  custom_field_id: any;
  candidate_id: any;
  value: any;
}

CandidateCustomField.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    customfield_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    candidate_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    value: {
      type: DataTypes.JSON, 
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'candidate_custom_fields',
    timestamps: false,
  }
);

export default CandidateCustomField;
