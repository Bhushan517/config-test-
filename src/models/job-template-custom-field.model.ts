import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import jobTemplateModel from "./job-template.model";
import CustomField from "./custom-fields.model";

export class JobTemplateCustomField extends Model {
    id: any;
  custom_fields: any;
  custom_field_id: any;
    
}

JobTemplateCustomField.init(
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },
        custom_field_id: {
            type: DataTypes.UUID,
            references: {
                model: "custom_fields",
                key: "id",
            },
        },
        value:{
            type:DataTypes.JSON
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
            allowNull: false,
            references: {
                model: "job_templates",
                key: "id",
            },
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
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
        tableName: "job_template_custom_field",
        timestamps: false,
    }
);

sequelize.sync()
JobTemplateCustomField.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
JobTemplateCustomField.belongsTo(jobTemplateModel, { foreignKey: 'job_temp_id', as: 'job_templates' });
JobTemplateCustomField.belongsTo(CustomField, { foreignKey: 'custom_field_id', as: 'custom_fields' });
export default JobTemplateCustomField;