export interface TimesheetExpenseRuleGroupData {
    id: string;
    program_id: string;
    rule_group_name: string;
    rule_type: string;
    rule_category: string;
    timesheet_expense_rules: any;
    is_enabled: boolean;
    is_deleted?: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string;
    updated_by: string;
}

export const paramsSchema = {
    type: 'object',
    properties: {
        program_id: { type: 'string' },
        id: { type: 'string' }
    },
    required: ['program_id']
};
export const querySchema = {
    type: 'object',
    properties: {
        page: { type: 'string' },
        limit: { type: 'string' },
        rule_category: { type: 'string' },
        rule_group_name: { type: 'string' },
        rule_type: { type: 'string' },
        is_enabled: { type: 'string' },
        order: { type: 'string' }
    }
};

export const createTimesheetExpenseRuleGroupSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        program_id: { type: 'string' },
        rule_group_name: { type: 'string' },
        rule_type: { type: 'string' },
        rule_category: { type: 'string' },
        timesheet_expense_rules: { type: 'array' },
        is_enabled: { type: 'boolean' },
        is_deleted: { type: 'boolean' },
        created_on: { type: 'number' },
        updated_on: { type: 'number' },
        created_by: { type: 'string' },
        updated_by: { type: 'string' }
    }
};