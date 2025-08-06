import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import jobTemplateModel from "./job-template.model"
import RateType from "./rate-type.model";

class JobTempRateTypeModel extends Model {
  bill_rate: any;
  pay_rate: any;
}

JobTempRateTypeModel.init(
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'programs',
                key: 'id'
            }
        },
        job_temp_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'job_templates',
                key: 'id'
            }
        },
        bill_rate: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        pay_rate: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        rate_type_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'rate_type',
                key: 'id'
            }
        },
        abbreviation: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        billable: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
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
        tableName: "job_template_rate_type",
        timestamps: false,
    }
);

sequelize.sync()
JobTempRateTypeModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
JobTempRateTypeModel.belongsTo(RateType, { foreignKey: 'rate_type_id', as: 'rate_type' });
JobTempRateTypeModel.belongsTo(jobTemplateModel, { foreignKey: 'job_temp_id', as: 'job_templates' })
export default JobTempRateTypeModel;