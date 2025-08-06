import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';

import { Programs } from './programs.model';
class CustomFieldsLocation extends Model {
    work_location_id: any;
    custom_field_id: any;
    id: any;
}
CustomFieldsLocation.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    custom_field_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    work_location_id: {
        type: DataTypes.UUID,
        allowNull: true
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
        modelName: 'custom_fields_location',
        timestamps: false,
        hooks: {
            beforeValidate: (instance) => {
                convertEmptyStringsToNull(instance);
            },
            beforeSave: (instance) => {
                beforeSave(instance);
            },
        },
    });
CustomFieldsLocation.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });

sequelize.sync();
export default CustomFieldsLocation;
