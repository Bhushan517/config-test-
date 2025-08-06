import { FastifyInstance } from 'fastify';
import * as TimesheetExpenseRuleController from '../controllers/timesheet-expense-rule.controller';
import { createTimesheetExpenseRuleSchema, paramsSchema, QuerySchema } from '../interfaces/timesheet-expense-rule.interface';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function TimesheetExpenseRuleRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/program/:program_id/timesheet-expense-rule', {
        schema: {
            params: paramsSchema,
            body: createTimesheetExpenseRuleSchema
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.TIMESHEET_EXPENSE_RULE])
    }, TimesheetExpenseRuleController.createTimesheetExpenseRule);

    fastify.get('/program/:program_id/timesheet-expense-rules', {
        schema: {
            params: paramsSchema,
            querystring: QuerySchema
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.TIMESHEET_EXPENSE_RULE])
    }, TimesheetExpenseRuleController.getTimesheetExpenseRule);

    fastify.get('/program/:program_id/timesheet-expense-rule/:id', {
        schema: {
            params: paramsSchema
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.TIMESHEET_EXPENSE_RULE])
    }, TimesheetExpenseRuleController.getTimesheetExpenseRuleById);

    fastify.put('/program/:program_id/timesheet-expense-rule/:id',
        {
            schema: {
                params: paramsSchema,
                body: createTimesheetExpenseRuleSchema
            },
            // preHandler: validatePermissions(Actions.UPDATE, [Permissions.TIMESHEET_EXPENSE_RULE])
        }, TimesheetExpenseRuleController.updateTimesheetExpenseRule);

    fastify.delete('/program/:program_id/timesheet-expense-rule/:id',
        {
            schema: {
                params: paramsSchema
            }
        }, TimesheetExpenseRuleController.deleteTimesheetExpenseRule);

    fastify.post('/program/:program_id/timesheet-expense-rule/advance-filter',
        {
            schema: {
                params: paramsSchema
            },
            // preHandler: validatePermissions(Actions.READ, [Permissions.TIMESHEET_EXPENSE_RULE])
        }, TimesheetExpenseRuleController.filterTimesheetExpenseRule);
}

export default TimesheetExpenseRuleRoutes;