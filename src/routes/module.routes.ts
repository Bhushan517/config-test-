import { FastifyInstance } from 'fastify';
import {
  getModule,
  createModule,
  updateModule,
  getModuleById,
} from '../controllers/module.controller';
import { createModuleSchema, paramsSchema } from '../interfaces/module.interface';


async function moduleRouter(fastify: FastifyInstance) {
  fastify.get('/module', {
    schema: {
      params: paramsSchema,
    }
  },
    getModule);
  // fastify.post('/module', {
  //   schema: {
  //     body: createModuleSchema,

  //   }
  // },
  //   createModule);

  // fastify.put('/module/:id', {
  //   schema: {
  //     body: createModuleSchema,
  //   }
  // },
  //   updateModule);

  fastify.get('/module/:id', {
    schema: {
      params: paramsSchema,
    }
  }, getModuleById);
}
export default moduleRouter;