import { FastifyInstance } from "fastify";
import * as HolidayCalendarController from "../controllers/holiday-calendar.controller";
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from "../middlewares/verifyToken";

async function holidayCalendarRoutes(fastify: FastifyInstance) {
   fastify.addHook('preHandler', verifyToken);
  fastify.get('/program/:program_id/holiday-calendar', {
    // preHandler: validatePermissions(Actions.READ, [Permissions.HOLIDAY_CALANDER])
  }, HolidayCalendarController.getHolidayCalendar);

  fastify.get('/program/:program_id/holiday-calendar/:id', {
    // preHandler: validatePermissions(Actions.READ, [Permissions.HOLIDAY_CALANDER])
  }, HolidayCalendarController.getHolidayCalendarById);

  fastify.post('/program/:program_id/holiday-calendar', {
    // preHandler: validatePermissions(Actions.CREATE, [Permissions.HOLIDAY_CALANDER])
  }, HolidayCalendarController.createHolidayCalendar);

  fastify.put('/program/:program_id/holiday-calendar/:id', {
    // preHandler: validatePermissions(Actions.UPDATE, [Permissions.HOLIDAY_CALANDER])
  }, HolidayCalendarController.updateHolidayCalendar);

  fastify.delete('/program/:program_id/holiday-calendar/:id', {
    // preHandler: validatePermissions(Actions.DELETE, [Permissions.HOLIDAY_CALANDER])
  }, HolidayCalendarController.deleteHolidayCalendar);

  fastify.post('/program/:program_id/holiday-calendar-advanced-filter', {
    // preHandler: validatePermissions(Actions.READ, [Permissions.HOLIDAY_CALANDER])
  }, HolidayCalendarController.getHolidayCalendarAdvancedFilter);

  fastify.get('/program/:program_id/holiday-calendar/get-holiday', {
    // preHandler: validatePermissions(Actions.READ, [Permissions.HOLIDAY_CALANDER])
  }, HolidayCalendarController.getHolidayCalendarByDateRange);
}


export default holidayCalendarRoutes;