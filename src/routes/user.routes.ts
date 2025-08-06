import { FastifyInstance } from 'fastify';
import * as userController from '../controllers/user.controller';
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Actions, Permissions } from "../constants/permissions";
import { verifyToken } from '../middlewares/verifyToken';

async function userRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.get('/user/', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.USER])
    }, userController.getUser);

    fastify.get('/user/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.USER])
    }, userController.getUserById);

    fastify.post('/user/', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.USER])
    }, userController.createUser);

    fastify.put('/user/:id/program/:program_id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.USER])
    }, userController.updateUser);

    fastify.delete('/user/:id', userController.deleteUser);

    fastify.get('/user/search-user', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.USER])
    }, userController.searchUser);

    fastify.get('/user/program/:program_id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.USER])
    }, userController.getAllUserIDAndUserId);

    fastify.get('/user/:id/program/:program_id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.USER])
    }, userController.getUserHierarchiesByProgram);

    fastify.get('/user/program/:program_id/user-worklocation', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.USER])
    }, userController.getUserWorkLocationAndTimeZone);

    fastify.get('/program/:program_id/user-associated-hierachies', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.USER])
    }, userController.getUserAndHierarchieId);

    fastify.get('/program/:program_id/get-job-manegers', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.USER])
    }, userController.getActiveUser);

    fastify.get('/get-user-contact', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.USER])
    }, userController.getUserContact);

    fastify.get('/get-user-program', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.USER])
    }, userController.getUserProgram);

      fastify.post('/user/program/:program_id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.USER])
    }, userController.getAllUserIDAndUser);
}

export default userRoutes;