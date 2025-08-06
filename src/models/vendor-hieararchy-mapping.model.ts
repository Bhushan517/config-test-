import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { Programs } from "./programs.model";
// import { programVendor } from "./programVendorModel";

class VendorHierarchyMapping extends Model { }

VendorHierarchyMapping.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        program_vendor_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "program_vendors",
                key: "id",
            },
        },
        hierarchy_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        hierarchy_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: "programs",
                key: "id",
            },
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
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
    },
    {
        sequelize,
        tableName: "vendor_hierarchy_mapping",
        timestamps: false
    }
);

sequelize.sync();
VendorHierarchyMapping.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});

export default VendorHierarchyMapping;
