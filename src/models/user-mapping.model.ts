import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { Programs } from './programs.model';
import User from './user.model';
import Tenant from './tenant.model';

class UserMapping extends Model {
    user_id: any;
    user: any;
    time_zone_id: any;
    status: any;
    tenant_id: any;
    is_active: any;
}

UserMapping.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'tenant',
            key: 'id',
        },
    },
    role_id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'user',
            key: 'user_id',
        },
    },
    candidate_id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    program_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'programs',
            key: 'id',
        },
    },
    vendor_id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    user_type: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    ref_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    created_on: {
        type: DataTypes.BIGINT.UNSIGNED,
        defaultValue: Date.now(),
        allowNull: true
    },
    updated_on: {
        type: DataTypes.BIGINT.UNSIGNED,
        defaultValue: Date.now(),
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
}, {
    sequelize,
    tableName: 'user_mappings',
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

sequelize.sync();
UserMapping.belongsTo(Programs, { foreignKey: 'program_id', as: 'Programs' });
UserMapping.belongsTo(User, { foreignKey: "user_id", as: 'user' });
UserMapping.belongsTo(Tenant, { foreignKey: "tenant_id", as: 'tenant' });

export default UserMapping;
