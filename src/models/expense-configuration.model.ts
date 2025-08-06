import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import IndustriesModel from './labour-category.model';
import Hierarchies from './hierarchies.model';
import FoundationalDataTypes from './master-datatypes.model';

class ExpenseConfigurationModel extends Model {
  master_data_types(master_data_types: any) {
    throw new Error("Method not implemented.");
  }
  id: unknown;
  hierarch_ids: any;
  expense_type_ids: any;
  updated_by: any;
  hierarchy_ids: any;
  labor_category_ids: any;
  entity_id: string | undefined;
  revision: number | undefined;
  created_on: unknown;
  created_by: unknown;
}
ExpenseConfigurationModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    week_ending_day: {
      type: DataTypes.ENUM(
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday'
      ),
      allowNull: true,
    },
    is_mdt_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    master_data_types: {
      type: DataTypes.JSON,
      allowNull: true,
      references: {
        model: FoundationalDataTypes,
        key: 'id',
      }
    },
    is_projects_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    projects: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_thresholds_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    labor_category_ids: {
      type: DataTypes.JSON,
      allowNull: true,
      references: {
        model: IndustriesModel,
        key: 'id',
      }
    },
    hierarchy_ids: {
      type: DataTypes.JSON,
      allowNull: true,
      references: {
        model: Hierarchies,
        key: 'id',
      }
    },
    gnrl_duration_rule: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    misc_duration_rule: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    gnrl_grace_period_rule: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    misc_grace_period_rule: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    gnrl_revoke_access_rule: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    misc_revoke_access_rule: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    revision: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    latest: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'programs',
        key: 'id',
      },
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_on: {
      type: DataTypes.DOUBLE,
      defaultValue: Date.now(),
    },
    updated_on: {
      type: DataTypes.DOUBLE,
      defaultValue: Date.now(),
      allowNull: true,
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
    tableName: 'expense_config',
    timestamps: false,
  }
);
ExpenseConfigurationModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
ExpenseConfigurationModel.belongsTo(IndustriesModel, { foreignKey: 'labor_category_ids', as: 'industries' });
ExpenseConfigurationModel.belongsTo(Hierarchies, { foreignKey: 'hierarchy_ids', as: 'hierarchies' });
ExpenseConfigurationModel.belongsTo(FoundationalDataTypes, { foreignKey: 'master_data_types', as: 'foundational_data_types' });
sequelize.sync();

export default ExpenseConfigurationModel;
