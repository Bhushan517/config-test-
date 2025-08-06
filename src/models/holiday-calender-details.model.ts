import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import HolidayCalendar from './holiday-calendar.model';

class HolidayCalendarDetails extends Model {
}

HolidayCalendarDetails.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    holiday_calendar_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'holiday_calendar',
            key: 'id', 
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    is_time_entry_allowed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    is_paid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    is_tax_applicable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
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
    modelName: 'holiday_calendar_details',
    tableName: 'holiday_calendar_details', 
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

HolidayCalendarDetails.belongsTo(HolidayCalendar, {
    foreignKey: 'holiday_calendar_id',
    as: 'holiday_calendar',
});
sequelize.sync();

export default HolidayCalendarDetails;
