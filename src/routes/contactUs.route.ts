import { FastifyInstance } from 'fastify';
import {
  createContactUs,
} from '../controllers/contactUs.controller';

export default async function contactUsRoutes(fastify: FastifyInstance) {
  fastify.post('/contact_us',createContactUs);
 
}
