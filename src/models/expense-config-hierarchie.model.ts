import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import ExpenseConfigurationModel from './expense-configuration.model';
import Hierarchies from './hierarchies.model';

class ExpenseConfigHierarchyMapping extends Model {
  hierarchy: any;

}
ExpenseConfigHierarchyMapping.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    expense_config_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: ExpenseConfigurationModel,
        key: 'id',
      },
    },
    hierarchy_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Hierarchies,
        key: 'id',
      },
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
  },
  {
    sequelize,
    tableName: 'expense_config_hierarchy_mapping',
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

ExpenseConfigHierarchyMapping.belongsTo(ExpenseConfigurationModel, {
  foreignKey: 'expense_config_id',
  as: 'expense_config',
});

ExpenseConfigHierarchyMapping.belongsTo(Hierarchies, {
  foreignKey: 'hierarchy_id',
  as: 'hierarchy',
});

export default ExpenseConfigHierarchyMapping;
