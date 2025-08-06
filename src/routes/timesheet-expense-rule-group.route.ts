import { FastifyInstance } from 'fastify';
import * as TimesheetExpenseRuleGroupController from '../controllers/timesheet-expense-rule-group.controller';
import { createTimesheetExpenseRuleGroupSchema, paramsSchema, querySchema } from '../interfaces/timesheet-expense-rule-group.interface';
import { validatePermissions } from '../middlewares/vaildate-permissions';
import { Actions, Permissions } from '../constants/permissions';
import { verifyToken } from '../middlewares/verifyToken';

async function timesheetExpenseRuleGroupRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/timesheet-expense-rule-groups', {
        schema: {
            params: paramsSchema,
            body: createTimesheetExpenseRuleGroupSchema
        },
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.TIMESHEET_EXPENSE_RULES_GROUP])
    }, TimesheetExpenseRuleGroupController.createTimesheetExpenseRuleGroup);

    fastify.get('/timesheet-expense-rule-groups/get-all', {
        schema: {
            params: paramsSchema,
            querystring: querySchema
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.TIMESHEET_EXPENSE_RULES_GROUP])
    }, TimesheetExpenseRuleGroupController.getAllTimesheetExpenseRuleGroups);

    fastify.get('/timesheet-expense-rule-groups/:id', {
        schema: {
            params: paramsSchema,
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.TIMESHEET_EXPENSE_RULES_GROUP])
    }, TimesheetExpenseRuleGroupController.getTimesheetExpenseRuleGroupById);

    fastify.put('/timesheet-expense-rule-groups/:id', {
        schema: {
            params: paramsSchema,
            body: createTimesheetExpenseRuleGroupSchema
        },
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.TIMESHEET_EXPENSE_RULES_GROUP])
    }, TimesheetExpenseRuleGroupController.updateTimesheetExpenseRuleGroup);

    fastify.delete('/timesheet-expense-rule-groups/:id', {
        schema: {
            params: paramsSchema
        }
    }, TimesheetExpenseRuleGroupController.deleteTimesheetExpenseRuleGroup);

    fastify.post('/timesheet-expense-rule-groups/advance-filter', {
        schema: {
            params: paramsSchema
        },
        // preHandler: validatePermissions(Actions.READ, [Permissions.TIMESHEET_EXPENSE_RULES_GROUP])
    }, TimesheetExpenseRuleGroupController.filterTimesheetExpenseRuleGroups);
}

export default timesheetExpenseRuleGroupRoutes;