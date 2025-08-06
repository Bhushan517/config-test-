import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import ExpenseTypeModel from './expense-type.model';

class ExpenseTypeMapping extends Model { 
    id:any;
    expense_item_type_config:any;
    expense_code:any;
    expense_name:any;
    is_enabled:any;
    expense_type_id: any;
    expense_type: any;
}

ExpenseTypeMapping.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      expense_type_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: ExpenseTypeModel,
          key: 'id',
        },

      },
      expense_config_id: {
        type: DataTypes.UUID,
        allowNull: true
      },
      program_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'programs',
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
      tableName: 'expense_config_expense_type_mapping', 
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
  
ExpenseTypeMapping.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
ExpenseTypeMapping.belongsTo(ExpenseTypeModel, { foreignKey: 'expense_type_id', as: 'expense_type' });

export default ExpenseTypeMapping;
