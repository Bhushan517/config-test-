import { FastifyInstance } from "fastify";
import * as RateCardController from "../controllers/rate-card.controller";
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from "../middlewares/verifyToken";

async function rateCardsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyToken);
  fastify.post("/program/:program_id/rate-card", {
    // preHandler: validatePermissions(Actions.CREATE, [Permissions.RATE_CARD])
  }, RateCardController.createRateCard);

  fastify.get("/program/:program_id/rate-card", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_CARD])
  }, RateCardController.getAllRateCards);

  fastify.post("/program/:program_id/rate-card/advance-filter", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_CARD])
  }, RateCardController.advanceFilterRateCards);

  fastify.get("/program/:program_id/rate-card/:id", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.RATE_CARD])
  }, RateCardController.getRateCardById);

  fastify.put("/program/:program_id/rate-card/:id", {
    // preHandler: validatePermissions(Actions.UPDATE, [Permissions.RATE_CARD])
  }, RateCardController.updateRateCard);

}

export default rateCardsRoutes;