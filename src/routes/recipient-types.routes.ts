import { FastifyInstance } from 'fastify';
import {
    createRecipientType,
    updateRecipientType,
    deleteRecipientType,
    getAllRecipientTypes,
    getRecipientTypeById,
    getRecipientTypes
} from '../controllers/recipient-types.controller';

async function recipientTypeRoute(fastify: FastifyInstance) {
    fastify.post('/recipient-type', async (request, reply) => {
        await createRecipientType(request, reply);
    });
    fastify.put('/recipient-type/:id', updateRecipientType);
    fastify.delete('/recipient-type/:id', deleteRecipientType);
    fastify.get('/recipient-type', getAllRecipientTypes);
    fastify.get('/recipient-types', getRecipientTypes);
    fastify.get('/recipient-type/:id', getRecipientTypeById);
}

export default recipientTypeRoute;
