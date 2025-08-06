import { sequelize } from '../config/instance';
import { DataTypes } from 'sequelize';
import { Model } from 'sequelize';
import { Programs } from '../models/programs.model';
import ChecklistTaskMapping from './checklist-mapping.model';

class Checklist extends Model {
    version_id: any;
    entity_id: any;
    name: any;
    description: any;
    program_id: any;
    latest: any;
    version: any;
    previous_version_id: any;
    pre_checklist_entity_id: any;
    pre_checklist_version: any;
    associations: any;
    sourcing_model: any;
    is_enabled: any;
    is_deleted: any;
    created_on: any;
    updated_on: any;
    created_by: any;
    updated_by: any;
    id: unknown;
}

Checklist.init(
    {
        version_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        entity_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        latest: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        previous_version_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'checklist',
                key: 'version_id',
            },
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: Programs,
                key: 'id'
            }
        },
        pre_checklist_entity_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        pre_checklist_version: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        associations: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        sourcing_model: {
            type: DataTypes.ENUM('contingent', 'headcount_track', 'sow'),
            allowNull: false,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        created_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: () => Date.now(),
            allowNull: true
        },
        updated_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: () => Date.now(),
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
        tableName: 'checklist',
        timestamps: false,
        indexes: [],
    }
);

sequelize.sync();

Checklist.belongsTo(Checklist, { foreignKey: 'previous_version_id', as: 'previousVersion' });
Checklist.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
Checklist.hasMany(ChecklistTaskMapping, {
    foreignKey: 'checklist_version_id',
    sourceKey: 'version_id',
    as: 'checklistTasks'
});

export default Checklist;
