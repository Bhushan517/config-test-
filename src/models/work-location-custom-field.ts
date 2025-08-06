import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import CustomField from './custom-fields.model';
import WorkLocationModel from './work-location.model';

class WorkLocationCustomFieldModel extends Model {
  id: any;

}

WorkLocationCustomFieldModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    work_location_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "work_locations",
        key: 'id',
      },
    },
    value: {
      type: DataTypes.JSON,
      allowNull: true,
    }
  },
  {
    sequelize,
    modelName: 'work_location_custom_field',
    tableName: 'work_location_custom_field',
    timestamps: false,
  }
);

WorkLocationCustomFieldModel.belongsTo(CustomField, { foreignKey: 'customfield_id', as: 'customField' });
WorkLocationCustomFieldModel.belongsTo(WorkLocationModel, { foreignKey: 'work_location_id', as: 'work_locations' });

export default WorkLocationCustomFieldModel;
