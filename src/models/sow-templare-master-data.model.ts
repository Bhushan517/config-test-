import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
class SOWTemplateMasterDataModel extends Model {
    id: any;
}

SOWTemplateMasterDataModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        sow_temp_id: {
            type: DataTypes.CHAR(36),
            allowNull: true,
            references: {
                model: "sow_templates",
                key: "id",
            },
        },
        master_data_type: {
            type: DataTypes.CHAR(36),
            allowNull: true,
            references: {
                model: 'master_data_type',
                key: 'id'
            }
        },
        master_data: {
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
        seq_no: {
            type: DataTypes.INTEGER,
            allowNull: true,
        }
    },
    {
        sequelize,
        tableName: "sow_template_master_data",
        timestamps: false,
    }
);

sequelize.sync();
export default SOWTemplateMasterDataModel;