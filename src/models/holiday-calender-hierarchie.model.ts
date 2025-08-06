import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import HolidayCalendar from './holiday-calendar.model';

class HolidayCalendarHierarchies extends Model {
  hierarchy_id: any;
  holiday_calendar_id: any;
}

HolidayCalendarHierarchies.init({
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
    hierarchy_id: {
        type: DataTypes.UUID,
        allowNull: true,
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
    modelName: 'holiday_calendar_hierarchies',
    tableName: 'holiday_calendar_hierarchies',
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

HolidayCalendarHierarchies.belongsTo(HolidayCalendar, {
    foreignKey: 'holiday_calendar_id',
    as: 'holiday_calendar',
});
sequelize.sync();

export default HolidayCalendarHierarchies;
