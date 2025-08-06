import { FastifyInstance } from "fastify";
import * as ProgramConfigController from "../controllers/program-config.controller";
import { Permissions, Actions } from "../constants/permissions";
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { verifyToken } from "../middlewares/verifyToken";

async function programsConfigRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyToken);
  fastify.get("/program/:program_id/program-config/:id", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.PROGRAM_CONFIGURATION])
  }, ProgramConfigController.getConfigurationById);

  fastify.get("/program/:program_id/configurations", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.PROGRAM_CONFIGURATION])
  }, ProgramConfigController.getConfigByProgramIdAndTitles);

  fastify.post("/program-config", ProgramConfigController.createConfiguration);

  fastify.put("/program/:program_id/program-config", {
    // preHandler: validatePermissions(Actions.UPDATE, [Permissions.PROGRAM_CONFIGURATION])
  }, ProgramConfigController.updateConfiguration);

  fastify.delete("/program/:program_id/program-config/:id", ProgramConfigController.deleteConfiguration);

  fastify.get("/program/:program_id/program-config", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.PROGRAM_CONFIGURATION])
  }, ProgramConfigController.getProgramConfigurations);

  fastify.get("/program/:program_id/program-configuration", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.PROGRAM_CONFIGURATION])
  }, ProgramConfigController.getTransformedConfig);
}

export default programsConfigRoutes;