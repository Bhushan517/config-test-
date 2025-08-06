import { FastifyRequest, FastifyReply } from "fastify";
import vendorDistributionScheduleModel from "../models/vendor-distribution-schedule.model";
import { UpdateVendorDistributionScheduleDetail, VendorDistributionSchedule } from "../interfaces/vendor-distribution-schedule.interface"
import generateCustomUUID from "../utility/genrateTraceId";
import { baseSearch } from "../utility/baseService";
import DistScheduleDetail from "../models/dist-schedule-detail.model";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { ProgramVendor } from "../models/program-vendor.model";
import { sequelize } from "../config/instance";
import { QueryTypes } from "sequelize";
import { vendorDistributionScheduleFilterQuery, getVendorDistributionSchedule } from "../utility/queries";

export const createVendorDistributionSchedule = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const { program_id } = request.params as { program_id: string };
    const vendorDistributionScheduleData = request.body as VendorDistributionSchedule;
    const transaction = await sequelize.transaction();
    const user = request?.user;
    const userId = user?.sub;
    const traceId = generateCustomUUID();
    try {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "creating vendor distribution schedule",
                status: "success",
                description: `Creating vendor distribution schedule for ${program_id}`,
                level: 'info',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendorDistributionScheduleModel
        );

        const { schedules, ...scheduleData } = vendorDistributionScheduleData;
        const existingSchedule = await vendorDistributionScheduleModel.findOne({
            where: {
                name: scheduleData.name,
                program_id: program_id,
            }, transaction

        });

        if (existingSchedule) {
            await transaction.rollback();
            return reply.status(409).send({
                status_code: 409,
                message: 'A vendor distribution schedule with this name already exists in the program.',
                trace_id: traceId,
            });
        }

        const newVendorSchedule = await vendorDistributionScheduleModel.create({
            ...scheduleData,
            program_id,
            created_by: userId,
            updated_by: userId,
        }, { transaction });

        if (Array.isArray(schedules)) {
            const schedulePromises = schedules.map((schedule) => {
                return DistScheduleDetail.create({
                    duration: schedule.duration,
                    measure_unit: schedule.measure_unit,
                    vendors: schedule.vendors || [],
                    distribution_id: newVendorSchedule.id,
                    condition: schedule.condition,
                    vendor_group_ids: schedule.vendor_group_ids,
                    created_by: userId,
                    updated_by: userId
                });
            }, { transaction });

            await Promise.all(schedulePromises);
        }
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId
                },
                data: request.body,
                eventname: "create vendor distribution schedule",
                status: "success",
                description: `Created vendor distribution schedule for ${program_id} successfully: ${newVendorSchedule.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendorDistributionScheduleModel
        );
        await transaction.commit();

        reply.status(201).send({
            status_code: 201,
            message: 'Vendor Distribution Schedule created successfully.',
            id: newVendorSchedule.id,
            trace_id: traceId,
        });
    } catch (error: any) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: userId
                },
                data: request.body,
                eventname: "create vendor distribution schedule",
                status: "error",
                description: `Error creating vendor distribution schedule for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            vendorDistributionScheduleModel
        );
        await transaction.rollback();
        console.log(error);

        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error.',
            trace_id: traceId,
            error: error
        });
    }
};

export async function getAllvendorDistributionSchedules(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['program_id', 'name', 'is_enabled', 'description', 'updated_on'];
    const responseFields = ['program_id', 'id', 'name', 'is_enabled', 'description', 'updated_on'];
    return baseSearch(request, reply, vendorDistributionScheduleModel, searchFields, responseFields);
}

export const getVendorDistributionScheduleById = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();

    try {
        const { program_id, id } = request.params as { program_id: string; id: string };

        const result = await sequelize.query<VendorDistributionSchedule>(getVendorDistributionSchedule, {
            replacements: { program_id, id },
            type: QueryTypes.SELECT
        });

        if (!result.length) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Vendor Distribution Schedule not found.',
                vendor_schedule: [],
                trace_id: traceId
            });
        }

        const responseData = {
            id: result[0].id,
            name: result[0].name,
            description: result[0].description,
            is_enabled: result[0].is_enabled,
            dist_schedule_detail: result.map((row: any) => ({
                id: row.detail_id,
                duration: row.duration,
                measure_unit: row.measure_unit,
                condition: row.condition,
                vendors: Array.from(new Set([
                    ...(row.vendors ?? []),
                    ...(row.vendor_groups ?? [])
                ]))
            }))
        };

        reply.status(200).send({
            status_code: 200,
            message: 'Vendor distribution schedule fetched successfully.',
            trace_id: traceId,
            vendor_schedule: responseData
        });

    } catch (error: any) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message
        });
    }
};

export const deleteVendorDistributionSchedule = async (
    request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub;
    try {
        const { id, program_id } = request.params as { id: string; program_id: string };
        const [vendorSchedule] = await vendorDistributionScheduleModel.update(
            {
                is_deleted: true,
                is_enabled: false,
                updated_on: Date.now(),
                updated_by: userId
            },
            { where: { id, program_id, is_deleted: false } }
        );
        const [distSchedule] = await DistScheduleDetail.update(
            {
                is_deleted: true,
                is_enabled: false,
                updated_on: Date.now(),
                updated_by: userId
            },
            { where: { distribution_id: id, is_deleted: false } }
        );

        if (vendorSchedule > 0 && distSchedule > 0) {
            reply.status(200).send({
                status_code: 200,
                message: "Vendor Distribution Schedule deleted successfully.",
                trace_id: traceId,
            });
        } else {
            reply.status(204).send({
                status_code: 204,
                message: "Vendor Distribution Schedule not found.",
                trace_id: traceId,
                vendor_schedule: [],
            });
        }
    } catch (error) {
        console.error("Error deleting Vendor Distribution Schedule:", error);
        reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error.",
            trace_id: traceId,
            error: error,
        });
    }
};

export const updateVendorDistributionSchedule = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const transaction = await sequelize.transaction();
    const user = request?.user;
    const userId = user?.sub;
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const updateData = request.body as UpdateVendorDistributionScheduleDetail;

        const vendorDistributionSchedule = await vendorDistributionScheduleModel.findOne({
            where: { program_id, id, is_deleted: false },
            transaction,
        });

        if (!vendorDistributionSchedule) {
            await transaction.rollback();
            return reply.status(200).send({
                status_code: 200,
                message: 'Vendor Distribution Schedule not found.',
                vendorDistributionSchedule: [],
                trace_id: traceId,
            });
        }

        if (updateData.name && updateData.name !== vendorDistributionSchedule.name) {
            const existingSchedule = await vendorDistributionScheduleModel.findOne({
                where: {
                    program_id,
                    name: updateData.name,
                    is_deleted: false,
                },
                transaction
            });

            if (existingSchedule) {
                await transaction.rollback();
                return reply.status(409).send({
                    status_code: 409,
                    message: 'A vendor distribution schedule with this name already exists.',
                    trace_id: traceId,
                });
            }
        }

        await vendorDistributionSchedule.update({
            ...updateData,
            updated_on:Date.now(),
            updated_by: userId
        }, { transaction });

        if (updateData.schedules && Array.isArray(updateData.schedules)) {

            await DistScheduleDetail.destroy({
                where: { distribution_id: id },
                transaction
            });

            for (const schedule of updateData.schedules) {
                await DistScheduleDetail.upsert({
                    id: schedule.id,
                    distribution_id: vendorDistributionSchedule.id,
                    duration: schedule.duration,
                    measure_unit: schedule.measure_unit,
                    vendors: schedule.vendors,
                    vendor_group_ids: schedule.vendor_group_ids,
                    condition: schedule.condition,
                    created_by: userId,
                    updated_by: userId
                }, { transaction });
            }
        }
        await transaction.commit();

        reply.status(200).send({
            status_code: 200,
            message: 'Vendor Distribution Schedule updated successfully.',
            trace_id: traceId,
        });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error
        });
    }
};

export const getVendorDistributionScheduleByIds = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const { program_industry, work_locations, hierarchies } = request.query as Record<string, string | undefined>;
        // Split query parameters into arrays
        const program_industry_ids = program_industry ? program_industry.split(',') : [];
        const work_location_ids = work_locations ? work_locations.split(',') : [];
        const hierarchy_ids = hierarchies ? hierarchies.split(',') : [];

        // Step 1: Fetch the vendor distribution schedule
        const vendorDistributionSchedule = await vendorDistributionScheduleModel.findOne({
            where: { program_id, id, is_deleted: false },
            attributes: ['id', 'name', 'description', 'is_enabled'],
        });

        if (!vendorDistributionSchedule) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Vendor Distribution Schedule not found.',
                vendor_schedule: [],
                trace_id: traceId,
            });
        }

        // Step 2: Fetch all program vendors
        const allProgramVendors = await ProgramVendor.findAll({
            attributes: ['id', 'program_industry', 'work_locations', 'hierarchies'],
        });

        // Step 3: Filter vendors based on conditions
        const vendorIds: string[] = [];  // Define vendorIds as a string array

        for (const vendor of allProgramVendors) {
            const matchesIndustry = vendor.program_industry && vendor.program_industry.some((industry: string) => program_industry_ids.includes(industry));
            const matchesLocation = vendor.work_locations && vendor.work_locations.some((location: string) => work_location_ids.includes(location));
            const matchesHierarchy = vendor.hierarchies && vendor.hierarchies.some((hierarchy: string) => hierarchy_ids.includes(hierarchy));

            // If the vendor matches any of the conditions, add it to the vendorIds array
            if (matchesIndustry || matchesLocation || matchesHierarchy) {
                vendorIds.push(vendor.id);
            }
        }

        console.log('Matching Vendor IDs:', vendorIds);

        // Step 4: Fetch distribution schedule details
        const distScheduleDetails = await DistScheduleDetail.findAll({
            where: {
                distrubution_id: id,
            },
            attributes: ['id', 'duration', 'measure_unit', 'vendors'],
        });

        // Step 5: Format distribution schedule details
        const formattedDistScheduleDetails = distScheduleDetails.map(detail => {
            const vendors = Array.isArray(detail.vendors) ? detail.vendors : [];
            const filteredVendors = vendors.filter(vendor => vendorIds.includes(vendor));

            return {
                id: detail.id,
                duration: detail.duration,
                measure_unit: detail.measure_unit,
                vendors: filteredVendors.length > 0 ? filteredVendors : [],
            };
        });
        const responseData = {
            id: vendorDistributionSchedule.id,
            name: vendorDistributionSchedule.name,
            description: vendorDistributionSchedule.description,
            is_enabled: vendorDistributionSchedule.is_enabled,
            dist_schedule_detail: formattedDistScheduleDetails,
        };

        reply.status(200).send({
            status_code: 200,
            message: 'Vendor Distribution Schedule fetched successfully.',
            vendor_schedule: responseData,
            trace_id: traceId,
        });
    } catch (error) {
        console.error(error);
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
        });
    }
};


// export const getVendorDistributionScheduleByIds = async (
//     request: FastifyRequest<{
//         Params: { program_id: string; id: string },
//         Querystring: { program_industry: string; work_locations: string; hierarchies: string }
//     }>,
//     reply: FastifyReply
// ) => {
//     try {
//         const { program_id, id } = request.params;
//         const { program_industry, work_locations, hierarchies } = request.query;

//
//

//

//         // Define sorting order for measure units
//         const unitOrder: { [key in 'weeks' | 'hours' | 'days']: number } = {
//             hours: 1,
//             days: 2,
//             weeks: 3,
//         };

//         // Sort distribution schedule details by measure unit and duration
//         const sortedDistScheduleDetails = distScheduleDetails.sort((a, b) => {
//             const unitA = a.measure_unit as keyof typeof unitOrder;
//             const unitB = b.measure_unit as keyof typeof unitOrder;

//

//             return a.duration - b.duration;
//         });

//         // Filter vendors by program_industry, work_locations, and hierarchies
//         const filteredDistScheduleDetails = await Promise.all(
//             sortedDistScheduleDetails.map(async detail => {
//                 const filteredVendors = await Promise.all(
//                     (detail.vendors || []).map(async vendorId => {
//                         const vendorRecord = await programVendor.findOne({
//                             where: {
//                                 id: vendorId,
//                                 program_industry,
//                                  work_locations,
//                                  hierarchies,
//                             },
//                         });
//                         return vendorRecord ? vendorId : null;
//                     })
//                 );

//                 return {
//                     id: detail.id,
//                     duration: detail.duration,
//                     measure_unit: detail.measure_unit,
//                     vendors: filteredVendors.filter(vendorId => vendorId !== null),
//                 };
//             })
//         );

//

//         reply.status(200).send({
//             statusCode: 200,
//             message: 'Vendor Distribution Schedule fetched successfully.',
//             vendor_schedule: responseData,
//             trace_id: generateCustomUUID(),
//         });
//     } catch (error) {
//         reply.status(500).send({
//             statusCode: 500,
//             message: 'Internal Server Error',
//         });
//     }
// };

export async function vendorDistributionScheduleFilter(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const {
            id,
            name,
            is_enabled,
            updated_on,
            page,
            limit,
            description,
        } = request.body as {
            id: string;
            name: string;
            is_enabled: string;
            updated_on: any;
            page: string;
            limit: string;
            description: string;
        };

        const isEnabledFilter =
            typeof is_enabled === 'string' ? is_enabled === 'true' : is_enabled;

        const pageNumber = parseInt(page ?? '1', 10);
        const limitNumber = parseInt(limit ?? '10', 10);
        const offset = (pageNumber - 1) * limitNumber;


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

        const { dataQuery, countQuery } = vendorDistributionScheduleFilterQuery(
            Boolean(id),
            Boolean(name),
            isEnabledFilter !== undefined,
            hasUpdatedOnFilter,
            Boolean(description)
        );

        const replacements: Record<string, any> = {
            program_id,
            id,
            name: name ? `%${name}%` : undefined,
            description: description ? `%${description}%` : undefined,
            limit: limitNumber,
            offset,
            is_enabled: isEnabledFilter,
            updated_on_start: updatedOnStart,
            updated_on_end: updatedOnEnd,
        };

        const data = await sequelize.query<any>(dataQuery, {
            replacements,
            type: QueryTypes.SELECT,
        });

        const totalRecords = await sequelize.query<{ total_count: number }>(countQuery, {
            replacements,
            type: QueryTypes.SELECT,
        });

        const totalRecordsCount = totalRecords[0]?.total_count || 0;
        const totalPages = Math.ceil(totalRecordsCount / limitNumber);

        return reply.status(200).send({
            status_code: 200,
            message: 'Vendor Distribution Schedule fetched successfully.',
            total_records: totalRecordsCount,
            current_page: pageNumber,
            page_size: limitNumber,
            total_pages: totalPages,
            items: data.map((item) => ({
                program_id: item.program_id,
                id: item.id,
                name: item.name,
                is_enabled: item.is_enabled,
                description: item.description,
                updated_on: item.updated_on,
            })),
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: error.message,
        });
    }
}
