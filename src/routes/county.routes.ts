
import { FastifyInstance } from "fastify";
import {
    createCounty,
    getCountyById,
    updateCountyById,
    deleteCountyById,
    getAllCounty,
} from "../controllers/county.controller";
import { createCountySchema } from "../interfaces/county.interface";
import { verifyToken } from "../middlewares/verifyToken";

async function countyRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.get("/county/:id", getCountyById);
    fastify.post("/county", {
        schema:{
            body:createCountySchema
        }
    }, createCounty);
    fastify.delete("/county/:id", deleteCountyById);
    fastify.put("/county/:id",{
        schema:{
            body:createCountySchema,
        }
    }, updateCountyById);
    fastify.get("/county", getAllCounty);
}
export default countyRoutes;
