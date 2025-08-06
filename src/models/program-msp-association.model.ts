import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import Tenant from './tenant.model';

class programMspAssociationModel extends Model {
  msp_id: any;
  is_enabled: any;
}
programMspAssociationModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Programs,
        key: 'id',
      },
    },
    msp_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Tenant,
        key: 'id',
      },
    },
     is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
     },
    created_on: {
      type: DataTypes.BIGINT.UNSIGNED,
      defaultValue: Date.now(),
      allowNull:true,    
    },
    updated_on: {
      type: DataTypes.BIGINT.UNSIGNED,
      defaultValue: Date.now(),
      allowNull:true,
    },
    created_by: {
      type: DataTypes.UUID,
 
    },
    updated_by: {
      type: DataTypes.UUID,
  
    },
  },
  {
    sequelize,
    modelName: 'program_msp_association',
    tableName: 'program_msp_association',
    timestamps: false,
  }
);

programMspAssociationModel.belongsTo(Tenant, { foreignKey: "msp_id", as: "msp" });

export default programMspAssociationModel;
