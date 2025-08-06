import ChecklistInterface from "../interfaces/checklist.interface";
import { sequelize } from "../config/instance";
import Checklist from "../models/checklist.model";
import ChecklistMapping from "../models/checklist-mapping.model";
import { checkIfChecklistNameExists } from "../utility/checklist-service";
import { Op, col, fn } from "sequelize";

export class ChecklistService {
    async createCheckList(checkListData: ChecklistInterface, program_id: string, userId: string) {
        const { task_category_configs, name, ...checkListDataWithoutConfigs } = checkListData;

        const existingChecklist = await checkIfChecklistNameExists(name, program_id);
        if (existingChecklist) {
            throw new Error(`Checklist with name ${name} already exists for this program.`);
        }

        const transaction = await sequelize.transaction();

        try {
            const createdCheckList = await Checklist.create(
                {
                    name,
                    ...checkListDataWithoutConfigs,
                    program_id,
                    created_by: userId,
                    updated_by: userId,
                },
                { transaction }
            );

            if (Array.isArray(task_category_configs) && task_category_configs.length > 0) {
                const taskCategoryMappings = task_category_configs.map((config) => ({
                    checklist_version_id: createdCheckList.version_id,
                    checklist_entity_id: createdCheckList.entity_id,
                    seq_no: config.seq_no,
                    is_mandatory: config.is_mandatory ?? false,
                    trigger: config.trigger,
                    actor_org_type: config.actor_org_type,
                    actor_role_id: config.actor_role_id,
                    actor_role_name: config.actor_role_name,
                    reviewer_org_type: config.reviewer_org_type,
                    reviewer_role_id: config.reviewer_role_id,
                    reviewer_role_name: config.reviewer_role_name,
                    start_date: config.start_date,
                    due_date: config.due_date,
                    is_enabled: config.is_enabled ?? true,
                    is_deleted: config.is_deleted ?? false,
                    created_by: createdCheckList.created_by,
                    updated_by: createdCheckList.updated_by,
                    category_id: config.category_id,
                    category_name: config.category_name,
                    task_entity_id: config.task_entity_id,
                    task_version_id: config.task_version_id,
                    task_name: config.task_name,
                    has_dependency: config.has_dependency ?? false,
                    dependency_task_entity_id: config.dependency_task_entity_id,
                    dependency_task_name: config.dependency_task_name,
                    dependency_category_id: config.dependency_category_id,
                    dependency_category_name: config.dependency_category_name,
                }));

                await ChecklistMapping.bulkCreate(taskCategoryMappings, { transaction });
            }

            await transaction.commit();
            return createdCheckList;

        } catch (innerError) {
            await transaction.rollback();
            throw innerError;
        }
    }

    async getChecklistById(entity_id: string, version?: string) {
        const checklistOptions: any = {
            where: {
                entity_id,
                ...(version ? { version } : { latest: true }),
            },
            includes: []
        };
        
        const checklistData: any = await Checklist.findOne(checklistOptions);
        
        if (!checklistData) {
            throw new Error('Checklist not found');
        }

        const taskOptions: any = {
            where: {
                checklist_version_id: checklistData.version_id,
            },
        };
        
        const taskMappings = await ChecklistMapping.findAll(taskOptions);
        
        const checklistResponse = {
            ...checklistData.dataValues,
            task_category_configs: taskMappings.map((task_category: any) => ({
                ...task_category.dataValues
            })),
        };

        return checklistResponse;
    }

    async updateCheckList(
        entity_id: string,
        program_id: string,
        checkListData: ChecklistInterface,
        userId: string
    ) {
        const {
            name,
            description,
            is_enabled,
            associations,
            task_category_configs,
            sourcing_model,
            created_by,
            updated_by,
        } = checkListData;

        if (!Array.isArray(task_category_configs)) {
            throw new Error('`task_category_configs` must be an array.');
        }

        const transaction = await sequelize.transaction();

        try {
            if (is_enabled === true) {
                const duplicate = await Checklist.findOne({
                    where: {
                        name,
                        program_id,
                        is_enabled: true,
                        is_deleted: false,
                        latest: true,
                        entity_id: { [Op.ne]: entity_id },
                    },
                });

                if (duplicate) {
                    await transaction.rollback();
                    throw new Error('A checklist with the same name is already enabled for this program.');
                }
            }

            const existingChecklist = await Checklist.findOne({
                where: { entity_id, is_deleted: false, latest: true },
                attributes: ['version', 'version_id'],
                order: [['version', 'DESC']],
            });

            const newVersion = existingChecklist ? existingChecklist.version + 1 : 1;

            if (existingChecklist) {
                await Checklist.update(
                    { latest: false, updated_on: BigInt(Date.now()), updated_by },
                    {
                        where: { version_id: existingChecklist.version_id },
                        transaction,
                    }
                );
            }

            const newChecklist = await Checklist.create(
                {
                    entity_id,
                    program_id,
                    version: newVersion,
                    name,
                    description,
                    is_enabled,
                    sourcing_model,
                    pre_checklist_entity_id: existingChecklist?.pre_checklist_entity_id,
                    pre_checklist_version: existingChecklist?.pre_checklist_version,
                    associations: JSON.stringify(associations),
                    previous_version_id: existingChecklist ? existingChecklist.version_id : null,
                    latest: true,
                    created_by: userId,
                    updated_by: userId,
                    created_on: BigInt(Date.now()),
                    updated_on: BigInt(Date.now()),
                },
                { transaction }
            );

            if (!newChecklist) {
                throw new Error('Failed to create a new checklist version.');
            }

            if (existingChecklist) {
                await ChecklistMapping.update(
                    {
                        is_deleted: true,
                        updated_on: BigInt(Date.now()),
                        updated_by: userId,
                    },
                    {
                        where: {
                            checklist_version_id: existingChecklist.version_id,
                            checklist_entity_id: entity_id,
                        },
                        transaction,
                    }
                );
            }

            const taskCategoryMappings = task_category_configs.map((config) => ({
                checklist_version_id: newChecklist.version_id,
                checklist_entity_id: entity_id,
                seq_no: config.seq_no,
                is_mandatory: config.is_mandatory ?? true,
                configuration: JSON.stringify(config.configuration),
                dependency: config.dependency ? JSON.stringify(config.dependency) : null,
                trigger: config.trigger,
                actor_org_type: config.actor_org_type,
                actor_role_id: config.actor_role_id,
                actor_role_name: config.actor_role_name,
                reviewer_org_type: config.reviewer_org_type,
                reviewer_role_id: config.reviewer_role_id,
                reviewer_role_name: config.reviewer_role_name,
                start_date: config.start_date || null,
                due_date: config.due_date || null,
                category_id: config.category_id,
                category_name: config.category_name,
                task_entity_id: config.task_entity_id,
                task_version_id: config.task_version_id,
                task_name: config.task_name,
                has_dependency: config.has_dependency ?? false,
                dependency_task_entity_id: config.dependency_task_entity_id,
                dependency_category_id: config.dependency_category_id,
                created_by: userId,
                updated_by: userId,
                is_enabled: true,
                is_deleted: false,
                created_on: BigInt(Date.now()),
                updated_on: BigInt(Date.now()),
            }));

            await ChecklistMapping.bulkCreate(taskCategoryMappings, { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async enableDisableChecklist(program_id: string, entity_id: string, is_enabled: boolean) {
        if (!entity_id || !program_id) {
            throw new Error("Program ID and Entity ID are required");
        }

        if (is_enabled === undefined) {
            throw new Error("'is_enabled' is required in the payload");
        }

        const checklist = await Checklist.findOne({
            where: { program_id, entity_id, latest: true, is_deleted: false },
        });

        if (!checklist) {
            throw new Error("Checklist not found");
        }

        await Checklist.update(
            { is_enabled, updated_on: BigInt(Date.now()) },
            { where: { program_id, entity_id, latest: true, is_deleted: false } }
        );
    }

    async filterChecklists(
        program_id: string,
        filters: {
            is_enabled?: boolean | string;
            name?: string;
            sourcing_model?: 'contingent' | 'headcount_track' | 'sow';
            limit?: number | string;
            page?: number | string;
        }
    ) {
        const {
            is_enabled,
            name,
            sourcing_model,
            limit: rawLimit = '10',
            page: rawPage = '1',
        } = filters;

        const limit = Number(rawLimit);
        const page = Number(rawPage);
        const offset = (page - 1) * limit;

        const whereConditions: any = {
            latest: true,
            is_deleted: false,
            program_id,
        };

        if (sourcing_model) {
            whereConditions.sourcing_model = sourcing_model;
        }

        if (is_enabled !== undefined) {
            if (typeof is_enabled === 'string') {
                const lower = is_enabled.toLowerCase();
                if (lower === 'true') whereConditions.is_enabled = true;
                else if (lower === 'false') whereConditions.is_enabled = false;
            } else {
                whereConditions.is_enabled = is_enabled;
            }
        }

        if (name !== undefined) {
            whereConditions.name = {
                [Op.like]: `%${name}%`,
            };
        }

        const checklists = await Checklist.findAndCountAll({
            attributes: [
                'version_id',
                'entity_id',
                'name',
                'description',
                'version',
                'program_id',
                'is_enabled',
                [fn('COUNT', col('checklistTasks.id')), 'task_count'],
            ],
            include: [
                {
                    model: ChecklistMapping,
                    as: 'checklistTasks',
                    attributes: [],
                    where: {
                        is_deleted: false,
                        is_enabled: true,
                    },
                    required: false,
                },
            ],
            where: whereConditions,
            group: ['Checklist.version_id'],
            order: [['updated_on', 'DESC']],
            limit,
            offset,
            subQuery: false,
        });

        return {
            checklists: checklists.rows.map((checklist: any) => ({
                ...checklist.get(),
            })),
            total_count: checklists.count.length,
            current_page: page,
        };
    }

    async listChecklists(program_id: string, name?: string) {
        const whereConditions: any = {
            latest: true,
            is_enabled: true,
            program_id,
            ...(!name ? {} : { name: { [Op.like]: `%${name}%` } })
        };

        const checklists = await Checklist.findAll({
            where: whereConditions,
            order: [['name', 'ASC']],
            attributes: ['name', 'entity_id', 'version', 'version_id'],
        });

        return checklists;
    }
}
