import { FastifyInstance } from "fastify";
import {
  getTenants,
  getTenantById,
  createTenant,
  createTenantAndUser,
  updateTenant,
  deleteTenant,
  searchTenantsWithProgramCount,
  advancedSearchTenants,
  getPasswordPolicy
} from "../controllers/tenant.controller";
import { verifyToken } from "../middlewares/verifyToken";

async function tenantRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyToken);
  fastify.get("/tenant", getTenants);
  fastify.get("/tenant/:id", getTenantById);
  fastify.post("/tenant",createTenant);
  fastify.post("/tenant/tenant-user",createTenantAndUser);
  fastify.put("/tenant/:id", updateTenant);
  fastify.delete("/tenant/:id", deleteTenant);
  fastify.post("/tenant/search-tenant", searchTenantsWithProgramCount);
  fastify.post("/tenant/advanced-filter", advancedSearchTenants);
  fastify.get("/tenant/:client_id/password-policy", getPasswordPolicy);
}

export default tenantRoutes;
