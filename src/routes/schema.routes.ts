import { FastifyInstance } from 'fastify';
import {
    createSchema,
    updateSchema,
    deleteSchema,
    getAllSchema,
    getSchemaById,
    getAllSchemas
} from '../controllers/schema.controller';

async function SchemaRoutes(fastify: FastifyInstance) {
    fastify.post('/schema', async (request, reply) => {
        await createSchema(request, reply);
    });
    fastify.put('/schema/:id', updateSchema);
    fastify.delete('/schema/:id', deleteSchema);
    fastify.get('/schema', getAllSchema);
    fastify.get('/all/schema', getAllSchemas);
    fastify.get('/schema/:id', getSchemaById);
}

export default SchemaRoutes;
