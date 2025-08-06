import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
// import { programVendor } from './programVendorModel';
import IndustriesModel from './labour-category.model';

class vendorLabourCategoriesModel extends Model { }
vendorLabourCategoriesModel.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    labour_category_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    program_vendor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'program_vendors',
            key: 'id',
        },
    },
    labour_category_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'labour_category',
            key: 'id',
        },
    },
    program_id: {
        type: DataTypes.UUID,
        allowNull: true,
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
}, {
    sequelize,
    modelName: 'vendor_labour_categories',
});
sequelize.sync();
vendorLabourCategoriesModel.belongsTo(Programs, {
    foreignKey: "program_id",
    as: "programs",
});

vendorLabourCategoriesModel.belongsTo(IndustriesModel, {
    foreignKey: 'labour_category_id',
    as: 'labour_category'
});

export default vendorLabourCategoriesModel;
