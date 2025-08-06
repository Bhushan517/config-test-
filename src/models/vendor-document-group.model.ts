import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { beforeSave } from "../hooks/timeFormatHook";
import { Programs } from "./programs.model";
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";

class vendordocumentgroupModel extends Model {
    id: any;
    required_documents: any;
    total_documents: any;
}

vendordocumentgroupModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        required_documents: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        total_documents: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        ref_id: {
            type: DataTypes.UUID,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "programs",
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
        modelName: "vendor_document_group",
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
vendordocumentgroupModel.belongsTo(Programs, { foreignKey: "program_id" });
export default vendordocumentgroupModel;
