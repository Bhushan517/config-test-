import { FastifyInstance } from 'fastify';
import { getAllTimeZones, getTimeZoneById, createTimeZone, updateTimeZone, deleteTimeZone, bulkUploadTimeZone} from '../controllers/time-zones.controller';

async function timeZoneRoutes(fastify: FastifyInstance) {
  fastify.get('/time-zone', getAllTimeZones);
  fastify.get('/time-zone/:id', getTimeZoneById);
  fastify.post('/time-zone/bulk-upload',bulkUploadTimeZone)
  fastify.post('/time-zone', createTimeZone);
  fastify.put('/time-zone/:id', updateTimeZone);
  fastify.delete('/time-zone/:id', deleteTimeZone);
}

export default timeZoneRoutes;