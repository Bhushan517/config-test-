import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/instance';

interface Threshold {
    supportsBeforeThresholds: boolean;
    supportsAfterThresholds: boolean;
    threshold_unit: string;
    threshold_value: number;
}

interface ConfigItem {
    key: string;
    label: string;
    is_enable: boolean;
    threshold: Threshold[];
}

interface NotificationThresholdConfigAttributes {
    id: string;
    program_id: string;
    module: string;
    config: ConfigItem[];
    is_enabled: boolean;
    is_deleted: boolean;
    created_on: number;
    updated_on: number;
    created_by?: string;
    updated_by?: string;
}

type NotificationThresholdConfigCreationAttributes = Optional<
    NotificationThresholdConfigAttributes,
    'id' | 'is_deleted' | 'created_by' | 'updated_by'
>;

class NotificationThresholdConfigModel extends Model<
    NotificationThresholdConfigAttributes,
    NotificationThresholdConfigCreationAttributes
> implements NotificationThresholdConfigAttributes {
    public id!: string;
    public program_id!: string;
    public module!: string;
    public config!: ConfigItem[];
    public is_enabled!: boolean;
    public is_deleted!: boolean;
    public created_on!: number;
    public updated_on!: number;
    public created_by?: string;
    public updated_by?: string;
}

NotificationThresholdConfigModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        module: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        config: {
            type: DataTypes.JSON,
            allowNull: false,
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
            defaultValue: Date.now(),
        },
        updated_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
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
        tableName: 'notification_threshold_config',
        timestamps: false,
    }
);
sequelize.sync();

export default NotificationThresholdConfigModel;
