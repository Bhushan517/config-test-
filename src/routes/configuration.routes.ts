import { FastifyInstance } from "fastify";

import {
  getConfigurations,
  getConfigurationById,
  createConfiguration,
  updateConfiguration,
  deleteConfiguration,
} from "../controllers/configuration.controller";
import { verifyToken } from "../middlewares/verifyToken";

async function configurationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyToken);
  fastify.get("/configuration", getConfigurations,);
  fastify.get("/configuration/:id", getConfigurationById,);
  fastify.post("/configuration", createConfiguration);
  fastify.put("/configuration/:id", updateConfiguration,);
  fastify.delete("/configuration/:id", deleteConfiguration,);
}

export default configurationRoutes;
