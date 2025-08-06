
import { FastifyInstance } from 'fastify';
import {
    getCustomFieldLocationById,
    createCustomFieldLocation,
    deleteCustomFieldLocationById,
    updateCustomFieldLocationById,
    getAllCustomFieldLocation,
} from '../controllers/custom-field-location.controller';

import { createCustomFieldLocations, paramsSchema } from '../interfaces/custom-field-location-interface';
import { verifyToken } from '../middlewares/verifyToken';
async function customFieldLocationRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.get('/program/:program_id/custom_field_location/:id', getCustomFieldLocationById);
    fastify.post('/custom_field_location',
        {
        schema:{
            body:createCustomFieldLocations
        }
    }, createCustomFieldLocation);
    fastify.delete('/program/:program_id/custom_field_location/:id', deleteCustomFieldLocationById);
    fastify.put('/program/:program_id/custom_field_location/:id',{
        schema:{
            body: createCustomFieldLocations,
            params:paramsSchema
        }
    }, updateCustomFieldLocationById);
    fastify.get('/program/:program_id/custom_field_location', getAllCustomFieldLocation)
}
export default customFieldLocationRoutes;
