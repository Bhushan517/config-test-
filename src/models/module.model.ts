import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';

class Module extends Model {
    id: any;
    name: any;
    slug!: string;
}

Module.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        parent_module_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'module',
                key: "id",
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_workflow: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true,
        },
        ref_order: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        is_rule: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        module_linking: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        is_custom_field: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        is_reason_code: {
            type: DataTypes.BOOLEAN,
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
        tableName: 'module',
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



export { Module };
