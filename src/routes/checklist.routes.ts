
import { FastifyInstance } from "fastify";
import {
    createCheckList,
    getChecklistById,
    updateCheckList,
    deleteCheckList,
    filterChecklists,
    listChecklists,
    enableDisableChecklist
} from "../controllers/checklist.controller";
import { verifyToken } from "../middlewares/verifyToken";
async function checklistRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post("/program/:program_id/checklists", createCheckList);
    fastify.get("/program/:program_id/checklists/entity/:entity_id", getChecklistById);
    fastify.put("/program/:program_id/checklists/entity/:entity_id", updateCheckList);
    fastify.put("/program/:program_id/checklist/entity/:entity_id/enable-disable", enableDisableChecklist);
    fastify.delete("/program/:program_id/checklists/entity/:entity_id", deleteCheckList);
    fastify.get("/program/:program_id/checklists/list/brief", listChecklists);
    fastify.get("/program/:program_id/checklists/filter", filterChecklists);
}
export default checklistRoutes;
