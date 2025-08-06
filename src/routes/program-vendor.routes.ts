import { FastifyInstance } from "fastify";
import * as ProgramVendorController from "../controllers/program-vendor.controller";
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';

export default async function programVendorRoutes(fastify: FastifyInstance) {
    fastify.get('/program/:program_id/program-vendor', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendorController.getProgramVendors);

    fastify.post('/program/:program_id/program-vendor/advance-filter', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendorController.advanceFilter);

    fastify.get('/program/:program_id/program-vendor/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendorController.getProgramVendorById);

    fastify.get('/program/:program_id/program-vendor/user', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendorController.getProgramVendorByUserId);

    fastify.put('/program/:program_id/program-vendor/:tenant_id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.VENDOR])
    }, ProgramVendorController.updateProgramVendor);

    fastify.put('/program/:program_id/program-vendor/user_id/:user_id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.VENDOR])
    }, ProgramVendorController.updateProgramVendorByUserId);

    fastify.delete('/program/:program_id/program-vendor/:id', {
        // preHandler: validatePermissions(Actions.DELETE, [Permissions.VENDOR])
    }, ProgramVendorController.deleteProgramVendor);

    fastify.post('/program/:program_id/program-vendor', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.VENDOR])
    }, ProgramVendorController.saveProgramVendor);

    fastify.get('/program/:program_id/program-vendor/vendor-group', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendorController.getVendorAndVendorGroup);

    fastify.get('/program/:program_id/program-vendor/required-document', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendorController.getVendorDocuments);

    fastify.put('/program/:program_id/program-vendor/user', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.VENDOR])
    }, ProgramVendorController.updateComplianceDocument);

    fastify.get('/program/:program_id/program-vendor/user/:user_id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendorController.getComplianceDocument);

    fastify.post('/program/:program_id/vendor/:id/get-markup', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.VENDOR])
    }, ProgramVendorController.getVendorMarkup);
}


