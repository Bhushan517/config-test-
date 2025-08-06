import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import SowTemplateModel from './sow_template.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import { hierarchie } from '../utility/queries';
import Hierarchies from './hierarchies.model';


class SowTemplateHierarchyModel extends Model {
    id: any;
    created_on!: bigint;
    updated_on!: bigint;
    hierarchy_id: any;
}

SowTemplateHierarchyModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        sow_template_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: SowTemplateModel,
                key: "id",
            },
        },
        hierarchy_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references:{
                model:Hierarchies,
                key:'id'
            }
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
        tableName: 'sow_template_hierarchy',
        timestamps: false,
    });

sequelize.sync();
SowTemplateHierarchyModel.belongsTo(SowTemplateModel, { foreignKey: 'sow_template_id', as: 'sow_templates' });
SowTemplateHierarchyModel.belongsTo(Hierarchies, { foreignKey: 'hierarchy_id', as: 'hierarchy' });
export default SowTemplateHierarchyModel;
