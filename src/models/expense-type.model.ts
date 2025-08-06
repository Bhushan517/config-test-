import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from "./programs.model";

class ExpenseTypeModel extends Model {
  id: any;
  name: any;
  code: any;
  program_id: any;
  is_tax_applied: any;
  is_negative_expense_allowed: any;
}

ExpenseTypeModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  program_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Programs,
      key: "id"
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM("general", "miscellaneous"),
    allowNull: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_attachments_mandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_notes_mandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_msp_fees_applied: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_tax_applied: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_negative_expense_allowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_unit_based: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  unit_label: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rate_per_unit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  max_unit_limit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  created_on: {
    type: DataTypes.BIGINT.UNSIGNED,
    defaultValue: Date.now(),
    allowNull: true,
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
}, {
  sequelize,
  tableName: 'expense_type',
  timestamps: false,
  hooks: {
    beforeSave: (instance) => {
      beforeSave(instance);
    },
    beforeValidate: async (instance) => {
      convertEmptyStringsToNull(instance);
      if (!instance.code && instance.program_id) {
        const program = await Programs.findByPk(instance.program_id);
        if (program?.name) {
          const programPrefix = program.name.substring(0, 3).toUpperCase();
          const count = await ExpenseTypeModel.count();
          const sequence = (count + 1).toString().padStart(5, '0');
          instance.code = `${programPrefix}-EXP-${sequence}`;
        }
      }
    },
  },
});

sequelize.sync();

ExpenseTypeModel.belongsTo(Programs, { foreignKey: 'program_id' });

export default ExpenseTypeModel;
