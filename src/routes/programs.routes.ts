import { FastifyInstance } from "fastify";
import {
  saveProgram,
  getAllProgram,
  getProgramById,
  updateProgramById,
  deleteProgramById,
  advancedFilter,
  getMspByProgramId,
  updateMspByProgramId
} from "../controllers/programs.controller";
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Permissions, Actions } from "../constants/permissions";
import { verifyToken } from "../middlewares/verifyToken";

async function programsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyToken);
  fastify.post("/program/", saveProgram);
  fastify.get("/program/get-all", getAllProgram);
  fastify.get("/program/getbyid/:id", getProgramById);
  fastify.put("/program/:id", updateProgramById);
  fastify.delete("/program/:id", {
    // preHandler: validatePermissions,
    // config: {
    //   permissions: [Permissions.PROGRAM],
    //   action: Actions.CREATE,
    // },
  }, deleteProgramById);
  fastify.get("/program/advanced-filters", advancedFilter);
  fastify.get("/program/:program_id/get-msp", getMspByProgramId);
  fastify.put("/program/:program_id/update-msp/:msp_id", updateMspByProgramId);

}
export default programsRoutes;