import { FastifyInstance } from 'fastify';
import {getAllJobCategory, getJobCategoryById ,createJobCategory, updateJobCategory, deleteJobCategory} from '../controllers/job-category.controller';
import { verifyToken } from '../middlewares/verifyToken';

async function JobCategoryRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.get('/job-category', getAllJobCategory);
    fastify.get('/job-category/:id', getJobCategoryById);
    fastify.post('/job-category', createJobCategory);
    fastify.put('/job-category/:id', updateJobCategory);
    fastify.delete('/job-category/:id', deleteJobCategory);
}
export default JobCategoryRoutes;