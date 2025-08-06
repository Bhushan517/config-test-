
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from "./programs.model";


class RateGuidanceConfig extends Model {
    id: any;
    program_id: any;
  is_enabled: any;
}

RateGuidanceConfig.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: Programs,
                key: "id",
            },
        },
        is_enable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
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
    },
    {
        sequelize,
        tableName: "rate_guidance_config",
        timestamps: false,
    }
);
export default RateGuidanceConfig;

