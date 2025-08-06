import { DataTypes, Model, Op } from 'sequelize';
import { sequelize } from '../config/instance';
import { Programs } from './programs.model';
import { beforeSave } from '../hooks/timeFormatHook';

class SowTemplateModel extends Model {
    id: any;
    created_on!: bigint;
    updated_on!: Date;
    custom_fields: any;
    master_date_type: any;
    hierarchy: any;
    masterData: any;
    code: any;
    program_id: any;
    entity_id: string | undefined;
    revision: number | undefined;
}

SowTemplateModel.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            // autoIncrement: true
        },
         entity_id: {
              type: DataTypes.UUID,
              allowNull: true,
        },
        program_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: Programs,
                key: 'id'
            }
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        template_title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        revision: {
              type: DataTypes.INTEGER,
              defaultValue: 1,
            },
         latest: {
              type: DataTypes.BOOLEAN,
              allowNull: false
        },
        description: {
            type: DataTypes.TEXT ,
            allowNull: false,
        },
        is_sow_assignment: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_sow_expense: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_sow_milestones: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_sow_payment_req: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_sow_schedule_payments: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_sow_desc_mandatory: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        upload_description: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        is_update_sow_desc: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_req_doc_mandatory: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
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
        tableName: 'sow_templates',
        timestamps: false,
        hooks: {
            beforeValidate: async (instance) => {
                if (!instance.code && instance.program_id) {
                    const program = await Programs.findByPk(instance.program_id);
                    if (program?.display_name) {
                        const programPrefix = program.display_name.substring(0, 3).toUpperCase();
                        const codePrefix = `${programPrefix}-SOW-`;
                        const existingTemplates = await SowTemplateModel.findAll({
                            where: {
                                program_id: instance.program_id,
                                code: {
                                    [Op.like]: `${codePrefix}%`,
                                },
                            },
                            attributes: ['code'],
                            order: [['created_on', 'DESC']],
                        });
                        let maxSequence = 0;
                        for (const template of existingTemplates) {
                            const match = template.code.match(/(\d+)$/);
                            if (match) {
                                const num = parseInt(match[1], 10);
                                if (num > maxSequence) {
                                    maxSequence = num;
                                }
                            }
                        }
                        const nextSequence = (maxSequence + 1).toString().padStart(3, '0');
                        instance.code = `${codePrefix}${nextSequence}`;
                    }
                }
            },
            beforeSave: (instance) => {
                beforeSave(instance);
            }
        }
    });

sequelize.sync();
export default SowTemplateModel;
