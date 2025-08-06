import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import jobTemplateModel from "./job-template.model";
import FoundationalDataTypes from "./master-datatypes.model";
class JobMasterDataModel extends Model {
    id: any;
  foundation_data_type_id: any;
  foundation_data_id: any;
  is_read_only: any;
}

JobMasterDataModel.init(
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
            references: {
                model: "programs",
                key: "id",
            },
        },
        job_temp_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "job_templates",
                key: "id",
            },
        },
        foundation_data_type_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'master_data_type',
                key: 'id'
            }
        },
        foundation_data_id: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        is_read_only: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
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
        tableName: "job_template_master_data",
        timestamps: false,
    }
);

sequelize.sync();
JobMasterDataModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
JobMasterDataModel.belongsTo(FoundationalDataTypes, { foreignKey: 'foundation_data_type_id', as: 'foundational_datatypes' });
JobMasterDataModel.belongsTo(jobTemplateModel, { foreignKey: 'job_temp_id', as: 'job_templates' });


export default JobMasterDataModel;