import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';

class OnboardingConfigurationModel extends Model {
  id: any;
}

OnboardingConfigurationModel.init(
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
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_all_job_type: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    job_type: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_all_job_template: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    job_template_id: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_all_hierarchy: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    hierarchy_id: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_all_checklist: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    checklist_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false
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
    modelName: 'onboarding_configuration',
    tableName: 'onboarding_configuration',
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
export default OnboardingConfigurationModel;
