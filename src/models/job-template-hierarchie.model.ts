import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
import jobTemplateModel from "./job-template.model";
class JobTemplateHierarchyModel extends Model {
    hierarchy: any;
    job_temp_id!: string
    job_templates: any;
}

JobTemplateHierarchyModel.init(
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
        hierarchy: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
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
        tableName: "job_template_hierarchies",
        timestamps: false,
    }
);

sequelize.sync();
JobTemplateHierarchyModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
JobTemplateHierarchyModel.belongsTo(jobTemplateModel, { foreignKey: 'job_template_id', as: 'job_templates' });
export default JobTemplateHierarchyModel;