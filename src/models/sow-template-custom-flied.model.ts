import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
export class SowTemplateCustomField extends Model {
    id: any;
  custom_fields: any;
  sow_custom_field_id: any;
}

SowTemplateCustomField.init(
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },
        custom_field_id: {
            type: DataTypes.CHAR(36),
            references: {
                model: "sow_custom_fields",
                key: "id",
            },
               allowNull: true,

        },
        value: {
            type: DataTypes.JSON
        },
        sow_temp_id: {
            type: DataTypes.CHAR(36),
            allowNull: true,
            references: {
                model: "sow_templates",
                key: "id",
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
        tableName: "sow_template_custom_field",
        timestamps: false,
    }
);

sequelize.sync()
export default SowTemplateCustomField;
