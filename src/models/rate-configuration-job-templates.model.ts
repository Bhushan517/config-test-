import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import jobTemplateModel from "./job-template.model";

class RateConfigurationJobTemplates extends Model {
    job_template: any;
    rate_configuration_id: any;
}

RateConfigurationJobTemplates.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        rate_configuration_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        job_template_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: jobTemplateModel,
                key: 'id',
            }
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
        tableName: "rate_configuration_job_templates",
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
RateConfigurationJobTemplates.belongsTo(jobTemplateModel, { foreignKey: 'job_template_id', as: 'job_template' });
export default RateConfigurationJobTemplates;