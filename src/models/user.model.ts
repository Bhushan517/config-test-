import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import CountryModel from './countries.model';
import hierarchies from "./hierarchies.model";
import WorkLocationModel from "./work-location.model";

class User extends Model {
  id: string | undefined;
  default_work_location_id: string | undefined;
  default_hierarchy_id: string | undefined;
  language_id: string | undefined;
  country_id: string | undefined;
  time_zone_id: string | undefined;
  public associate_hierarchy_ids!: string[];
  public work_location_ids!: string[];
  tenant_id: any;
  hierarchies: any;
  addresses: any;
  work_locations: any;
  user_type: string | undefined;
  foundational_data: any;
  user_id: any;
  is_all_hierarchy_associate: any;
  ast_name: string | undefined;
  first_name: string | undefined;
    last_name: any;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'programs',
        key: 'id',
      },
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    user_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name_prefix: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    addresses: {
      type: DataTypes.JSON,
      allowNull: true
    },
    role_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    contacts: {
      type: DataTypes.JSON,
      allowNull: true
    },
    middle_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true
    },
    name_suffix: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sso_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    avatar: {
      type: DataTypes.JSON,
      allowNull: true
    },
    theme: {
      type: DataTypes.JSON,
      allowNull: true
    },
    country_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'countries',
        key: 'id',
      },
    },
    applications: {
      type: DataTypes.JSON,
      allowNull: true
    },
    credentials: {
      type: DataTypes.JSON,
      allowNull: true
    },
    supervisor: {
      type: DataTypes.UUID,
      allowNull: true
    },
    time_zone_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    language_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    associate_hierarchy_ids: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    work_location_ids: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    associate_cost_ids: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    spend_category_ids: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_all_hierarchy_associate: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    default_hierarchy_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_all_labour_category_associate: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    associate_labour_category: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_all_job_type_associate: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    associate_job_type: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_all_work_location_associate: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    default_work_location_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_all_cost_center_associate: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    default_cost_center_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_all_spend_category_associate: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    default_spend_category_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_allow_unlimited_authority: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    min_limit: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    max_limit: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    date_format: {
      type: DataTypes.STRING,
      allowNull: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true
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
    tableName: 'user',
    timestamps: false,
    hooks: {
      beforeValidate: (instance) => {
        convertEmptyStringsToNull(instance);
      },
      beforeSave: (instance) => {
        beforeSave(instance);
      },
    }
  }
);

User.belongsTo(Programs, { foreignKey: "program_id", as: "programs" });
User.belongsTo(CountryModel, { foreignKey: "country_id", as: "countries" });
User.belongsToMany(hierarchies, { through: 'user_hierarchies', foreignKey: 'user_Id' });
User.belongsToMany(WorkLocationModel, { through: 'user_work_locations', foreignKey: 'user_Id' });

export default User;