
import { FastifyInstance } from "fastify";
import * as ExpenseTypeController from "../controllers/expense-type.controller";
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Actions, Permissions } from "../constants/permissions";
import { createExpenseTypeSchema, paramsSchema, querySchema } from "../interfaces/expense-type.interface";
import { verifyToken } from "../middlewares/verifyToken";

async function expenseTypeRoute(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);

    fastify.get("/program/:program_id/expense-type/:id", {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.EXPENSE_TYPE])
    }, ExpenseTypeController.getExpenseTypeById);

    fastify.post("/program/:program_id/expense-type", {
        schema: {
            params: paramsSchema,
            body: createExpenseTypeSchema,
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.EXPENSE_TYPE])
    }, ExpenseTypeController.createExpenseType);

    fastify.delete("/program/:program_id/expense-type/:id", {
        schema: {
            params: paramsSchema,
        }
    }, ExpenseTypeController.deleteExpenseTypeById);

    fastify.put("/program/:program_id/expense-type/:id", {
        schema: {
            body: createExpenseTypeSchema,
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.EXPENSE_TYPE])
    }, ExpenseTypeController.updateExpenseTypeById);

    fastify.get("/program/:program_id/expense-type", {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.EXPENSE_TYPE])
    }, ExpenseTypeController.getAllExpenseType);

    fastify.post("/program/:program_id/expense-type/advancefilter", {
        schema: {
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.EXPENSE_TYPE])
    }, ExpenseTypeController.advancefilter);

}

export default expenseTypeRoute;