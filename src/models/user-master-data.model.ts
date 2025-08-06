import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import FoundationalData from './master-data.model';
import FoundationalDataTypes from './master-datatypes.model';
import hierarchies from './hierarchies.model';

class UserMasterDataModel extends Model {
    user_id: string | undefined;
    foundation_data_type_id: any;
    foundation_data_ids: any;
    default_master_data: any;
    is_associated: any;
    default_master_datas: any
    foundation_data_type: any;
    hierarchy_id: any;
    hierarchies: any;
}

UserMasterDataModel.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: true
    },
    master_data: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'master_data_type',
            key: 'id'
        }
    },
    associated_master_data: {
        type: DataTypes.JSON,
        allowNull: true
    },
    default_master_data: {
        type: DataTypes.JSON,
        allowNull: true
    },
    is_all_associated: {
        type: DataTypes.BOOLEAN,
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
    tableName: 'user_master_data',
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
UserMasterDataModel.belongsTo(FoundationalData, { foreignKey: 'default_master_data', as: 'default_master_datas' });
UserMasterDataModel.belongsTo(FoundationalDataTypes, { foreignKey: 'master_data', as: 'foundation_data_type' });
export default UserMasterDataModel;
