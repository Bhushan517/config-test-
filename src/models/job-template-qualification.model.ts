import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import jobTemplateModel from "./job-template.model";
import qualificationTypeModel from "./qualification-type-model";

class JobTemplateQualificationModel extends Model {
  qualification_id: any;
  qualifications: any;
  id: any;
  name: any;
  code: any;
  is_required: any;
  qualification_type_id: any;
}

JobTemplateQualificationModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        job_temp_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'job_templates',
                key: 'id',
            },
        },
        qualification_type_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'qualification_types',
                key: 'id',
            },
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'programs',
                key: 'id',
            },
        },
        is_required: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        code: {
            type: DataTypes.STRING,
            allowNull: true
        },
        qualifications: {
            type: DataTypes.JSON,
            allowNull: false
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
        tableName: "job_template_qualification",
        timestamps: false,
    }
);

sequelize.sync();
JobTemplateQualificationModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
JobTemplateQualificationModel.belongsTo(qualificationTypeModel, { foreignKey: 'qualification_type_id', as: 'qualification_types' });
JobTemplateQualificationModel.belongsTo(jobTemplateModel, { foreignKey: 'job_temp_id', as: 'job_templates' });

export default JobTemplateQualificationModel;