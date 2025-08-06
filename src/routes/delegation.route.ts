import { FastifyInstance } from 'fastify';
import {
    createDelegation,
    getDelegationById,
    updateDelegationById,
    deleteDelegationById,
    getDelegationsByCriteria

} from "../controllers/delegation.controller";

export default async function delegationRoutes(fastify: FastifyInstance) {
    fastify.post("/program/:program_id/delegations", createDelegation);
    //   fastify.get("/delegations", getDelegationById);
    fastify.get("/program/:program_id/delegations/:id", getDelegationById);
    fastify.put("/program/:program_id/delegations/:id", updateDelegationById);
    fastify.delete("/program/:program_id/delegations/:id", deleteDelegationById);
    fastify.get("/created_by/:created_by/program/:program_id", getDelegationsByCriteria);
}
