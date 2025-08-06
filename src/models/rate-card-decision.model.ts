import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import hierarchies from "./hierarchies.model";
import rateType from "./rate-type.model";
import JobTemplateModel from "./job-template.model";


class DecisionTable extends Model {
    rate_card_id: any;
    hierarchy: any;
    job_template: any;
    rate_type: any;
    currency: any;
    unit_of_measure: any;
    min_rate: any;
    max_rate: any;
    created_on: any;
    updated_on: any;
    id: any;
    rate_type_id: any;
    job_type: any;
}

DecisionTable.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        rate_card_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        hierarchy_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: hierarchies,
                key: 'id'
            }
        },
        job_template_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: JobTemplateModel,
                key: 'id'
            }
        },
        rate_type_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: rateType,
                key: 'id'
            }
        },
        unit_of_measure: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        currency: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        min_rate: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        max_rate: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        job_type: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: "rate_card_decision_table",
        timestamps: false,
        hooks: {
            beforeValidate: (instance) => {
                convertEmptyStringsToNull(instance);
            },
            beforeSave: (instance) => {
                beforeSave(instance);
                if (instance.unit_of_measure) {
                    instance.unit_of_measure = instance.unit_of_measure.toLowerCase();
                }
            },
        },
    }
);

DecisionTable.belongsTo(hierarchies, { foreignKey: "hierarchy_id", as: "hierarchy" });
DecisionTable.belongsTo(JobTemplateModel, { foreignKey: "job_template_id", as: "job_template" });
DecisionTable.belongsTo(rateType, { foreignKey: "rate_type_id", as: "rate_type" });
sequelize.sync();
export default DecisionTable;
