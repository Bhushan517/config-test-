import axios from 'axios';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/instance';
import { NotificationDataPayload } from '../interfaces/noifications-data-payload.interface'
import { EmailRecipient } from '../interfaces/email-recipient';
import { databaseConfig } from '../config/db';
const auth_db = databaseConfig.config.database_auth;

function getNotificationUrl(): string | undefined {
    return databaseConfig.config.notification_url;
}

function validateToken(token: string | undefined): boolean {
    if (!token) {
        console.error('Notification token is not defined.');
        return false;
    }
    return true;
}

export async function sendNotification(payload: NotificationDataPayload): Promise<{success: boolean, message: string}> {
    try {
        // Get program data
        const programData = await sequelize.query(
            `SELECT * FROM programs WHERE id = :program_id`,
            {
                replacements: { program_id: payload.program_id },
                type: QueryTypes.SELECT
            }
        );
        
        const program = programData[0] as any;
        if (!program) {
            return {
                success: false,
                message: `Program not found for ID: ${payload.program_id}`
            };
        }
        
        // Get tenant ID
        const tenantId = program.client_id || program.msp_id;
        if (!tenantId) {
            return {
                success: false,
                message: "Tenant ID is missing in the program data."
            };
        }

        // Get tenant info
        const tenantResult = await sequelize.query(
            `SELECT logo, name FROM tenant WHERE id = :tenant_id`,
            {
                replacements: { tenant_id: tenantId },
                type: QueryTypes.SELECT
            }
        ) as any[];

        if (!tenantResult || tenantResult.length === 0) {
            return {
                success: false,
                message: `Tenant information not found for tenant ID: ${tenantId}`
            };
        }

        const tenantLogo = tenantResult[0].logo;
        const tenantName = tenantResult[0].name;
        
        // Get user data
        const type = payload.payload.user_type;
        let userData: any;
        
        try {
            if (type === 'super_user') {
                const users = await sequelize.query(
                    `SELECT * FROM ${auth_db}.user WHERE user_id = :user_id`,
                    {
                        replacements: { user_id: payload.userId },
                        type: QueryTypes.SELECT
                    }
                );
                userData = users[0];
            } else {
                const users = await sequelize.query(
                    `SELECT * FROM user WHERE user_id = :user_id AND program_id = :program_id`,
                    {
                        replacements: { 
                            program_id: payload.program_id, 
                            user_id: payload.userId 
                        },
                        type: QueryTypes.SELECT
                    }
                );
                userData = users[0];
            }
        } catch (error) {
            return {
                success: false,
                message: `Error fetching user data: ${error instanceof Error ? error.message : String(error)}`
            };
        }
        
        if (!userData) {
            return {
                success: false,
                message: `User not found for program ID: ${payload.program_id} and user ID: ${payload.userId}`
            };
        }

        const notificationUrl = getNotificationUrl();
        if (!notificationUrl) {
            return {
                success: false,
                message: 'Notification URL is not defined in environment variables.'
            };
        }

        if (!validateToken(payload.token)) {
            return {
                success: false,
                message: 'Token validation failed.'
            };
        }

        if (!payload.recipientEmail || payload.recipientEmail.length === 0) {
            return {
                success: false,
                message: 'No recipients specified for the notification.'
            };
        }

        const results = await Promise.allSettled(
            payload.recipientEmail.map(async (element: EmailRecipient) => {
                try {
                    const senderEmail = payload.payload?.from_email || "noreply@simplifyvms.com";
                    
                    // Create enriched payload data
                    const enrichedData = {
                        ...payload.payload,
                        fullName: `${element.first_name} ${element.middle_name || ""} ${element.last_name}`,
                        created_by_first_name: userData.first_name,
                        created_by_last_name: userData.last_name,
                        logo_url: tenantLogo,
                        name: tenantName
                    };
                    
                    const notificationData = {
                        entityRefId: "simplifyvms",
                        program_id: payload.program_id,
                        traceId: payload.traceId,
                        eventCode: payload.eventCode,
                        channels: ["EMAIL"],
                        recipient: {
                            email: {
                                to: [{ email: element.email }],
                                sender: { email: senderEmail }
                            }
                        },
                        payload: enrichedData,
                        userId: payload.userId ?? "",
                        language: "en"
                    };
                    
                    
                    // Make API call with proper error handling
                    const response = await axios.post(
                        `${notificationUrl}/notification-message/`,
                        notificationData,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${payload.token}`,
                            },
                        }
                    );
                    
                    return {
                        success: true,
                        recipient: element.email,
                        status: response.status
                    };
                } catch (error) {
                    console.error(`Failed to send notification to ${element.email}:`, 
                        error instanceof Error ? error.message : String(error),
                        error instanceof Error && 'response' in error ? (error as any).response?.data : ''
                    );
                    
                    return {
                        success: false,
                        recipient: element.email,
                        error: error instanceof Error ? error.message : String(error)
                    };
                }
            })
        );
        
        // Count successful and failed notifications
        const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
        const failed = results.length - successful;
        
        if (failed > 0) {
            return {
                success: successful > 0,
                message: `Sent ${successful} notifications, failed to send ${failed} notifications. Check logs for details.`
            };
        }
        
        return {
            success: true,
            message: `Successfully sent ${successful} notifications.`
        };
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stackTrace = error instanceof Error ? error.stack : 'No stack trace available';
        console.error('Error occurred in sendNotification:', errorMessage, stackTrace);
        
        return {
            success: false,
            message: `Error in notification service: ${errorMessage}`
        };
    }
}

