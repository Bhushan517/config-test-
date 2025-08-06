import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import ReasonCodeActionModel from "./reason-code-action.model";
import { Programs } from "./programs.model";

class ReasonCodeModel extends Model {
    id?: any;
    name: any;
    created_on: any;
    category: any;
    is_enabled: any;
    sq_number:any
    reason_code_id: any;
    program_id: string | undefined;
   usage_count?: any;
    updated_on: any;
}

ReasonCodeModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        reason_code_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: ReasonCodeActionModel,
                key: 'id'
            }
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'programs',
                key: 'id',
            },
        },
        sq_number: {
            type: DataTypes.INTEGER,
            allowNull: false,
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
    },
    {
        sequelize,
        tableName: "reason_codes",
        modelName: "reason_codes",
        timestamps: false,


    }
);

sequelize.sync();
ReasonCodeModel.belongsTo(Programs, { foreignKey: 'program_id' });
ReasonCodeModel.belongsTo(ReasonCodeActionModel, { foreignKey: "reason_code_id", as: "reason_codes" })
export default ReasonCodeModel;
