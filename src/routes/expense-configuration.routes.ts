import { FastifyInstance } from "fastify";
import * as ExpenseConfigurationController from "../controllers/expense-configuration.controller";
// import { validatePermissions } from "../middlewares/vaildate-permissions";
// import { Actions, Permissions } from "../constants/permissions";
import { createExpenseConfigurationAdvancedFilter, createExpenseConfigurationSchema, paramsSchema, querySchema } from "../interfaces/expense-configuration.interfaces";
import { verifyToken } from "../middlewares/verifyToken";


async function expenseConfigurationRoutes(fastify: FastifyInstance) {

    fastify.addHook('preHandler', verifyToken);

    fastify.get('/program/:program_id/expense-config', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.EXPENSE_CONFIGURATION])
    }, ExpenseConfigurationController.getExpenseConfigurations);

    fastify.get('/program/:program_id/expense-config/:id', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.EXPENSE_CONFIGURATION])
    }, ExpenseConfigurationController.getExpenseConfigurationById);

    fastify.post('/program/:program_id/expense-config', {
        schema: {
            body: createExpenseConfigurationSchema,
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.EXPENSE_CONFIGURATION])
    }, ExpenseConfigurationController.createExpenseConfiguration);

    fastify.put('/program/:program_id/expense-config/:id', {
        schema: {
            body: createExpenseConfigurationSchema,
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.EXPENSE_CONFIGURATION])
    }, ExpenseConfigurationController.updateExpenseConfiguration);

    fastify.put('/program/:program_id/expense-config', {
        schema: {
            params: paramsSchema,
        }
    }, ExpenseConfigurationController.enableExpenseConfiguration);

    fastify.get('/program/:program_id/expense-configs-hierarchies', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.EXPENSE_CONFIGURATION])
    }, ExpenseConfigurationController.getAllExpenseConfigurationHierarchies);

    fastify.post('/program/:program_id/expense-configs-advanced-filter', {
        schema: {
            params: paramsSchema,
            body: createExpenseConfigurationAdvancedFilter
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.EXPENSE_CONFIGURATION])
    }, ExpenseConfigurationController.expenseConfigurationAdvancedFilter);

    fastify.get('/program/:program_id/expense-config-type-by-hierarchy', {
        schema: {
            params: paramsSchema,
            querystring: querySchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.EXPENSE_CONFIGURATION])
    }, ExpenseConfigurationController.getExpenseTypesByProgramIdAndHierarchies);


    fastify.get('/program/:program_id/expense-configurations', {
        schema: {
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.EXPENSE_CONFIGURATION])
    }, ExpenseConfigurationController.getExpenseConfigByExpenseType);


}

export default expenseConfigurationRoutes;