import { sequelize } from '../config/instance';
import { DataTypes, Model } from 'sequelize';
import { Programs } from '../models/programs.model';
import CredentialingPacketTaskMapping from './credentialing-packet-mapping.model';

class CredentialingPacket extends Model {
    version_id: any;
    entity_id: any;
    name: any;
    description: any;
    program_id: any;
    latest: any;
    version: any;
    previous_version_id: any;
    pre_credentialing_packet_entity_id: any;
    pre_credentialing_packet_version: any;
    sourcing_model: any;
    is_enabled: any;
    is_deleted: any;
    created_on: any;
    updated_on: any;
    created_by: any;
    updated_by: any;
    id: any;
}

CredentialingPacket.init(
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
                model: 'credentialing_packet',
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
        sourcing_model: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        pre_credentialing_packet_entity_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        pre_credentialing_packet_version: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
        tableName: 'credentialing_packet',
        timestamps: false,
        indexes: [],
    }
);

sequelize.sync();

CredentialingPacket.belongsTo(CredentialingPacket, { foreignKey: 'previous_version_id', as: 'previousVersion' });
CredentialingPacket.belongsTo(Programs, { foreignKey: 'program_id', as: 'program' });
CredentialingPacket.hasMany(CredentialingPacketTaskMapping, {
    foreignKey: 'credentialing_packet_version_id',
    sourceKey: 'version_id',
    as: 'credentialingPacketTasks'
});

export default CredentialingPacket;
