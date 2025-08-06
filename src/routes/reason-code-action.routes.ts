import { FastifyInstance } from 'fastify';
import * as ResonCodeController from '../controllers/reason-code-action.controller';
import { createReasoncodeSchema, querySchema, paramsSchema } from '../interfaces/reason-code.interface';
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Permissions, Actions } from "../constants/permissions";
import { verifyToken } from '../middlewares/verifyToken';

async function reasoncodeRoute(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/reason-code', {
        schema: {
            body: createReasoncodeSchema,
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.RESON_CODE])
    }, ResonCodeController.createReasoncode);

    fastify.post('/reason-codes', {
        schema: {
            body: createReasoncodeSchema,
        },
    }, ResonCodeController.createReasonCodes);

    fastify.get('/reason-code', {
        schema: {
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.RESON_CODE])
    }, ResonCodeController.getAllReasoncode);   

    fastify.get('/program/:program_id/reason-code/:id', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        //  preHandler: validatePermissions(Actions.CREATE, [Permissions.RESON_CODE])
    }, ResonCodeController.getReasoncodeById);

    fastify.get('/program/:program_id/reason-code', ResonCodeController.getReasonCodeBySlug);

    fastify.get('/reason-codes', {
        schema: {
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.RESON_CODE])
    }, ResonCodeController.getReasoncodeByEventName);

    fastify.put('/program/:program_id/reason-code/:id', {
        schema: {
            body: createReasoncodeSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.RESON_CODE])
    }, ResonCodeController.updateReasoncode);

    fastify.delete('/reason-code-action/:id', ResonCodeController.deleteReasoncodeAction);

    fastify.delete('/reason-code/:id', ResonCodeController.deleteReasoncode);

    fastify.get('/reason_codes/:slug', {
        schema: {
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.RESON_CODE])
    }, ResonCodeController.getReasonCodeByProgramIdAndSlug);

    fastify.post('/program/:program_id/reason-code/advanced-filter', {
        schema: {
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.RESON_CODE])
    }, ResonCodeController.advancedFilterReasoncode);

}

export default reasoncodeRoute;