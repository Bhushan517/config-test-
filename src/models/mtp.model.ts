import { DataTypes, Model } from "sequelize";
import { sequelize } from '../config/instance';
import { convertEmptyStringsToNull } from "../hooks/convertEmptyStringsToNull";
import MtpRepository from "../repositories/mtp.repository";
const mtpRepositories = new MtpRepository();

class MtpModel extends Model {
    mtp_id: any;
    program_id: any;
    id: any;
    linked_profiles: any;
  static QueryTypes: any;
  static query: any;
  mtp_candidate_id: any;

}

MtpModel.init(
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
        talent_name:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        linked_profiles:{
            type: DataTypes.JSON,
            allowNull: false,
        },
        created_on: {
            type: DataTypes.BIGINT.UNSIGNED,
            defaultValue: Date.now(),
            allowNull: true
        },
        mtp_candidate_id:{
            type: DataTypes.UUID,
            allowNull: false,
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
        is_deleted:{
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_master_profile:{
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        do_not_rehire:{
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        }
    },
    {
        sequelize,
        tableName: "mtp",
        timestamps: false,
        hooks: {
            beforeValidate: async (instance,options) => {
                const opts: any = options;
                convertEmptyStringsToNull(instance);
                if (!instance.mtp_id && instance.program_id) {
                    const programData = await mtpRepositories.programQuery(
                        instance.program_id
                    );
                    if (programData.length > 0 && programData[0].unique_id) {
                        const programPrefix = programData[0].unique_id
                            .substring(0, 3)
                            .toUpperCase();
                        const count = await MtpModel.count({ where: { program_id: instance.program_id }, transaction: opts.transaction   });
                        const sequence = (count + 1).toString().padStart(3, "0");
                        instance.mtp_id = `${programPrefix}-MTP-${sequence}`;
                    }
                }
            },

        },
    }

);

sequelize.sync();
export default MtpModel;
