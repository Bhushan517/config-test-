export interface EmailRecipient {
    email: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    userType?: string;
    created_on?: bigint;
    updated_on?: bigint;
    // Add any other properties you need
}