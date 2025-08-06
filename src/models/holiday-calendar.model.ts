import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import ProgramModule from './program-module.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';

class HolidayCalendar extends Model {
  hierarchy_units_ids: any;
  work_locations_ids: any;
  id: any;
}

HolidayCalendar.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    program_id: {
        type: DataTypes.STRING, 
        allowNull: false,
        references: {
            model: 'programs',
            key: 'id',
        },
    },
    name: {
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
    year: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    is_all_hierarchy_associated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    is_all_worklocation_associated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    created_on: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
    },
    updated_on: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
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
    modelName: 'holiday_calendar',
    tableName: 'holiday_calendar',
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

HolidayCalendar.belongsTo(ProgramModule, {
    foreignKey: 'program_id',
    as: 'programs',
});

export default HolidayCalendar;
