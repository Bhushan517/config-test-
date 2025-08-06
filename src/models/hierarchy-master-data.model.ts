import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
class HierarchyMasterData extends Model {
    id: any;
}
HierarchyMasterData.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        hierarchy_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        foundation_data_type_id: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize,
        modelName: 'hierarchies_master_data',
        tableName: 'hierarchies_master_data',
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
export default HierarchyMasterData;