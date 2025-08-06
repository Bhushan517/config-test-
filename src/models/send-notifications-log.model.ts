import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';

class sendNotificationModel extends Model {
    id: any;
}
sendNotificationModel.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
    },
    program_id: {
        type: DataTypes.UUID,
        allowNull: false,
       
    },
    placement_order: {
        type: DataTypes.INTEGER,
        allowNull: false,

    },
    workflow_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    created_by: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: true,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: Date.now(),
    },
    modified_at: {
        type: DataTypes.DATE,
        defaultValue: Date.now(),
    },
},
    {
        sequelize,
        modelName: 'send_notification_logs',
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

export default sendNotificationModel;
