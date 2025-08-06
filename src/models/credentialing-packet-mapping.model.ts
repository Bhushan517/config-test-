import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import CredentialingPacket from './credentialing-packet.model';

class CredentialingPacketMapping extends Model { }

CredentialingPacketMapping.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        credentialing_packet_version_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'credentialing_packet',
                key: 'version_id',
            },
        },
        credentialing_packet_entity_id: {
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
            defaultValue: () => Date.now(),
        },
        updated_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            defaultValue: () => Date.now(),
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
        tableName: 'credentialing_packet_mapping',
        timestamps: false,
        indexes: [],
    }
);

sequelize.sync();

export default CredentialingPacketMapping;
