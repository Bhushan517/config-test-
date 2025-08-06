import { FastifyRequest, FastifyReply } from 'fastify';
import foundationalDataTypes from '../models/master-datatypes.model';
import { FoundationalDataTypesInterface } from '../interfaces/master-datatypes.interface';
import generateCustomUUID from '../utility/genrateTraceId';
import { Op, QueryTypes } from 'sequelize';
import foundationalDataModel from '../models/master-data.model';
import { sequelize } from '../config/instance';
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { getMasterDataCustomFields, masterDataTypeAdvanceFilter } from '../utility/queries';
import MasterDataCustomFieldModel from '../models/master-data-custom-fields';
import MasterDataTypeHierarchy from '../models/master-data-type-hierarchy.model';
import Hierarchies from '../models/hierarchies.model';
import GlobalRepository from '../repositories/global.repository';
import FoundationalData from '../models/master-data.model';

export const createFoundationalDataTypes = async (request: FastifyRequest, reply: FastifyReply) => {
    const foundationalDataPayload = request.body as Omit<FoundationalDataTypesInterface, '_id'>;
    const { program_id } = request.params as { program_id: string };
    const name = foundationalDataPayload.name.trim();
    const traceId = generateCustomUUID();
    const user = request?.user
    const userId = user?.sub;
    const transaction = await sequelize.transaction();

    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: user?.preferred_username,
                user_id: user?.sub,
            },
            data: request.body,
            eventname: "creating foundational data types",
            status: "success",
            description: `Creating foundational data types for ${program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false
        },
        foundationalDataTypes
    );

    try {
        const existingFoundationalDataTypeWithSameName = await foundationalDataTypes.findOne({
            where: {
                name,
                program_id,
                is_deleted: false
            },
            transaction
        });

        if (existingFoundationalDataTypeWithSameName) {
            await transaction.rollback();
            return reply.status(400).send({
                status_code: 400,
                message: "Master Data Type Already Exists",
                trace_id: traceId,
            });
        }

        const seqNumber = await foundationalDataTypes.max('seq_number', {
            where: {
                program_id,
                is_deleted: false,
            },
        }) as number || null;
        const newSeqNumber = (seqNumber || 0) + 1;
        const foundationalData: any = await foundationalDataTypes.create({
            ...foundationalDataPayload,
            name,
            program_id,
            seq_number: newSeqNumber,
            created_by: userId,
            updated_by: userId,
            created_on: Date.now(),
            updated_on: Date.now(),
        }, { transaction });

        if (foundationalDataPayload.hierarchy && Array.isArray(foundationalDataPayload.hierarchy)) {
            for (const hierarchyId of foundationalDataPayload.hierarchy) {
                if (hierarchyId) {
                    await MasterDataTypeHierarchy.create({
                        master_data_type_id: foundationalData.id,
                        hierarchy_id: hierarchyId
                    }, { transaction });
                }
            }
        }

        if (Array.isArray(foundationalDataPayload.custom_fields) && foundationalDataPayload.custom_fields.length > 0) {
            const customFields = foundationalDataPayload.custom_fields.map((field: {
                id: any; value: any;
            }) => ({
                program_id,
                custom_field_id: field.id,
                value: field.value,
                master_data_type_id: foundationalData.id,
            }));
            await MasterDataCustomFieldModel.bulkCreate(customFields, { transaction });
        }

        await transaction.commit();

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "created foundational data types",
                status: "success",
                description: `Created foundational data types for ${program_id} successfully: ${foundationalData?.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            foundationalDataTypes
        );

        return reply.status(201).send({
            status_code: 201,
            message: "Data created successfully",
            data: {
                id: foundationalData?.id,
                name: foundationalData?.name,
            },
            trace_id: traceId,
        });

    } catch (error: any) {
        await transaction.rollback();

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "creating foundational data types",
                status: "error",
                description: `Error creating foundational data types for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            foundationalDataTypes
        );

        return reply.status(500).send({
            status_code: 500,
            message: 'Error while creating foundational data type',
            trace_id: traceId,
            error: error.message
        });
    }
};

export const updateFoundationalDataTypes = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params as { id: string, program_id: string };
    const foundationalDataPayload = request.body as FoundationalDataTypesInterface;
    let { name } = foundationalDataPayload;
    name = name.trim();

    const user = request?.user
    const userId = user?.sub;
    const transaction = await sequelize.transaction();
    try {
        const existingDataType = await foundationalDataTypes.findOne({
            where: {
                name: sequelize.where(sequelize.fn('lower', sequelize.col('name')), sequelize.fn('lower', name)),
                id: { [Op.ne]: id },
                program_id,
                is_deleted: false,
            }
        });

        if (existingDataType) {
            return reply.status(400).send({
                status_code: 400,
                message: "Master Data Type Already Exists.",
                trace_id: traceId,
            });
        }

        const data = await foundationalDataTypes.findByPk(id);
        if (!data) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Foundational Datatype not found',
                trace_id: traceId,
            });
        }

        await data.update({
            ...foundationalDataPayload,
            updated_on: Date.now(),
            updated_by: userId,
        }, { transaction });

        if (Array.isArray(foundationalDataPayload.custom_fields)) {
            await MasterDataCustomFieldModel.destroy({
                where: { master_data_type_id: id },
                transaction
            });

            if (foundationalDataPayload.custom_fields.length > 0) {
                const customFieldsToInsert = foundationalDataPayload.custom_fields.map(field => ({
                    program_id,
                    custom_field_id: field.id,
                    value: field.value,
                    master_data_type_id: id,
                }));
                await MasterDataCustomFieldModel.bulkCreate(customFieldsToInsert, { transaction });
            }
        }

        if (Array.isArray(foundationalDataPayload.hierarchy)) {
            await MasterDataTypeHierarchy.destroy({
                where: { master_data_type_id: id },
                transaction
            });

            for (const hierarchyId of foundationalDataPayload.hierarchy) {
                if (hierarchyId) {
                    await MasterDataTypeHierarchy.create({
                        master_data_type_id: id,
                        hierarchy_id: hierarchyId
                    }, { transaction });
                }
            }
        }

        await transaction.commit();

        reply.status(200).send({
            status_code: 200,
            foundational_datatype_id: id,
            message: 'Foundational Data Type updated successfully.',
            trace_id: traceId,
        });

    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error updating Foundational Data Type',
            trace_id: traceId,
            error: error.message,
        });
    }
};

export const deleteFoundationalDataTypes = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();

    const user = request?.user
    const userId = user?.sub
    try {
        const { id } = request.params as { id: string };
        const data = await foundationalDataTypes.findOne({
            where: { id },
        });

        if (!data) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Foundational Datatypes not found',
                trace_id: traceId,
            });
        }

        await data.update({ is_enabled: false, is_deleted: true, updated_by: userId, });
        reply.status(204).send({
            status_code: 204,
            foundational_datatype_id: id,
            message: 'Foundational data type Deleted Successfully',
            trace_id: traceId,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Error deleting foundational data',
            trace_id: traceId,
        });
    }
}

export async function getFoundationalDataTypeById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { id, program_id } = request.params as { id: string, program_id: string };
    try {
        const foundationalDataType: any = await foundationalDataTypes.findOne({
            where: {
                id,
                program_id,
                is_deleted: false,
            },
            attributes: ['id', 'name', 'description', 'is_enabled', 'created_on', 'updated_on', 'program_id', 'configuration', 'associations', 'is_all_hierarchy_associated']
        });

        if (foundationalDataType) {
            const foundationalDataCount = await foundationalDataModel.count({
                where: {
                    foundational_data_type_id: id,
                    is_deleted: false
                }
            });

            const associationIds = foundationalDataType.associations || [];

            const associatedDataTypes = await foundationalDataTypes.findAll({
                where: {
                    id: associationIds,
                    is_deleted: false
                },
                attributes: ['id', 'name']
            });

            const [customFieldResults]: any = await sequelize.query(getMasterDataCustomFields, {
                replacements: { program_id, id },
                type: QueryTypes.SELECT,
            });
            const hierarchie = await MasterDataTypeHierarchy.findAll({
                where: { master_data_type_id: id },
                include: [
                    {
                        model: Hierarchies,
                        as: 'hierarchy',
                        attributes: ['id', 'name'],
                    },
                ],
            }).then((data) => data.map((item) => item.hierarchy));

            const foundationalDataTypeResponse = {
                ...foundationalDataType.dataValues,
                foundational_data_count: foundationalDataCount,
                associated_data_types: associatedDataTypes,
                custom_fields: customFieldResults?.custom_fields || [],
                hierarchies: hierarchie || []
            };

            reply.status(200).send({
                status_code: 200,
                message: "Foundational data get successfully",
                foundational_data: foundationalDataTypeResponse,
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'Foundational datatype not found',
                foundational_data: [],
                trace_id: traceId,
            });
        }
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function getAllFoundationalDataTypes(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const responseFields = [
        'id',
        'program_id',
        'name',
        'is_enabled',
        'updated_on',
        'description',
        'configuration',
        'seq_number'
    ];
    const { program_id } = request.params as { program_id: string };
    const {
        name,
        is_enabled,
        updated_on,
        timesheet_master_data,
        user_association_exclude,
        page = '1',
        limit = '10',
        track_owner
    } = request.query as {
        name?: string;
        is_enabled?: string;
        updated_on?: string;
        timesheet_master_data?: string;
        user_association_exclude?: string;
        page?: string;
        limit?: string;
        track_owner?: string;
    };

    try {
        const filters: any = { program_id, is_deleted: false };

        if (name) filters.name = { [Op.like]: `%${name}%` };
        if (is_enabled !== undefined) filters.is_enabled = is_enabled === 'true';
        if (updated_on) {
            const modifiedOnRange = updated_on.split(',').map(Number);
            if (modifiedOnRange.length === 2) {
                filters.updated_on = { [Op.between]: [modifiedOnRange[0], modifiedOnRange[1]] };
            }
        }
        if (timesheet_master_data !== undefined) {
            filters['configuration.timesheet_master_data'] = timesheet_master_data === 'true';
        }
        if (user_association_exclude !== undefined) {
            filters['configuration.user_association_exclude'] = user_association_exclude === 'true';
        }
        if (track_owner !== undefined) {
            filters['configuration.track_owner'] = track_owner === 'true';
        }

        const offset = (Number(page) - 1) * Number(limit);

        const { rows: foundationalDataItems, count: totalRecords } =
            await foundationalDataTypes.findAndCountAll({
                where: filters,
                attributes: responseFields,
                offset,
                limit: Number(limit),
                order: [['seq_number', 'ASC']],
            });

        if (!foundationalDataItems.length) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Foundational data not found',
                foundationalData: [],
                trace_id: traceId,
            });
        }

        const foundationalDataTypeIds = foundationalDataItems.map((item) => item.dataValues.id);

        const foundationalDataCounts = await foundationalDataModel.findAll({
            where: {
                foundational_data_type_id: { [Op.in]: foundationalDataTypeIds },
                is_deleted: false,
            },
            attributes: [
                'foundational_data_type_id',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            ],
            group: ['foundational_data_type_id'],
        });

        const foundationalDataCountMap = foundationalDataCounts.reduce(
            (map: Map<string, number>, item: any) => {
                map.set(item.dataValues.foundational_data_type_id, item.dataValues.count);
                return map;
            },
            new Map<string, number>()
        );

        const populatedFoundationalData = foundationalDataItems.map((item) => ({
            ...item.dataValues,
            updated_on: item.dataValues.updated_on
                ? Number(item.dataValues.updated_on)
                : null,
            foundational_data_count: foundationalDataCountMap.get(item.dataValues.id) ?? 0,
        }));

        reply.send({
            status_code: 200,
            message: 'Foundational get successfully',
            total_records: totalRecords,
            foundationalData: populatedFoundationalData,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function getAllFoundationalDataTypesAdvancedFilter(
    request: FastifyRequest<{
        Params: { program_id: string };
    }>,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params;

        const user = request.user;
        if (!user) {
            return reply.status(400).send({ status_code: 400, message: 'user is required.' });
        }

        const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);

        const {
            name,
            is_enabled,
            updated_on,
            timesheet_master_data,
            user_association_exclude,
            page = 1,
            limit = 10,
            track_owner,
            hierarchy_ids,
            allow_multiple_sows,
            allow_multiple_jobs,
            order_by_seq_number
        } = request.body as {
            name?: string;
            is_enabled?: boolean;
            updated_on?: any;
            timesheet_master_data?: boolean;
            user_association_exclude?: boolean;
            page?: number;
            limit?: number;
            track_owner?: boolean;
            hierarchy_ids?: string[];
            allow_multiple_sows?: boolean;
            allow_multiple_jobs?: boolean;
            order_by_seq_number?: boolean;
        };

        const offset = (page - 1) * limit;

        const hasUpdatedOnFilter = Array.isArray(updated_on) && updated_on.length > 0;
        let updatedOnStart: number | undefined = undefined;
        let updatedOnEnd: number | undefined = undefined;

        if (hasUpdatedOnFilter) {
            const startDate = new Date(updated_on[0]);
            updatedOnStart = startDate.setHours(0, 0, 0, 0);

            if (updated_on.length === 1 || updated_on[1] === 0) {
                updatedOnEnd = new Date(updated_on[0]).setHours(23, 59, 59, 999);
            } else {
                updatedOnEnd = new Date(updated_on[1]).setHours(23, 59, 59, 999);
            }
        }

        let allowMultipleSowsStr: string | null = null;
        if (typeof allow_multiple_sows === 'boolean') {
            allowMultipleSowsStr = allow_multiple_sows ? 'true' : 'false';
        }

        let allowMultipleJobStr: string | null = null;
        if (typeof allow_multiple_jobs === 'boolean') {
            allowMultipleJobStr = allow_multiple_jobs ? 'true' : 'false';
        }

        const replacements: any = {
            program_id,
            name: name ?? null,
            is_enabled: is_enabled ?? null,
            updated_on_start: updatedOnStart,
            updated_on_end: updatedOnEnd,
            timesheet_master_data: timesheet_master_data ?? null,
            user_association_exclude: user_association_exclude ?? null,
            track_owner: track_owner ?? null,
            allow_multiple_sows: allowMultipleSowsStr,
            allow_multiple_jobs: allowMultipleJobStr,
            limit,
            offset
        };

        let hierarchyFilter = '';
        if (hierarchy_ids && hierarchy_ids.length > 0) {
            hierarchyFilter = `
            AND (
                mdt.is_all_hierarchy_associated = 1
                OR mdt.id IN (
                    SELECT master_data_type_id
                    FROM master_data_type_hierarchy
                    WHERE hierarchy_id IN (:hierarchy_ids)
                )
            )`;
            replacements.hierarchy_ids = hierarchy_ids;
        }

        let mspHierarchyFilter = '';
        if (mspHierarchyIds && mspHierarchyIds.length > 0) {
            mspHierarchyFilter = `
            AND (
                mdt.is_all_hierarchy_associated = 1
                OR mdt.id IN (
                    SELECT master_data_type_id
                    FROM master_data_type_hierarchy
                    WHERE hierarchy_id IN (:mspHierarchyIds)
                )
            )`;
            replacements.mspHierarchyIds = mspHierarchyIds;
        }

        const foundationalDataItems: any[] = await sequelize.query(
            masterDataTypeAdvanceFilter(hierarchyFilter, mspHierarchyFilter, hasUpdatedOnFilter, order_by_seq_number===true),
            {
                replacements,
                type: QueryTypes.SELECT,
            }
        );

        const totalRecords = foundationalDataItems.length > 0 ? foundationalDataItems[0].total_count : 0;

        reply.send({
            status_code: 200,
            message: foundationalDataItems.length > 0
                ? 'Master data type retrieved successfully'
                : 'No master data type found',
            total_records: totalRecords,
            foundationalData: foundationalDataItems,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            statusCode: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function foundationaDataTypeReorder(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const { master_data_type_ids } = request.body as {
        master_data_type_ids: { id: string; seq_number: number }[];
    };

    await sequelize.transaction(async (t) => {
        await Promise.all(
            master_data_type_ids.map(master =>
                foundationalDataTypes.update(
                    { seq_number: master.seq_number },
                    {
                        where: { program_id, id: master.id },
                        transaction: t
                    }
                )
            )
        );
    });

    reply.send({
        status_code: 200,
        message: "Master Data type sequence updated successfully",
        traceId: traceId,
    });
}


