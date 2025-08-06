import { FastifyInstance } from "fastify";
import {
    createCredentialingPacket,
    getCredentialingPacketById,
    updateCredentialingPacket,
    deleteCredentialingPacket,
    filterCredentialingPacket,
    listCredentialingPacket,
    enableDisableCredentialingPacket,
} from "../controllers/credentialing-packet.controller";

async function credentialingPacketRoutes(fastify: FastifyInstance) {
    fastify.post("/program/:program_id/credentialing-packets", createCredentialingPacket);
    fastify.get("/program/:program_id/credentialing-packets/entity/:entity_id", getCredentialingPacketById);
    fastify.put("/program/:program_id/credentialing-packets/entity/:entity_id", updateCredentialingPacket);
    fastify.delete("/program/:program_id/credentialing-packets/entity/:entity_id", deleteCredentialingPacket);
    fastify.get("/program/:program_id/credentialing-packets/filter", filterCredentialingPacket);
    fastify.get("/program/:program_id/credentialing-packets/list/brief", listCredentialingPacket);
    fastify.put("/program/:program_id/credentialing-packets/entity/:entity_id/enable-disable", enableDisableCredentialingPacket);

}

export default credentialingPacketRoutes;
