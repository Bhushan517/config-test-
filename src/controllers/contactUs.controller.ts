import { FastifyRequest, FastifyReply } from "fastify";
import { decodeToken } from "../middlewares/verifyToken";
import generateCustomUUID from "../utility/genrateTraceId";
import { sequelize } from "../config/instance";
import { QueryTypes } from "sequelize";
import { sendNotification } from "../utility/notificationService";
import { NotificationDataPayload } from "../interfaces/noifications-data-payload.interface";
import { EmailRecipient } from "../interfaces/email-recipient";
import { NotificationEventCode } from "../utility/notification-event-code";
export async function createContactUs(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    try {
        const { your_detail, support_email, subject, URL, message, program_id, program_name } = request.body as {
            your_detail: string;
            support_email: string;
            subject: string;
            message: string;
            URL?: string;
            program_id?: string;
            program_name?: string;
        };

        validateRequestBody(request.body, traceId);

        const { user, token } = await validateAuthorizationHeader(request.headers.authorization, traceId);

        if (!user.sub) {
            throw {
                status: 400,
                message: "User ID is missing",
                traceId,
            };
        }
        const plainMessage = stripHtmlTags(message);

        (async () => {
            const { from_name, from_last_name, from_email } = await getUserDetails(user.sub as string, traceId);

            const emailArray = Array.isArray(from_email) ? from_email : [from_email];

            const first_name = from_name;
            const last_name = from_last_name;

            const recipientEmail: EmailRecipient = {
                email: support_email,
                first_name,
                last_name,
            };

            const recipientEmailArray: EmailRecipient[] = [];
            recipientEmailArray.push(recipientEmail);

            if (emailArray.length > 0) {

                const eventCode = NotificationEventCode.CUSTOMER_SUPPORT1;

                const notificationPayload: NotificationDataPayload = {
                    program_id: program_id ?? "",
                    token,
                    traceId,
                    eventCode,
                    recipientEmail: recipientEmailArray,
                    payload: {
                        program_id,
                        program_name,
                        reporter_details: your_detail,
                        from_email,
                        from_name: `${first_name} ${last_name}`,
                        url: URL,
                        message: plainMessage,
                    },
                    userId: user.sub ?? "",
                };
                sendNotification(notificationPayload);
            }
        })().catch((err) => {
            console.error("Error in notification block:", err);
        });

        return reply.status(200).send({
            status: "success",
            message: "created successfully.",
            traceId: traceId,
            data: { your_detail, support_email, subject, URL, message },
        });
    } catch (error) {
        console.error("Error in createContactUs:", error);
        return reply.status(500).send({
            status: "error",
            message: (error as any).message,
            traceId,
        });
    }
}

function stripHtmlTags(input: string): string {
    return input.replace(/<\/?[^>]+(>|$)/g, "");
}

function validateRequestBody(body: any, traceId: string) {
    const { your_detail, support_email, subject, message } = body;
    if (!your_detail || !support_email || !subject || !message) {
        throw {
            status: 400,
            message: "Missing required fields: your_details, email, subject, or message.",
            traceId,
        };
    }
}

async function validateAuthorizationHeader(authHeader: string | undefined, traceId: string) {
    if (!authHeader?.startsWith("Bearer ")) {
        throw {
            status: 401,
            message: "Unauthorized - Token not found",
            traceId,
        };
    }

    const token = authHeader.split(" ")[1];
    try {
        const user = await decodeToken(token);
        if (!user) {
            throw new Error("Invalid token");
        }
        return { user, token };
    } catch (error) {
        throw {
            status: 401,
            message: "Unauthorized - Invalid token",
            traceId,
            error: (error as Error).message,
        };
    }
}

async function getUserDetails(userId: string, traceId: string) {
    const [userDetails]: any = await sequelize.query(
        `
        SELECT 
            u.first_name AS from_name, 
            u.last_name AS from_last_name, 
            u.email AS from_email
        FROM 
            user u
        WHERE 
            u.user_id = :userId
        `,
        {
            replacements: { userId },
            type: QueryTypes.SELECT,
        }
    );

    if (!userDetails) {
        throw {
            status: 404,
            message: "User not found",
            traceId,
        };
    }

    return userDetails;
}
