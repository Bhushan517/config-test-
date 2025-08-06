import { FastifyInstance } from "fastify";
import * as InvoiceController from "../controllers/invoice-config.controller";
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Permissions, Actions } from "../constants/permissions";
import { verifyToken } from "../middlewares/verifyToken";

async function invoiceConfigRoute(fastify: FastifyInstance) {
     fastify.addHook('preHandler', verifyToken);
    fastify.post("/program/:program_id/invoice-config", {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.INVOICE_CONFIGURATION])
    }, InvoiceController.createInvoiceConfig);

    fastify.get("/program/:program_id/invoice-configs", {
        // preHandler: validatePermissions(Actions.READ, [Permissions.INVOICE_CONFIGURATION])
    }, InvoiceController.getAllInvoiceConfig);

    fastify.get("/program/:program_id/invoice-config/:id", {
        // preHandler: validatePermissions(Actions.READ, [Permissions.INVOICE_CONFIGURATION])
    }, InvoiceController.getInvoiceConfigById);

    fastify.put("/program/:program_id/invoice-config/:id", {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.INVOICE_CONFIGURATION])
    }, InvoiceController.updateInvoiceConfigById);

    fastify.delete("/program/:program_id/invoice-config/:id", InvoiceController.deleteInvoiceConfigById);

}

export default invoiceConfigRoute;