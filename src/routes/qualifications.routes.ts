import { FastifyInstance } from 'fastify';
import * as QualificationController from '../controllers/qualifications.controller';
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Permissions, Actions } from "../constants/permissions";
import { verifyToken } from '../middlewares/verifyToken';

async function QualificationsRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/program/:program_id/qualifications', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.QUALIFICATION])
    }, QualificationController.createQualification);

    fastify.put('/program/:program_id/qualifications/:id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.QUALIFICATION])
    }, QualificationController.updateQualification);

    fastify.delete('/program/:program_id/qualifications/:id', QualificationController.deleteQualification);

    fastify.get('/program/:program_id/qualifications', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.QUALIFICATION])
    }, QualificationController.getAllQualifications);

    fastify.get('/program/:program_id/qualifications/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.QUALIFICATION])
    }, QualificationController.getQualificationById);

    fastify.post('/program/:program_id/qualifications/bulk-upload', QualificationController.bulkCreateQualifications);

    fastify.get('/program/:program_id/qualificationCode', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.QUALIFICATION])
    }, QualificationController.getQualificationCode);

}

export default QualificationsRoutes;