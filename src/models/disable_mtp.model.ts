import { DataTypes, Model } from "sequelize";
import { sequelize } from '../config/instance';


class DisableMtp extends Model {

}

DisableMtp.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true
        },
        program_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        mtp_id:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        candidate_id:{
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "submitted_candidate_disabled_mtp",
        timestamps: false,
       
    }

);

sequelize.sync();
export default DisableMtp;
