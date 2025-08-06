import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/instance';

export class RateGuidanceMaster extends Model {
    public id!: string;
    public industry!: string;
    public profession!: string;
    public specialty!: string;
    public state!: string;
    public regular_bill_rate!: number;
    public created_by!: string;
    public updated_by!: string;
    public is_enabled!: boolean;
    public is_deleted!: boolean;
    public created_on!: Date;
    public updated_on!: Date;
}

RateGuidanceMaster.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        industry: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        profession: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        specialty: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        state: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        regular_bill_rate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        created_by: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        updated_by: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        created_on: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updated_on: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'rate_guidance_master',
        timestamps: false,
    }
);

export default RateGuidanceMaster;
