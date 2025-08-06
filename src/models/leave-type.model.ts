
import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/instance";
import generateSlug from "../plugins/slugGenerate";


class LeaveTypeModel extends Model {
    name!: string;
    slug!: string;
    id!: any
}

LeaveTypeModel.init({


    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },

    slug: {

        type: DataTypes.STRING,
        allowNull: true
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
        allowNull: true
    },

    updated_by: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    sequelize,
    tableName: 'leave_types',
    timestamps: false,
    hooks: {
        beforeSave: async (instance) => {
            if (instance.name) {
                instance.slug = generateSlug(instance.name, {
                    lowercase: true,
                    removedspecial: true
                });
            }
        },
    }
});


export default LeaveTypeModel; 
