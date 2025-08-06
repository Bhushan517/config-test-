export interface TimesheetExpenseRule {
    id?: string;
    rule_name?: string;
    rule_type?: string;
    rule_duration?: string;
    break_type?: string;
    is_paid_break?: boolean;
    is_mandatory_break?: boolean;
    weekend_days?: any;
    conditions?: any;
    penalty_rules?: {
        method: string;
        apply_rate_type: string;
        no_missing_breaks: number;
        penalty_rat_hours: number;
    }
    apply_rate_type?: any;
    created_by?: string;
    updated_by?: string;
    is_enabled?: boolean;
    is_deleted?: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    program_id: string;
}

export const QuerySchema = {
    type: 'object',
    properties: {
        rule_name: { type: 'string' },
        rule_type: { type: 'string' },
        rule_category: { type: 'string' },
        is_enabled: { type: 'string' },
        updated_on: { type: 'string' },
        page: { type: 'string' },
        limit: { type: 'string' }
    },
};

export const paramsSchema = {
    type: 'object',
    properties: {
        program_id: { type: 'string' },
        id: { type: 'string' }
    },
    required: ['program_id']
};


export const createTimesheetExpenseRuleSchema = {
    type: 'object',
    required: ['rule_name'],
    properties: {
        id: { type: 'string' },
        rule_name: { type: 'string' },
        rule_type: { type: 'string' },
        rule_duration: { type: 'string' },
        break_type: { type: 'string' },
        is_paid_break: { type: 'boolean' },
        rule_category: { type: 'string' },
        conditions: { type: 'array' },
        penalty_rules: {
            type: 'object',
            properties: {
                method: { type: 'string' },
                apply_rate_type: { type: 'string' },
                no_missing_breaks: { type: 'number' },
                penalty_rat_hours: { type: 'number' }
            }
        },
        apply_rate_type: { type: 'array' },
        expense_line_item: { type: 'array' },
        created_by: { type: 'string' },
        updated_by: { type: 'string' },
        is_enabled: { type: 'boolean' },
        is_deleted: { type: 'boolean' },
        created_on: { type: 'number' },
        updated_on: { type: 'number' },
        program_id: { type: 'string' }
    }
};