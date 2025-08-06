import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { Module } from './module.model';
import Event from './event.model';

class ReasonCodeActionModel extends Model {
    id: any;
    module_id: any;
    event_id: any;
    reasons_code: any;
    reason_codes: any;
    name: any;
    created_on: any;
    category: any;
    is_enabled: any;
    module?: Module;
    supporting_text_event?: Event;
}

ReasonCodeActionModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        reasons_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        event_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'event',
                key: 'id',
            },
        },
        module_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references:
            {
                model: 'module',
                key: 'id',
            },
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        reason_codes: {
            type: DataTypes.JSON,
            allowNull: true
        },
        created_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
            allowNull: true,
        },
        updated_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
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
    },
    {
        sequelize,
        modelName: 'reason_code_actions',
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

ReasonCodeActionModel.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });
ReasonCodeActionModel.belongsTo(Event, { foreignKey: 'event_id', as: 'supporting_text_event' });

export default ReasonCodeActionModel;
