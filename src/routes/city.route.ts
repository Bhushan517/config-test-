import { FastifyInstance } from "fastify";

import {
  getCity,
  createCity,
  updateCity,
  deleteCity,
  getCityById,
} from "../controllers/city.controller";
import { verifyToken } from "../middlewares/verifyToken";

export default async function resourceCityRoutes(fastify: FastifyInstance) {
   fastify.addHook('preHandler', verifyToken);
  fastify.get("/citys", getCity);
  fastify.post("/state/:state_id/:program_id/city",createCity);
  fastify.put("/state/:state_id/city/:id", updateCity);
  fastify.delete("/state/:state_id/city/:id", deleteCity);
  fastify.get("/state/:state_id/city/:id", getCityById);
}
