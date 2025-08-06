import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { checkPermission } from '../utility/check-permissions';
import generateCustomUUID from '../utility/genrateTraceId';
import logger from '../plugins/logger-plugin';

/**
 * Creates a middleware function that validates permissions for a given action
 * @param action - The action being performed
 * @param permissions - The permissions required for the action
 * @returns A Fastify middleware function
 */
export function validatePermissions(action: string, permissions: string[]) {
  return function (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
    const token = request.headers.authorization;

    // Get program_id from params or body
    const program_id =
      (request.params as any)?.program_id ??
      (request.body as any)?.program_id;

    // Generate a trace ID for this request
    const trace_id = generateCustomUUID();

    if (!token) {
      reply.status(401).send({
        status_code: 401,
        message: "Unauthorized: Missing authorization token",
        trace_id,
      });
      return done();
    }

    if (!program_id) {
      reply.status(401).send({
        status_code: 401,
        message: "Unauthorized: Missing program_id in request",
        trace_id,
      });
      return done();
    }

    logger.info('Validating permissions', {
      permissions,
      action,
      program_id,
      trace_id
    });

    checkPermission({ token, programId: program_id, requiredPermissions: { permissions }, action })
      .then(() => {
        done();
      })
      .catch((error) => {
        logger.error(error);
        reply.status(403).send({
          status_code: 403,
          message: error.message,
          error,
          trace_id: generateCustomUUID(),
        });
        done();
      });
  }
};