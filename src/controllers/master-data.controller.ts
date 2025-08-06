import { FastifyRequest, FastifyReply } from "fastify";
import foundationalData from "../models/master-data.model";
import { FoundationalDataInterface } from "../interfaces/master-data.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { decodeToken } from '../middlewares/verifyToken';
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
import { countFoundationDataQuery, foundationDataQuery, masterDataAdvanceFilterQuery } from "../utility/queries";
import FoundationalDataTypes from "../models/master-datatypes.model";
import User from "../models/user.model";
import MasterDataHierarchy from "../models/master-data-hierarchy.model";
import Hierarchies from "../models/hierarchies.model";
import GlobalRepository from "../repositories/global.repository";
import MasterDataTypeHierarchy from "../models/master-data-type-hierarchy.model";

export async function getFoundationalData(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const params = request.params as { program_id: string };
        const query = request.query as {
            id?: string;
            name?: string;
            is_enabled?: string;
            updated_on?: string;
            manager_ids?: string;
            code?: string;
            foundational_data_type_id?: string;
            first_name: string;
            page?: string;
            limit?: string;
            is_billable?: string;
        };

        const page = parseInt(query.page ?? '1');
        const limit = parseInt(query.limit ?? '10');
        const offset = (page - 1) * limit;

        let updated_on_start = null;
        let updated_on_end = null;

        if (query.updated_on) {
            const modifiedOnRange = query.updated_on.split(',');
            if (modifiedOnRange.length === 2) {
                updated_on_start = modifiedOnRange[0];
                updated_on_end = modifiedOnRange[1];
            }
        }

        const filters: any = {
            program_id: params.program_id,
            id: query.id ?? null,
            name: query.name ? `%${query.name}%` : null,
            is_enabled: query.is_enabled !== undefined ? query.is_enabled === 'true' : null,
            updated_on_start,
            updated_on_end,
            manager_ids: query.manager_ids ?? null,
            code: query.code ? `%${query.code}%` : null,
            foundational_data_type_id: query.foundational_data_type_id ?? null,
            first_name: query.first_name ? `%${query.first_name}%` : null,
            is_billable: query.is_billable !== undefined ? query.is_billable === 'true' : null,
            limit,
            offset
        };

        // if (query.is_billable !== undefined) {
        //     filters.is_billable = query.is_billable === 'true';
        // }
        const [foundationalDataResult, countResult] = await Promise.all([
            sequelize.query(foundationDataQuery, {
                replacements: filters,
                type: QueryTypes.SELECT,
            }),
            sequelize.query(countFoundationDataQuery, {
                replacements: filters,
                type: QueryTypes.SELECT,
            })
        ]);

        const totalRecords = (countResult[0] as any).total;

        const foundationalDataArray = foundationalDataResult.map((row: any) => ({
            ...row,
            slug: row.slug,
            depended_fields: typeof row.depended_fields === 'string' ? JSON.parse(row.depended_fields) : row.depended_fields
        }));

        let foundationalDataTypeName = 'null';
        if (foundationalDataArray.length > 0) {
            foundationalDataTypeName = foundationalDataArray[0].foundational_data_type_name;
        } else if (query.foundational_data_type_id) {
            const foundationalDataType: any = await FoundationalDataTypes.findByPk(query.foundational_data_type_id, {
                attributes: ['name']
            });
            foundationalDataTypeName = foundationalDataType.name || null;
        }

        if (foundationalDataResult.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                foundational_data_type_name: foundationalDataTypeName,
                message: "foundational data not found",
                foundational_data: [],
                trace_id: traceId,
            });
        }

        reply.status(200).send({
            status_code: 200,
            message: "Foundational data get successfully",
            foundational_data_type_name: foundationalDataTypeName,
            total_records: totalRecords,
            foundational_data: foundationalDataArray,
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function getFoundationalDataById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();

    try {
        const { program_id, id } = request.params as { program_id: string, id: string };

        const foundational_data = await foundationalData.findOne({ where: { program_id, id } });

        if (!foundational_data) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Master Data Not Found.',
                trace_id: traceId,
            });
        }

        const populatedManagers = foundational_data.manager_ids?.length
            ? await User.findAll({
                where: { id: foundational_data.manager_ids },
                attributes: ['id', 'first_name', 'last_name'],
            })
            : [];

        const configuration: any = foundational_data.foundational_data_type_id
            ? await FoundationalDataTypes.findOne({
                where: { id: foundational_data.foundational_data_type_id },
                attributes: ['id', 'configuration', 'is_all_hierarchy_associated'],
            })
            : [];

        let hierarchie = [];

        if (foundational_data.is_all_hierarchy_associated) {
            if (configuration.is_all_hierarchy_associated) {
                hierarchie = await Hierarchies.findAll({
                    where: { program_id, is_deleted: false },
                    attributes: ['id', 'name'],
                });
            } else {
                hierarchie = await MasterDataTypeHierarchy.findAll({
                    where: { master_data_type_id: configuration.id },
                    include: [
                        {
                            model: Hierarchies,
                            as: 'hierarchy',
                            attributes: ['id', 'name'],
                        },
                    ],
                }).then((data) => data.map((item) => item.hierarchy));
            }
        } else {
            hierarchie = await MasterDataHierarchy.findAll({
                where: { master_data_id: id },
                include: [
                    {
                        model: Hierarchies,
                        as: 'hierarchy',
                        attributes: ['id', 'name'],
                    },
                ],
            }).then((data) => data.map((item) => item.hierarchy));
        }

        const populatedAdditionalOwners = foundational_data.additional_mdt_owner?.length
            ? await User.findAll({
                where: { id: foundational_data.additional_mdt_owner },
                attributes: ['id', 'first_name', 'last_name'],
            })
            : [];

        reply.status(200).send({
            status_code: 200,
            message: 'Master data fetched successfully.',
            foundational_data: {
                ...foundational_data.toJSON(),
                manager_ids: populatedManagers,
                hierarchies: hierarchie || [],
                additional_mdt_owner: populatedAdditionalOwners,
                foundational_data_type_id: configuration
            },
            trace_id: traceId,
        });
    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching FoundationalData.',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function createFoundationalData(request: FastifyRequest, reply: FastifyReply) {
    const { program_id } = request.params as { program_id: string }
    const foundational_data = request.body as FoundationalDataInterface;
    const { name, code } = foundational_data;
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
    const user = request?.user;
    const userId = user?.sub;

    try {
        const duplicateCheck = await foundationalData.findOne({
            where: {
                [Op.or]: [
                    { name: name.trim() },
                    {
                        code: sequelize.where(
                            sequelize.fn('lower', sequelize.col('code')),
                            sequelize.fn('lower', code.trim())
                        )
                    }
                ],
                program_id,
                is_deleted: false,
                foundational_data_type_id: foundational_data.foundational_data_type_id,
            },
            attributes: ['name', 'code'],
            transaction,
        });

        if (duplicateCheck) {
            const isDuplicateName = duplicateCheck.name === name.trim();
            const errorMessage = isDuplicateName
                ? "Master data with same name already exist."
                : "Master data with same code already exist.";

            return reply.status(400).send({
                status_code: 400,
                message: errorMessage,
                trace_id: traceId,
            });
        }

        const foundational_Data = await foundationalData.create({
            ...foundational_data,
            program_id,
            created_by: userId,
            updated_by: userId,
            created_on: Date.now(),
            updated_on: Date.now(),
        }, { transaction });

        if (foundational_data.hierarchy) {
            for (const hierarchyId of foundational_data.hierarchy) {
                if (hierarchyId) {
                    await MasterDataHierarchy.create({
                        master_data_id: foundational_Data.id,
                        hierarchy_id: hierarchyId
                    }, { transaction });
                }
            }
        }
        await transaction.commit();

        reply.status(201).send({
            status_code: 201,
            foundational_data_id: foundational_Data.id,
            trace_id: traceId,
            message: 'Master data created successfully.',
        });

    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while creating master data.',
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function updateFoundationalData(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params as { program_id: string, id: string };
    const foundational_data = request.body as FoundationalDataInterface;
    let { name, hierarchy } = foundational_data;
    name = name.trim();
    const user = request?.user;
    const userId = user?.sub;
    const transaction = await sequelize.transaction();

    try {
        const existingFoundationalDataWithSameName = await foundationalData.findOne({
            where: {
                name: sequelize.where(sequelize.fn('lower', sequelize.col('name')), sequelize.fn('lower', name)),
                id: { [Op.ne]: id },
                program_id,
                foundational_data_type_id: foundational_data.foundational_data_type_id,
                is_deleted: false,
            },
        });

        if (existingFoundationalDataWithSameName) {
            await transaction.rollback();
            return reply.status(400).send({
                status_code: 400,
                message: "Master Data with the same name already exists.",
                trace_id: traceId,
            });
        }

        const existingMasterData = await foundationalData.findOne({
            where: { program_id, id, is_deleted: false },
        });

        if (!existingMasterData) {
            await transaction.rollback();
            return reply.status(404).send({
                status_code: 404,
                message: 'Foundational data not found.',
                trace_id: traceId,
            });
        }

        await existingMasterData.update(
            {
                ...foundational_data,
                updated_on: Date.now(),
                updated_by: userId,
            },
            { transaction }
        );

        if (hierarchy && Array.isArray(hierarchy)) {
            await MasterDataHierarchy.destroy({
                where: { master_data_id: id },
                transaction,
            });

            for (const hierarchyId of hierarchy) {
                if (hierarchyId) {
                    await MasterDataHierarchy.create({
                        master_data_id: id,
                        hierarchy_id: hierarchyId
                    }, { transaction });
                }
            }
        }

        await transaction.commit();

        return reply.status(200).send({
            status_code: 200,
            message: 'Foundational data updated successfully.',
            trace_id: traceId,
        });

    } catch (error: any) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
}

export async function deleteFoundationalData(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub;
    try {
        const { program_id, id } = request.params as { program_id: string, id: string };
        const foundational_data = await foundationalData.findOne({ where: { program_id, id } });
        if (foundational_data) {
            await foundationalData.update({ is_deleted: true, is_enabled: false, updated_by: userId }, { where: { program_id, id } });
            reply.status(204).send({
                status_code: 204,
                message: 'FoundationalData deleted successfully.',
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'FoundationalData not found.',
                trace_id: traceId,
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting FoundationalData.',
            trace_id: traceId,
        });
    }
}

export async function foundationalDataFilter(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    try {   
        const user = request.user;
        if (!user) {
            return reply.status(400).send({ status_code: 400, message: 'user is requried.' });
        }
        const userId=user?.sub
        const [getUserData] = await GlobalRepository.findUser(program_id, userId);

        const isAllHierarchyAssociated = getUserData?.is_all_hierarchy_associate === 1;
        const userHierarchyIds: string[] = getUserData?.associate_hierarchy_ids || [];
        const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);

        const query = request.query as { master_data_type_id?: string };
        const body = request.body as {
            source?: string;
            id?: string;
            name?: string;
            is_enabled?: boolean;
            updated_on?: any;
            manager_ids?: string;
            code?: string;
            first_name?: string;
            page?: number;
            limit?: number;
            is_billable?: boolean;
            hierarchy_ids?: string[];
        };
        if (
            ['job', 'offer', 'assignment'].includes(body.source || '') &&
            Array.isArray(body.hierarchy_ids) &&
            body.hierarchy_ids.length > 0
        ) {
            const hasMatchingHierarchy = body.hierarchy_ids.some(hid =>
                userHierarchyIds.includes(hid)
            );

            if (!isAllHierarchyAssociated && !hasMatchingHierarchy) {
                return reply.status(200).send({
                    status_code: 200,
                    message: `No matching data found for provided hierarchy.`,
                    foundational_data_type_name: null,
                    total_records: 0,
                    data: [],
                    trace_id: traceId,
                });
            }
        }
        const page = body.page ?? 1;
        const limit = body.limit ?? 10;
        const offset = (page - 1) * limit;

        const hasUpdatedOnFilter = Array.isArray(body.updated_on) && body.updated_on.length > 0;
        let updatedOnStart: number | undefined = undefined;
        let updatedOnEnd: number | undefined = undefined;

        if (hasUpdatedOnFilter) {
            const startDate = new Date(body.updated_on[0]);
            updatedOnStart = startDate.setHours(0, 0, 0, 0);

            if (body.updated_on.length === 1 || body.updated_on[1] === 0) {
                updatedOnEnd = new Date(body.updated_on[0]).setHours(23, 59, 59, 999);
            } else {
                updatedOnEnd = new Date(body.updated_on[1]).setHours(23, 59, 59, 999);
            }
        }

        const replacements: any = {
            program_id: program_id,
            foundational_data_type_id: query.master_data_type_id ?? null,
            id: body.id ?? null,
            name: body.name ? `%${body.name}%` : null,
            is_enabled: body.is_enabled ?? null,
            updated_on_start: updatedOnStart ?? null,
            updated_on_end: updatedOnEnd ?? null,
            manager_ids: body.manager_ids ?? null,
            code: body.code ? `%${body.code}%` : null,
            first_name: body.first_name ? `%${body.first_name}%` : null,
            limit,
            offset,
        };

        let hierarchyFilter = '';
        if (body.hierarchy_ids && body.hierarchy_ids.length > 0 && !body.source) {
            hierarchyFilter = `
            AND (
              md.is_all_hierarchy_associated = 1
              OR md.id IN (
                SELECT master_data_id
                FROM master_data_hierarchy
                WHERE hierarchy_id IN (:hierarchy_ids)
                )
            )`;
            replacements.hierarchy_ids = body.hierarchy_ids;
        }

        let mspHierarchyFilter = '';
        if (mspHierarchyIds && mspHierarchyIds.length > 0) {
            mspHierarchyFilter = `
            AND (
               md.is_all_hierarchy_associated = 1
               OR md.id IN (
                SELECT master_data_id
                FROM master_data_hierarchy
                WHERE hierarchy_id IN (:mspHierarchyIds)
               )
            )
            `;
            replacements.mspHierarchyIds = mspHierarchyIds;
        }

        let finalHierarchyIds: string[] = [];
        if (isAllHierarchyAssociated) {
            if (Array.isArray(body.hierarchy_ids) && body.hierarchy_ids.length > 0) {
                finalHierarchyIds = body.hierarchy_ids;
            }
        } else {
            if (Array.isArray(body.hierarchy_ids) && body.hierarchy_ids.length > 0) {
                finalHierarchyIds = body.hierarchy_ids.filter(hid => userHierarchyIds.includes(hid));
            } else {
                finalHierarchyIds = userHierarchyIds;
            }
        }

        let userHierarchyFilter = '';
        if (finalHierarchyIds.length > 0) {
            userHierarchyFilter = `
                AND (
                    md.is_all_hierarchy_associated = 1
                    OR md.id IN (
                        SELECT master_data_id
                        FROM master_data_hierarchy
                        WHERE hierarchy_id IN (:hierarchie_ids)
                    )
                )`;
            replacements.hierarchie_ids = finalHierarchyIds;
        }

        let masterDataType: string | null = null;
        if (query.master_data_type_id) {
            const foundationalDataTypeResult = await sequelize.query<any>(
                `SELECT name FROM master_data_type WHERE id = :foundational_data_type_id`,
                {
                    replacements,
                    type: QueryTypes.SELECT,
                }
            );
            if (foundationalDataTypeResult.length > 0) {
                masterDataType = foundationalDataTypeResult[0].name;
            }
        }

        const foundationalDataResult = await sequelize.query<{ total_count: any }>(
            masterDataAdvanceFilterQuery(hierarchyFilter, mspHierarchyFilter,userHierarchyFilter),
            {
                replacements,
                type: QueryTypes.SELECT,
            }
        );
        const totalRecords = foundationalDataResult.length > 0 ? foundationalDataResult[0].total_count : 0;
        const foundationalDataArray = foundationalDataResult.map((row: any) => ({
            ...row,
            slug: row.slug,
            depended_fields:
                typeof row.depended_fields === 'string'
                    ? JSON.parse(row.depended_fields)
                    : row.depended_fields,
        }));

        reply.status(200).send({
            status_code: 200,
            message: 'Foundational data retrieved successfully',
            foundational_data_type_name: masterDataType,
            total_records: totalRecords,
            data: foundationalDataArray,
            trace_id: traceId,
        });
    } catch (error: any) {
        const safeError = error instanceof Error ? error.message : JSON.stringify(error);
        reply.status(500).send({
            status_code: 500,
            message: 'Internal server error',
            trace_id: traceId,
            error: safeError,
        });
    }

}

export async function bulkCreateMasterData(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const masterDataList = request.body as any[];
    const traceId = generateCustomUUID();
    const user = request?.user;

    const results: any[] = [];

    for (const data of masterDataList) {
        const transaction = await sequelize.transaction();
        try {
            const { master_data_type_name, name, code, is_enabled, is_all_hierarchy_associated, hierarchy } = data;

            const masterDataTypes = await FoundationalDataTypes.findOne({
                where: {
                    name: master_data_type_name,
                    program_id,
                    is_deleted: false,
                },
            });
            if (!masterDataTypes) {
                throw new Error(`Master data type "${master_data_type_name}" not found`);
            }

            const existingByName = await foundationalData.findOne({
                where: { name, program_id, is_deleted: false },
            });

            if (existingByName) {
                throw new Error(`Master Data "${name}" already exists`);
            }

            const existingByCode = await foundationalData.findOne({
                where: {
                    code: sequelize.where(
                        sequelize.fn('lower', sequelize.col('code')),
                        sequelize.fn('lower', code)
                    ),
                    program_id,
                    is_deleted: false,
                },
            });

            if (existingByCode) {
                throw new Error(`Master Data with code "${code}" already exists`);
            }

            const newMasterData = await foundationalData.create(
                {
                    name,
                    code,
                    is_enabled: true,
                    is_all_hierarchy_associated,
                    foundational_data_type_id: masterDataTypes.id,
                    program_id,
                    created_on: Date.now(),
                    updated_on: Date.now(),
                },
                { transaction }
            );

            if (Array.isArray(hierarchy) && hierarchy.length > 0) {
                for (const h of hierarchy) {
                    const foundHierarchy = await Hierarchies.findOne({
                        where: {
                            name: h.name,
                            code: h.code,
                            program_id,
                            is_deleted: false,
                        },
                    });

                    if (!foundHierarchy) {
                        throw new Error(`Hierarchy "${h.name}" with code "${h.code}" not found`);
                    }

                    await MasterDataHierarchy.create(
                        {
                            master_data_id: newMasterData.id,
                            hierarchy_id: foundHierarchy.id,
                        },
                        { transaction }
                    );
                }
            }

            await transaction.commit();

            results.push({
                status: 'success',
                foundational_data_id: newMasterData.id,
                name,
                code,
            });
        } catch (error: any) {
            await transaction.rollback();
            results.push({
                status: 'failed',
                name: data.name,
                code: data.code,
                error: error.message,
            });
        }
    }

    reply.status(201).send({
        status_code: 201,
        trace_id: traceId,
        message: 'Master data created successfully.',
    });
}

