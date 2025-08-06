import { FastifyInstance } from "fastify"
import * as vendorDistributionSchedule from "../controllers/vendor-distribution-schedule.controller";
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from "../middlewares/verifyToken";

async function vendorDistributionScheduleRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.get("/program/:program_id/vendor-distribution-schedules", {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_DISTRIBUTION_SCHEDULE])
    }, vendorDistributionSchedule.getAllvendorDistributionSchedules);

    fastify.get("/program/:program_id/vendor-distribution-schedules/:id", {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_DISTRIBUTION_SCHEDULE])
    }, vendorDistributionSchedule.getVendorDistributionScheduleById);

    fastify.post("/program/:program_id/vendor-distribution-schedules", {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.VENDOR_DISTRIBUTION_SCHEDULE])
    }, vendorDistributionSchedule.createVendorDistributionSchedule);

    fastify.put("/program/:program_id/vendor-distribution-schedules/:id", {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.VENDOR_DISTRIBUTION_SCHEDULE])
    }, vendorDistributionSchedule.updateVendorDistributionSchedule);

    fastify.delete("/program/:program_id/vendor-distribution-schedules/:id", {
        // preHandler: validatePermissions(Actions.DELETE, [Permissions.VENDOR_DISTRIBUTION_SCHEDULE])
    }, vendorDistributionSchedule.deleteVendorDistributionSchedule);

    fastify.get("/program/:program_id/vendor-distribution/:id", {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_DISTRIBUTION_SCHEDULE])
    }, vendorDistributionSchedule.getVendorDistributionScheduleByIds);

    fastify.post('/program/:program_id/vendor-distribution-schedule/advance-filter', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR_DISTRIBUTION_SCHEDULE])
    }, vendorDistributionSchedule.vendorDistributionScheduleFilter);

}
export default vendorDistributionScheduleRoutes;
