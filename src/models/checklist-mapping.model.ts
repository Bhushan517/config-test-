import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import ChecklistModel from '../models/checklist.model';

class ChecklistTaskMapping extends Model { }

ChecklistTaskMapping.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        checklist_version_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'checklist',
                key: 'version_id',
            },
        },
        checklist_entity_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        category_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        category_name: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        dependency_task_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        dependency_category_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        task_entity_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        task_version_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        task_name: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        seq_no: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        is_mandatory: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        has_dependency: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        dependency_task_entity_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        dependency_category_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        trigger: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        actor_org_type: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        actor_role_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        actor_role_name: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        reviewer_org_type: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        reviewer_role_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        reviewer_role_name: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        start_date: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
        },
        due_date: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        created_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            defaultValue: Date.now(),
        },
        updated_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            defaultValue: Date.now(),
        },
        created_by: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        updated_by: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'checklist_task_mapping',
        timestamps: false,
        indexes: [],
    }
);
sequelize.sync();

export default ChecklistTaskMapping;
