import { FastifyInstance } from 'fastify';
import * as ShiftTypeController from '../controllers/shift-type.controller';
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Permissions, Actions } from "../constants/permissions";
import { verifyToken } from '../middlewares/verifyToken';

async function shiftTypeRoutes(fastify: FastifyInstance) {
fastify.addHook('preHandler', verifyToken)
    fastify.post('/shift-type', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.SHIFT_TYPE])
    }, ShiftTypeController.createShiftType);

    fastify.get('/program/:program_id/shift-type', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.SHIFT_TYPE])
    }, ShiftTypeController.getALLShiftType);

    fastify.get('/program/:program_id/shift-type/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.SHIFT_TYPE])
    }, ShiftTypeController.getShiftTypeById);

    fastify.put('/program/:program_id/shift-type/:id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.SHIFT_TYPE])
    }, ShiftTypeController.updateShiftType);

    fastify.delete('/program/:program_id/shift-type/:id', ShiftTypeController.deleteShiftType);

    fastify.get('/program/:program_id/shift-types-by-hierarchies', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.SHIFT_TYPE])
    }, ShiftTypeController.getShiftTypesByHierarchies);

    fastify.get('/program/:program_id/shift-category', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.SHIFT_TYPE])
    }, ShiftTypeController.getShiftCategories);

    fastify.post('/program/:program_id/shift-category/advance-filter', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.SHIFT_TYPE])
    }, ShiftTypeController.getShiftTypeFilter);

}

export default shiftTypeRoutes;