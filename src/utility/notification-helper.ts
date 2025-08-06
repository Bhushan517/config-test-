import { NotificationDataPayload } from '../interfaces/noifications-data-payload.interface';
import { EmailRecipient } from '../interfaces/email-recipient';
import { QueryTypes, Sequelize } from "sequelize";
import { databaseConfig } from '../config/db';
import axios from 'axios';
import { sequelize } from '../config/instance';
import Currencies from '../models/currencies.model';
import Hierarchies from '../models/hierarchies.model';
const config_db = databaseConfig.config.database;
const sourcing_url = databaseConfig.config.sourcing_url;
const teai_url = databaseConfig.config.teai_url
const db_sourcing = databaseConfig.config.db_sourcing;

export async function getUsersWithHierarchy(
    sequelize: any,
    programId: string | null,
    userType: string | null,
    hierarchies: string[] | null
): Promise<EmailRecipient[]> {
    const hierarchyJson = JSON.stringify(hierarchies);

    const result: any[] = await sequelize.query(
        `
        SELECT user.email,
               user.first_name,
               user.middle_name,
               user.last_name,
               user.user_type
        FROM ${config_db}user
        JOIN ${config_db}.user_mappings ON user.id = user_mappings.user_id
        WHERE user.program_id = :program_id
          AND user.user_type = :userType
        AND (
            user.is_all_hierarchy_associate = true
            OR (
                user.is_all_hierarchy_associate = false
                AND EXISTS (
                    SELECT 1
                    FROM JSON_TABLE(
                        user.associate_hierarchy_ids,
                        '$[*]' COLUMNS (hierarchy_id INT PATH '$')
                    ) AS jt
                    WHERE jt.hierarchy_id IN (:hierarchy_ids)
                )
            )
        );
        `,
        {
            replacements: {
                program_id: programId,
                userType: userType,
                hierarchy_ids: hierarchyJson,
            },
            type: QueryTypes.SELECT,
        }
    );

    if (result.length > 0) {
        const emailRecipientList: EmailRecipient[] = result.map((user: any) => ({
            email: user.email || null,
            firstName: user.first_name || null,
            middleName: user.middle_name || null,
            lastName: user.last_name || null,
            userType: user.user_type || null
        }));

        return emailRecipientList;
    }

    return [];
}


export async function getProgramType(sequelize: any, programId: string): Promise<string | null> {
    const result: any[] = await sequelize.query(
        `SELECT type
         FROM ${config_db}.programs AS program
         WHERE program.id = :program_id;`,
        {
            replacements: { program_id: programId },
            type: QueryTypes.SELECT
        }
    );

    if (result.length > 0) {
        return result[0].type;
    }

    return null;
}



export async function getJobManagerEmail(sequelize: any, jobManagerId: string): Promise<EmailRecipient | null> {
    const result: any[] = await sequelize.query(
        `SELECT user.email,
                    user.first_name,
                    user.middle_name,
                    user.last_name,
                    user.user_type
            FROM ${config_db}.user AS user
            WHERE user.id = :job_manager_id;`,
        {
            replacements: { job_manager_id: jobManagerId },
            type: QueryTypes.SELECT
        }
    );

    if (result.length > 0) {
        const user = result[0]; // Assuming only one job manager is returned
        const emailRecipient: EmailRecipient = {
            email: user.email || null,
            first_name: user.first_name || null,
            middle_name: user.middle_name || null,
            last_name: user.last_name || null,
            userType: user.user_type || null
        };

        return emailRecipient;
    }

    return null; // Return null if no job manager is found
}

export async function getUsersByMetaValues(sequelize: any, metaValues: string[]): Promise<EmailRecipient[]> {
    const userQuery = `
            SELECT id, first_name, last_name, email, user_type
            FROM ${config_db}.user
            WHERE id IN (:meta_values)
              AND is_enabled = true;`;

    const userResults = await sequelize.query(userQuery, {
        type: QueryTypes.SELECT,
        replacements: { meta_values: metaValues },
    });

    return userResults.map((user: any) => ({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        userType: user.user_type,
    }));
}
export async function notifyJobManager(
    sendNotification: Function,
    notificationPayload: NotificationDataPayload,
    recipientEmail: object[] | null
): Promise<void> {
    if (recipientEmail) {
        console.log('User information:', notificationPayload.userId);
        await sendNotification(notificationPayload);
        console.info("Notification sent to:", recipientEmail);
    } else {
        console.info("No recipient email found, notification skipped.");
    }
}

export async function FetchUsersBasedOnHierarchy(
    sequelize: any,
    allPayload: { hierarchy_ids: any[], program_id: any, user_type: string[] }
): Promise<EmailRecipient[]> {
    try {
        const { hierarchy_ids, program_id, user_type } = allPayload;

        // Query to fetch users based on hierarchy_ids and program_id
        const query = `
        SELECT u.email,
               u.first_name,
               u.middle_name,
               u.last_name,
               u.user_type
        FROM user u
        WHERE u.program_id = :program_id
          AND u.user_type IN (:user_type)
        AND (
            u.is_all_hierarchy_associate = true
            OR (
                u.is_all_hierarchy_associate = false
                AND EXISTS (
                    SELECT 1
                    FROM JSON_TABLE(
                        u.associate_hierarchy_ids,
                        '$[*]' COLUMNS (hierarchy_id INT PATH '$')
                    ) AS jt
                    WHERE jt.hierarchy_id IN (:hierarchy_ids)
                )
            )
        );
        `;

        // Execute the query
        const users = await sequelize.query(query, {
            type: QueryTypes.SELECT,
            replacements: {
                program_id: program_id,
                user_type: user_type || '',
                hierarchy_ids: hierarchy_ids,
            },
        });

        // Map the results to EmailRecipient format
        const emailRecipientList: EmailRecipient[] = users.map((user: any) => ({
            email: user.email || null,
            first_name: user.first_name || null,
            middle_name: user.middle_name || null,
            last_name: user.last_name || null,
            userType: user.user_type || null,
        }));

        return emailRecipientList; // Return the list of email recipients
    } catch (error) {
        console.error("Error fetching users:", error);
        throw new Error("Error fetching users based on hierarchy and program_id.");
    }
}



interface WorkflowDetails {
    job_id: string;
    first_name: string;
    last_name: string;
    email: string;
    unique_key: string;
    offer_code?: string;
    candidate_id?: string;
    events?: string;
    workflow_trigger_id?: string;
    code?: string
}

export async function getWorkflowDetails(
    sequelize: Sequelize,
    workflowId: string
): Promise<WorkflowDetails | null> {
    try {

        const result = await sequelize.query(
            `SELECT 
                w.id AS workflow_id,
                w.job_id, 
                c.first_name, 
                c.last_name, 
                c.email, 
                w.unique_key,
                w.code,
                w.candidate_id,
                w.events,
                w.workflow_trigger_id
             FROM workflow w
             LEFT JOIN candidates c ON w.candidate_id = c.id
             WHERE w.id = :workflow_id;`,
            {
                replacements: { workflow_id: workflowId },
                type: QueryTypes.SELECT,
            }
        ) as WorkflowDetails[];


        return result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error("Error fetching workflow details:", error);
        throw error;
    }
}

export async function isVendorRequired(eventCode: string): Promise<boolean> {
    const requiredEvents = new Set([
        "CANDIDATE_SHORTLIST_REJECTED",
        "REHIRE_REVIEW_REJECT",
        "REHIRE_APPROVAL_REJECT",
        "ASSIGNMENT_APPROVAL_REJECTED",
        "ASSIGNMENT_MODIFIED_REJECTED"
    ]);

    return requiredEvents.has(eventCode);
}

export async function getProgramVendorsEmail(programId: string): Promise<EmailRecipient[]> {
    try {
        const contacts = await sequelize.query(
            `SELECT 
                ct.email AS email,
                ct.first_name AS first_name,
                ct.last_name AS last_name
            FROM program_vendors
            CROSS JOIN JSON_TABLE(
                contact, '$[*]' 
                COLUMNS (
                    email VARCHAR(255) PATH '$.email',
                    first_name VARCHAR(255) PATH '$.first_name',
                    last_name VARCHAR(255) PATH '$.last_name'
                )
            ) AS ct
            WHERE program_id = :program_id
            AND JSON_VALID(contact);`,
            {
                replacements: { program_id: programId },
                type: QueryTypes.SELECT
            }
        ) as { email: string, first_name: string, last_name: string }[];

        return contacts;
    } catch (error) {
        console.error('Error fetching program vendor contact details:', error);
        throw error;
    }
}
export const getJobDetails = async (id: string, program_id: string, token: string) => {
    try {
        const response = await axios.get(`${sourcing_url}/v1/api/program/${program_id}/job/${id}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.data) {
            console.warn("Job details not found.");
            return { status: 404, message: "Job details not found", data: null };
        }
        console.log('Job details fetched successfully');
        return { status: 200, message: "Success", data: response.data };
    } catch (error: any) {
        return handleErrorProperly(error, "Job details");
    }
};

export const getOfferDetails = async (id: string, program_id: string, token: string) => {
    try {
        const response = await axios.get(`${sourcing_url}/v1/api/program/${program_id}/offer/${id}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.data) {
            console.warn("Offer details not found.");
            return { status: 404, message: "Offer details not found", data: null };
        }
        console.log('Offer details fetched successfully');
        return { status: 200, message: "Success", data: response.data };
    } catch (error: any) {
        return handleErrorProperly(error, "Offer details");
    }
};

export const getAssignmentDetails = async (id: string, program_id: string, token: string) => {
    try {
        const response = await axios.get(`${teai_url}/assignment/v1/program/${program_id}/assignments/${id}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.data) {
            console.warn("Assignment details not found.");
            return { status: 404, message: "Assignment details not found", data: null };
        }
        console.log('Assignment details fetched successfully');
        return { status: 200, message: "Success", data: response.data };
    } catch (error: any) {
        return handleErrorProperly(error, "Assignment details");
    }
};

export const handleErrorProperly = (error: any, entity: string) => {
    if (axios.isAxiosError(error)) {
        if (error.response) {
            if (error.response.status === 404) {
                console.warn(`${entity} not found:`, error.response.data);
                return { status: 404, message: `${entity} not found`, data: null };
            }
            console.error(`Error fetching ${entity}:`, error.response.data);
            return { status: error.response.status, message: `Error fetching ${entity}`, data: null };
        } else if (error.request) {
            console.error(`No response received while fetching ${entity}`);
            return { status: 500, message: `No response received while fetching ${entity}`, data: null };
        }
    }
    console.error(`Unexpected error while fetching ${entity}:`, error.message);
    return { status: 500, message: `Unexpected error while fetching ${entity}`, data: null };
};



export async function formatCurrencyAmount(currencyCode: string, amount: number): Promise<string> {
    const currency = await Currencies.findOne({
        where: { code: currencyCode },
        attributes: ['symbol'],
        raw: true
    });

    const symbol = currency?.symbol || '';
    const formattedAmount = Number(amount).toLocaleString("en-US");
    return `${symbol} ${formattedAmount}`;
}


export const getSubmissionData = async (id: string, program_id: string, token: string) => {
    const data = `${sourcing_url}/v1/api/program/${program_id}/get-submission-candidate/${id}`;
    try {
        const response = await axios.get(data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.data) {
            console.warn("Submission details not found.");
            return { status: 404, message: "Submission details not found", data: null };
        }

        console.log("Submission details fetched successfully");
        return { status: 200, message: "Success", data: response.data };

    } catch (error: any) {
        console.error("Error fetching submission details:", error?.response?.data || error.message);
        return { status: 500, message: "Error fetching submission details", data: null };
    }
};


  
export async function formatDatesByHierarchy(
  hierarchyId: string,
  startDate: string | Date,
  endDate: string | Date
): Promise<{ start_date: string; end_date: string }> {
  try {
    try {
      const hierarchy = hierarchyId
        ? await Hierarchies.findOne({ where: { id: hierarchyId } })
        : null;

      const format = hierarchy?.default_date_format?.toUpperCase() || 'MM/DD/YYYY';

      const formatDate = (dateInput: string | Date | null | undefined): string => {
        if (!dateInput) return '';
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const yyyy = date.getFullYear();

        switch (format) {
          case 'DD/MM/YYYY':
            return `${dd}/${mm}/${yyyy}`;
          case 'YYYY/MM/DD':
            return `${yyyy}/${mm}/${dd}`;
          default:
            return `${mm}/${dd}/${yyyy}`;
        }
      };

      return {
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      };
    } catch (error) {
      console.error('Error formatting date :', error);

      const dates = (dateInput: string | Date | null | undefined): string => {
        const date = new Date(dateInput || '');
        return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
      };

      return {
        start_date: dates(startDate),
        end_date: dates(endDate),
      };
    }
  } catch (fatalError) {
    console.error('Error in formatDatesByHierarchy:', fatalError);
    return { start_date: '', end_date: '' };
  }
}

export async function getReasonById(reasonId: string): Promise<string> {
    try {
        const result: any[] = await sequelize.query(
            `
            SELECT name 
            FROM ${config_db}.reason_codes 
            WHERE id = :reasonId
            `,
            {
                replacements: { reasonId },
                type: QueryTypes.SELECT,
            }
        );

        return result[0]?.name || '';
    } catch (error) {
        console.error('Error fetching reason:', error);
        return '';
    }
}