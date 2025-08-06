import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from './programs.model';
import generateSlug from '../plugins/slugGenerate';

class TimesheetTypeConfig extends Model {
  id: any;
  hierarchies: any;
  timesheet_hierarchies: any;
  labor_category: any;
  master_data_types: never[] | undefined;
  allocations: any;
  title!: string;
  slug!: string
  timesheet_rule_group: never[] | undefined;
  break_rule_group: never[] | undefined;
  project: any;
  input_format!: string;
}

TimesheetTypeConfig.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    display_title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_all_labor_category_associate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    work_period: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    work_start_day: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timesheet_format: {
      type: DataTypes.ENUM('tito', 'hourly', 'daily'),
      allowNull: true,
    },
    time_format: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    project: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    allocations: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    timesheet_rule_group: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    break_rule_group: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    allow_non_billable_hours: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    break: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    timesheet_rounding: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Programs,
        key: "id",
      }
    },
    notes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    st_per_week: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    st_per_day: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    st_days_per_week: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    daily_limit: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    weekly_limit: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    weekend: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    modification_rules: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_modification_rule: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    thresholds: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    copy_timesheet: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_overnight_allowed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    soft_delete: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    allow_timesheet_to_be_submitted: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hierarchies: {
      type: DataTypes.JSON,
      allowNull: true
    },
    labor_category: {
      type: DataTypes.JSON,
      allowNull: true
    },
    master_data_types: {
      type: DataTypes.JSON,
      allowNull: true
    },
    input_format: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_all_hierarchy_associated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    day_format: {
      type: DataTypes.JSON,
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
    tableName: 'timesheet_type_config',
    timestamps: false,
    hooks: {
      beforeValidate: (instance) => {
        convertEmptyStringsToNull(instance);
      },
      beforeSave: async (instance) => {
        beforeSave(instance);
      },
    },
  }
);

TimesheetTypeConfig.belongsTo(Programs, {
  foreignKey: 'program_id',
  as: 'programs',
});

export default TimesheetTypeConfig;
