import { FastifyReply } from "fastify";


export function sanitizeError(error: any): string {

    if (error.name === 'SequelizeUniqueConstraintError') {
        return 'A record with this information already exists';
    }
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return 'Referenced record does not exist';
    }
    
    if (error.name === 'SequelizeValidationError') {
        return 'Invalid data provided';
    }
    
    return process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : (error.message || 'Unknown error');
}


export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    
    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}


export function handleError(error: any, traceId: string) {
    console.error(`[Error] [${traceId}]:`, error);
    
    if (error instanceof AppError) {
        return {
            status_code: error.statusCode,
            message: error.message,
            trace_id: traceId
        };
    }
    
    return {
        status_code: 500,
        message: sanitizeError(error),
        trace_id: traceId
    };
}