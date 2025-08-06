import { FastifyRequest, FastifyReply } from "fastify";
import holidayCalendar from "../models/holiday-calendar.model";
import { HolidayCalendarData } from "../interfaces/holiday-calendar.interface";
import generateCustomUUID from "../utility/genrateTraceId";
import { Op, QueryTypes } from "sequelize";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { sequelize } from "../config/instance";
import HolidayCalendarHierarchies from "../models/holiday-calender-hierarchie.model";
import HolidayCalendarWorkLocation from "../models/holiday-calender-work-location.model";
import HolidayCalendarDetails from "../models/holiday-calender-details.model";
import HolidayCalendar from "../models/holiday-calendar.model";
import GlobalRepository from "../repositories/global.repository";
import { sameHolidayCalendar } from "../utility/queries";

export async function getHolidayCalendar(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { program_id } = request.params as { program_id: string };
    const { name, year, is_enabled, updated_on, page = '1', limit = '10' } = request.query as { name?: string, year?: string, is_enabled?: string, updated_on?: string, page?: string, limit?: string };

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const filters: any = { program_id, is_deleted: false };

    if (name) {
      filters.name = { [Op.like]: `%${name}%` };
    }

    if (year) {
      filters.year = year;
    }

    if (is_enabled !== undefined) {
      filters.is_enabled = is_enabled === 'true';
    }

    if (updated_on) {
      const modifiedOnRange = updated_on.split(',').map(Number);
      if (modifiedOnRange.length === 2) {
        filters.updated_on = { [Op.between]: [modifiedOnRange[0], modifiedOnRange[1]] };
      }
    }

    const offset = (pageNum - 1) * limitNum;

    const { rows: holiday_calendars, count: totalRecords } = await holidayCalendar.findAndCountAll({
      where: filters,
      attributes: ['id', 'name', 'year', 'is_enabled', 'updated_on', 'program_id'],
      offset,
      limit: limitNum,
      order: [['updated_on', 'DESC']],
    });

    reply.status(200).send({
      status_code: 200,
      message: holiday_calendars.length > 0 ? 'HolidayCalendars fetched successfully.' : 'No holidayCalendars found.',
      trace_id: traceId,
      data: holiday_calendars,
      pagination: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum),
        currentPage: pageNum
      }
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while fetching holidayCalendars.',
      trace_id: traceId,
      error,
    });
  }
}

export async function getHolidayCalendarById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  try {
    const { program_id, id } = request.params as { program_id: string, id: string };

    const holiday_calendar = await holidayCalendar.findOne({ where: { program_id, id } });

    if (holiday_calendar) {
      let hierarchiesdata: object[] = [];
      const hierarchyIds = await HolidayCalendarHierarchies.findAll({ where: { holiday_calendar_id: id } });
      if (hierarchyIds.length > 0) {
        const hierarchyIdsArray = hierarchyIds.map(item => item.hierarchy_id);

        const hierarchiesQuery = `
          SELECT id, name
          FROM hierarchies
          WHERE id IN (:hierarchyIds)
        `;
        hierarchiesdata = await sequelize.query(hierarchiesQuery, {
          replacements: { hierarchyIds: hierarchyIdsArray },
          type: QueryTypes.SELECT
        });
      }

      let workLocationdata: object[] = [];
      const workLocationIds = await HolidayCalendarWorkLocation.findAll({ where: { holiday_calendar_id: id } });
      if (workLocationIds.length > 0) {
        const workLocationIdsArray = workLocationIds.map(item => item.work_location_id);

        const workLocationQuery = `
          SELECT id, name
          FROM work_locations
          WHERE id IN (:workLocationIds)
        `;
        workLocationdata = await sequelize.query(workLocationQuery, {
          replacements: { workLocationIds: workLocationIdsArray },
          type: QueryTypes.SELECT
        });
      }

      const holiday = await HolidayCalendarDetails.findAll({
        where: { holiday_calendar_id: id },
        attributes: ['id', 'holiday_calendar_id', 'date', 'name', 'is_time_entry_allowed', 'is_paid', 'is_tax_applicable']
      });

      reply.status(200).send({
        status_code: 200,
        message: 'HolidayCalendar fetched successfully.',
        trace_id: traceId,
        data: {
          ...holiday_calendar.toJSON(),
          hierarchy_id: hierarchiesdata,
          work_locations_ids: workLocationdata,
          holidays: holiday
        }
      });
    } else {
      reply.status(200).send({
        status_code: 200,
        message: 'HolidayCalendar not found.',
        data: []
      });
    }
  } catch (error: any) {
    console.log(error)

    reply.status(500).send({
      message: 'An error occurred while fetching holidayCalendar.',
      trace_id: traceId,
      error: error.message
    });
  }
}

export const createHolidayCalendar = async (request: FastifyRequest, reply: FastifyReply) => {
  const holiday_calendar = request.body as any;
  const { program_id } = request.params as { program_id: string };
  const transaction = await sequelize.transaction();
  const user = request?.user;
  const userId = user?.sub;
  const traceId = generateCustomUUID();

  try {
    const existingHolidayCalendar = await holidayCalendar.findOne({
      where: {
        program_id,
        name: holiday_calendar.name,
        is_deleted: false,
      },
    });

    if (existingHolidayCalendar) {
      await transaction.rollback();
      return reply.status(409).send({
        status_code: 409,
        trace_id: traceId,
        message: 'Holiday calendar with same name already exists.',
      });
    }

    if ((holiday_calendar.hierarchy_id?.length || holiday_calendar.is_all_hierarchy_associated) && holiday_calendar.year) {
      const hierarchyIds = Array.isArray(holiday_calendar.hierarchy_id) && holiday_calendar.hierarchy_id.length
        ? holiday_calendar.hierarchy_id
        : [];

      const query = sameHolidayCalendar(hierarchyIds.length > 0, false);

      const existingConfigurations = await sequelize.query(query, {
        replacements: {
          program_id,
          hierarchy_ids: hierarchyIds,
          year: holiday_calendar.year,
          is_all_hierarchy_associated: holiday_calendar.is_all_hierarchy_associated
        },
        type: QueryTypes.SELECT,
        transaction
      });

      if (existingConfigurations.length > 0) {
        await transaction.rollback();
        return reply.status(409).send({
          status_code: 409,
          message: 'Holiday calendar with the same hierarchy and year already exist.',
          trace_id: traceId,
        });
      }
    }

    const data = await holidayCalendar.create({
      ...holiday_calendar,
      created_by: userId,
      updated_by: userId,
      program_id,
    }, { transaction });

    if (Array.isArray(holiday_calendar.hierarchy_id)) {
      for (const hierarchyId of holiday_calendar.hierarchy_id) {
        if (hierarchyId) {
          await HolidayCalendarHierarchies.create({
            holiday_calendar_id: data.id,
            hierarchy_id: hierarchyId,
            created_by: userId,
            updated_by: userId,
          }, { transaction });
        }
      }
    }

    if (Array.isArray(holiday_calendar.work_locations_ids)) {
      for (const workLocationId of holiday_calendar.work_locations_ids) {
        if (workLocationId) {
          await HolidayCalendarWorkLocation.create({
            holiday_calendar_id: data.id,
            work_location_id: workLocationId,
            created_by: userId,
            updated_by: userId,
          }, { transaction });
        }
      }
    }

    if (Array.isArray(holiday_calendar.holidays)) {
      for (const details of holiday_calendar.holidays) {
        await HolidayCalendarDetails.create({
          holiday_calendar_id: data.id,
          date: details.date,
          name: details.name,
          is_time_entry_allowed: details.is_time_entry_allowed,
          is_paid: details.is_paid,
          is_tax_applicable: details.is_tax_applicable,
          created_by: userId,
          updated_by: userId,
        }, { transaction });
      }
    }

    await transaction.commit();

    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: userId,
        },
        data: request.body,
        eventname: 'create holiday calendar',
        status: 'success',
        description: 'Holiday calendar created successfully.',
        level: 'success',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      holidayCalendar
    );

    return reply.status(201).send({
      status_code: 201,
      trace_id: traceId,
      message: 'Holiday calendar created successfully.',
      id: data.id
    });
  } catch (error) {
    await transaction.rollback();

    logger(
      {
        trace_id: traceId,
        actor: {
          user_name: user?.preferred_username,
          user_id: userId,
        },
        data: request.body,
        eventname: 'create holiday calendar',
        status: 'error',
        description: 'An error occurred while creating holidayCalendar.',
        level: 'error',
        action: request.method,
        url: request.url,
        entity_id: program_id,
        is_deleted: false,
      },
      holidayCalendar
    );

    return reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while creating holiday calendar.',
      trace_id: traceId,
      error: (error as Error).message,
    });
  }
};

export const updateHolidayCalendar = async (request: FastifyRequest, reply: FastifyReply) => {
  const { program_id, id } = request.params as { program_id: string, id: string };
  const traceId = generateCustomUUID();
  const updateData = request.body as Partial<HolidayCalendarData>;
  const user = request?.user;
  const userId = user?.sub;
  const transaction = await sequelize.transaction();

  try {
    const existingCalendar = await holidayCalendar.findOne({
      where: { program_id, id, is_deleted: false },
    });

    if (!existingCalendar) {
      await transaction.rollback();
      return reply.status(404).send({
        status_code: 404,
        trace_id: traceId,
        message: "Holiday calendar not found.",
      });
    }

    if (updateData.name) {
      const duplicateName = await holidayCalendar.findOne({
        where: {
          program_id,
          name: updateData.name,
          is_deleted: false,
          id: { [Op.ne]: id },
        },
      });

      if (duplicateName) {
        await transaction.rollback();
        return reply.status(409).send({
          status_code: 409,
          trace_id: traceId,
          message: "Holiday calendar name already exists.",
        });
      }
    }

    if ((updateData.hierarchy_id?.length || updateData.is_all_hierarchy_associated) && updateData.year) {
      const hierarchyIds = Array.isArray(updateData.hierarchy_id) && updateData.hierarchy_id.length
        ? updateData.hierarchy_id
        : [];

      const query = sameHolidayCalendar(hierarchyIds.length > 0, true);

      const existingConfigurations = await sequelize.query(query, {
        replacements: {
          program_id,
          hierarchy_ids: hierarchyIds,
          year: updateData.year,
          is_all_hierarchy_associated: updateData.is_all_hierarchy_associated,
          exclude_id: id
        },
        type: QueryTypes.SELECT,
        transaction
      });

      if (existingConfigurations.length > 0) {
        await transaction.rollback();
        return reply.status(409).send({
          status_code: 409,
          message: 'Holiday calendar with the same hierarchy and year already exist.',
          trace_id: traceId,
        });
      }
    }

    updateData.updated_by = userId;
    updateData.updated_on = Date.now();

    await holidayCalendar.update(updateData, {
      where: { program_id, id },
      transaction,
    });

    if (Array.isArray(updateData.hierarchy_id)) {
      await HolidayCalendarHierarchies.destroy({ where: { holiday_calendar_id: id }, transaction });
      for (const hierarchyId of updateData.hierarchy_id) {
        await HolidayCalendarHierarchies.create(
          {
            holiday_calendar_id: id,
            hierarchy_id: hierarchyId,
            created_by: userId,
            updated_by: userId,
          },
          { transaction }
        );
      }
    }

    if (Array.isArray(updateData.work_locations_ids)) {
      await HolidayCalendarWorkLocation.destroy({ where: { holiday_calendar_id: id }, transaction });
      for (const workLocationId of updateData.work_locations_ids) {
        await HolidayCalendarWorkLocation.create(
          {
            holiday_calendar_id: id,
            work_location_id: workLocationId,
            created_by: userId,
            updated_by: userId,
          },
          { transaction }
        );
      }
    }

    if (Array.isArray(updateData.holidays)) {
      await HolidayCalendarDetails.destroy({ where: { holiday_calendar_id: id }, transaction });
      for (const details of updateData.holidays) {
        await HolidayCalendarDetails.create(
          {
            holiday_calendar_id: id,
            date: details.date,
            name: details.name,
            is_time_entry_allowed: details.is_time_entry_allowed,
            is_paid: details.is_paid,
            is_tax_applicable: details.is_tax_applicable,
            created_by: userId,
            updated_by: userId,
          },
          { transaction }
        );
      }
    }

    await transaction.commit();

    return reply.status(200).send({
      status_code: 200,
      message: "Holiday calendar updated successfully.",
      id: id,
      trace_id: traceId,
    });
  } catch (error: any) {
    console.error(error);
    await transaction.rollback();
    return reply.status(500).send({
      status_code: 500,
      message: "Internal Server Error",
      trace_id: traceId,
      error: error.message ?? error,
    });
  }
};

export async function deleteHolidayCalendar(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID()
  const user = request?.user;
  const userId = user?.sub;
  try {
    const { program_id, id } = request.params as { program_id: string, id: string };
    const holidayCalendarData = await holidayCalendar.findOne({ where: { program_id, id } });
    if (holidayCalendarData) {
      await holidayCalendar.update({ is_deleted: true, is_enabled: false, updated_by: userId }, { where: { program_id, id } });
      reply.status(204).send({
        status_code: 204,
        message: 'HolidayCalendar deleted successfully.',
        trace_id: traceId,
      });
    } else {
      reply.status(404).send({
        status_code: 404,
        message: 'HolidayCalendar not found.'
      });
    }
  } catch (error) {
    reply.status(500).send({
      message: 'An error occurred while deleting holidayCalendar.',
      trace_id: traceId,
      error: error,
    });
  }
}

export async function getHolidayCalendarAdvancedFilter(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();

  try {
    const { program_id } = request.params as { program_id: string };
    const { name, year, is_enabled, updated_on, page = '1', limit = '10' } = request.body as { name?: string, year?: string, is_enabled?: string, updated_on?: any, page?: string, limit?: string };
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (!program_id) {
      return reply.status(400).send({
        status_code: 400,
        message: 'Program ID is required.',
        trace_id: traceId,
      });
    }
    const user = request?.user
    const { mspHierarchyIds } = await GlobalRepository.getUserHierarchyData(program_id, user);
    const filterConditions: any = { program_id, is_deleted: false };
    if (name) {
      filterConditions.name = { [Op.like]: `%${name}%` };
    }
    if (year) {
      filterConditions.year = year;
    }
    if (is_enabled !== undefined) {
      filterConditions.is_enabled = (typeof is_enabled === 'string' ? is_enabled === 'true' : is_enabled === true);
    }

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
      filterConditions.updated_on = { [Op.between]: [updatedOnStart, updatedOnEnd] };
    }

    if (mspHierarchyIds && mspHierarchyIds.length > 0) {
      filterConditions[Op.or] = [
        { is_all_hierarchy_associated: true },
        {
          id: {
            [Op.in]: sequelize.literal(`(
              SELECT holiday_calendar_id
              FROM holiday_calendar_hierarchies
              WHERE hierarchy_id IN (${mspHierarchyIds.map(id => `'${id}'`).join(',')})
            )`)
          }
        }
      ];
    }
    const offset = (pageNum - 1) * limitNum;
    const { rows: holiday_calendars, count: totalRecords } = await holidayCalendar.findAndCountAll({
      where: filterConditions,
      attributes: ['id', 'name', 'year', 'is_enabled', 'updated_on', 'program_id'],
      offset,
      limit: limitNum,
      order: [['updated_on', 'DESC']]
    });

    reply.status(200).send({
      status_code: 200,
      message: holiday_calendars.length > 0 ? 'HolidayCalendars fetched successfully.' : 'No holidayCalendars found.',
      trace_id: traceId,
      holiday_calendars,
      pagination: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum),
        currentPage: pageNum
      }
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while fetching holidayCalendars.',
      trace_id: traceId,
      error: error.message,
    });
  }
}

export async function getHolidayCalendarByDateRange(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();

  try {
    const { start_date, end_date, hierarchy_id } = request.query as {
      start_date?: string;
      end_date?: string;
      hierarchy_id?: string;
    };
    const { program_id } = request.params as { program_id?: string };
    if ((start_date && !end_date) || (!start_date && end_date)) {
      return reply.status(400).send({
        status_code: 400,
        message: "Please provide both start_date and end_date together.",
        trace_id: traceId,
      });
    }

    const whereClause: any = {};
    let calendarIds: number[] = [];

    if (hierarchy_id) {
      const calendarHierarchyMappings = await HolidayCalendarHierarchies.findAll({
        where: { hierarchy_id },
        attributes: ['holiday_calendar_id'],
      });

      const directlyAssociatedIds = calendarHierarchyMappings.map(m => m.holiday_calendar_id);

      const fullyAssociatedCalendars = await HolidayCalendar.findAll({
        where: {
          is_all_hierarchy_associated: true,
          program_id: program_id,
        },
        attributes: ['id'],
      });
      const fullyAssociatedIds = fullyAssociatedCalendars.map(c => c.id);
      const allCalendarIds = Array.from(new Set([...directlyAssociatedIds, ...fullyAssociatedIds]));
      if (allCalendarIds.length === 0) {
        return reply.status(200).send({
          status_code: 200,
          message: 'No holiday calendar associated with the provided hierarchy and program ID.',
          trace_id: traceId,
          holidays: [],
        });
      }

      whereClause.holiday_calendar_id = { [Op.in]: allCalendarIds };
    }

    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return reply.status(400).send({
          status_code: 400,
          message: "Invalid date format. Please use YYYY-MM-DD.",
          trace_id: traceId,
        });
      }

      whereClause.date = {
        [Op.gte]: startDate,
        [Op.lte]: endDate,
      };
    }

    const holidays = await HolidayCalendarDetails.findAll({
      where: whereClause,
      attributes: ['date', 'name', 'is_time_entry_allowed', 'is_paid', 'is_tax_applicable'],
      order: [['date', 'ASC']],
    });

    return reply.status(200).send({
      status_code: 200,
      message: holidays.length
        ? 'Holiday details fetched successfully.'
        : 'No holidays found for the given criteria.',
      trace_id: traceId,
      holidays: holidays.map(h => h.get()),
    });
  } catch (error) {
    return reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while fetching holiday details.',
      trace_id: traceId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

