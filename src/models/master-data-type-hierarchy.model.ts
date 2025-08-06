import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import MasterDataTypeModel from './master-datatypes.model';
import Hierarchies from './hierarchies.model';

class MasterDataTypeHierarchy extends Model {
  hierarchy: any;
  master_data_type_id: any;
}
MasterDataTypeHierarchy.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    master_data_type_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: MasterDataTypeModel,
        key: 'id',
      },
    },
    hierarchy_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Hierarchies,
        key: 'id',
      },
    }
  },
  {
    sequelize,
    tableName: 'master_data_type_hierarchy',
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
MasterDataTypeHierarchy.belongsTo(Hierarchies, { foreignKey: 'hierarchy_id', as: 'hierarchy' });
export default MasterDataTypeHierarchy;
