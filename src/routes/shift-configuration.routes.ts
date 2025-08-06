import { FastifyInstance } from "fastify";
import * as ShiftConfigurationController from "../controllers/shift-configuration.controller";
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Permissions, Actions } from "../constants/permissions";
import { verifyToken } from "../middlewares/verifyToken";

export default async function shiftConfigurationRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post("/shift-configuration", {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.SHIFT_CONFIGURATION])
    }, ShiftConfigurationController.createShiftConfiguration);

    fastify.get("/program/:program_id/shift-configuration", {
        // preHandler: validatePermissions(Actions.READ, [Permissions.SHIFT_CONFIGURATION])
    }, ShiftConfigurationController.getAllshiftConfiguration);

    fastify.get("/program/:program_id/shift-configuration/:id", {
        // preHandler: validatePermissions(Actions.READ, [Permissions.SHIFT_CONFIGURATION])
    }, ShiftConfigurationController.getShiftConfigurationById);

    fastify.put("/program/:program_id/shift-configuration/:id", {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.SHIFT_CONFIGURATION])
    }, ShiftConfigurationController.updateShiftConfiguration);

    fastify.delete("/program/:program_id/shift-configuration/:id", ShiftConfigurationController.deleteShiftConfiguration);

    fastify.post("/program/:program_id/shift-configuration/advance-filter", {
        // preHandler: validatePermissions(Actions.READ, [Permissions.SHIFT_CONFIGURATION])
    }, ShiftConfigurationController.getFilteredShiftConfiguration);
}