import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import FoundationalDataTypes from './master-datatypes.model';
import { Programs } from './programs.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import User from './user.model';

class FoundationalData extends Model {
    id: any;
    foundational_data_type_id: any;
    name: any;
    manager_ids: any;
    is_all_hierarchy_associated: any;
    additional_mdt_owner: any;
}

FoundationalData.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    code: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    foundational_data_type_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'master_data_type',
            key: 'id',
        },
    },
    program_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'programs',
            key: 'id',
        },
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    creation_source: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    manager_ids: {
        type: DataTypes.JSON,
        allowNull: true,
        references: {
            model: 'user',
            key: 'user_id',
        },
    },
    depended_fields: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    is_billable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    is_all_hierarchy_associated: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
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
    additional_mdt_owner:{
        type:DataTypes.JSON,
        allowNull:true

    }
}, {
    sequelize,
    modelName: 'master_data',
    timestamps: false,
    hooks: {
        beforeValidate: (instance) => {
            convertEmptyStringsToNull(instance);
        }
    },
});

FoundationalData.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
FoundationalData.belongsTo(FoundationalDataTypes, { foreignKey: 'foundational_data_type_id', as: 'master_data_type' });
FoundationalData.belongsTo(User, { foreignKey: 'manager_ids', as: 'owner' });
sequelize.sync();

export default FoundationalData;
