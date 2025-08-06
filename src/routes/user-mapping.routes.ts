import { FastifyInstance } from 'fastify';
import { getAllUserMappings, getUserMappingById, createUserMappings, updateUserMappingById, deleteUserMappingById, getUserMappings,updateStatus } from '../controllers/user-mapping.controller';
import { UserMappingAttributes } from '../interfaces/user-mapping.interface'
import { verifyToken } from '../middlewares/verifyToken';
export async function userMappingRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.get('/usermapping/', getAllUserMappings);
    fastify.get('/usermapping/:id', getUserMappingById);
    fastify.post('/usermapping/', async (request, reply) => createUserMappings(request.body as UserMappingAttributes, reply));
    fastify.put('/usermapping/:id', updateUserMappingById);
    fastify.delete('/usermapping/:id', deleteUserMappingById);
    fastify.get('/program/:program_id/usermapping/:id',getUserMappings);
    fastify.put('/program/:program_id/update-user-mapping-status/:id',updateStatus);
}

export default userMappingRoutes;

