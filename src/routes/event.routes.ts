import { FastifyInstance } from 'fastify';
import {
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventSchemaById,
    getEvents
} from '../controllers/event.controller';
import { createEventSchema, paramsSchema, querySchema } from '../interfaces/event.interface';

async function EventRoutes(fastify: FastifyInstance) {
    fastify.post('/supporting-text-event', {
        schema: {
            body: createEventSchema,
        }
    }, createEvent);

    fastify.get('/module/:module_id/supporting-text-event', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getEvents);

    fastify.get('/supporting-text-event', {
        schema: {
            querystring: querySchema,

        }
    }, getAllEvents);


    fastify.get('/module/:module_id/supporting-text-event/:id', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getEventById);

    // fastify.put('/module/:module_id/supporting-text-event/:id', {
    //     schema: {
    //         body: createEventSchema,
    //         params: paramsSchema,
    //     }
    // }, updateEvent);

    fastify.delete('/module/:module_id/supporting-text-event/:id', {
        schema: {
            params: paramsSchema,
        }
    }, deleteEvent);

    fastify.get('/event-schema/module/:module_id/event/:event_id/schema', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        }
    }, getEventSchemaById);

}
export default EventRoutes;