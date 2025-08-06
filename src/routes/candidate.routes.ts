import { FastifyInstance } from "fastify";
import * as candidateController from '../controllers/candidate.controller';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from "../middlewares/verifyToken";

async function candidateRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/candidate', {
        // preHandler: validatePermissions(Actions.CREATE_CANDIDATE, [Permissions.CANDIDATE])
    }, candidateController.createCandidate);

    fastify.get('/program/:program_id/candidate', {
        // preHandler: validatePermissions(Actions.VIEW_CANDIDATE, [Permissions.CANDIDATE])
    }, candidateController.getAllCandidate);

    fastify.get('/program/:program_id/candidate/:id', {
        // preHandler: validatePermissions(Actions.VIEW_CANDIDATE, [Permissions.CANDIDATE])
    }, candidateController.getCandidateByIdAndProgramId);

    fastify.put('/program/:program_id/candidate/:id', {
        // preHandler: validatePermissions(Actions.EDIT_CANDIDATE, [Permissions.CANDIDATE])
    }, candidateController.updateCandidateByIdAndProgramId);

    fastify.get('/search', {
        // preHandler: validatePermissions(Actions.VIEW_CANDIDATE, [Permissions.CANDIDATE])
    }, candidateController.candidateSearch);

    fastify.get('/program/:program_id/candidates', candidateController.getCandidates);
}

export default candidateRoutes;