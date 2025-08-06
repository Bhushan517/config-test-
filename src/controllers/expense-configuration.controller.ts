import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import expenseConfigurationService from "../service/expense-configuration.service";

export async function getExpenseConfigurations(request: FastifyRequest<{}>, reply: FastifyReply) {
    const traceId = generateCustomUUID();

    const result = await expenseConfigurationService.getExpenseConfigurations({
        request,
        traceId
    });

    if (!result) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: 'Service returned undefined response'
        });
    }

    return reply.status(result.status).send(result.response);
}

export async function getExpenseConfigurationById(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params as { program_id: string; id: string };

    const result = await expenseConfigurationService.getExpenseConfigurationById({
        program_id,
        id,
        traceId
    });

    if (!result) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: 'Service returned undefined response'
        });
    }

    return reply.status(result.status).send(result.response);
}

export async function createExpenseConfiguration(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const user = request.user as { sub: string; preferred_username: string };

    const result = await expenseConfigurationService.createExpenseConfiguration({
        request,
        user,
        traceId
    });

    if (!result) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: 'Service returned undefined response'
        });
    }

    return reply.status(result.status).send(result.response);
}

export async function updateExpenseConfiguration(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const user = request.user as { sub: string; preferred_username: string };

    const result = await expenseConfigurationService.updateExpenseConfiguration({
        request,
        user,
        traceId
    });

    if (!result) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: 'Service returned undefined response'
        });
    }

    return reply.status(result.status).send(result.response);
}


export async function enableExpenseConfiguration(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const user = request.user as { sub: string; preferred_username: string };

    const result = await expenseConfigurationService.enableExpenseConfiguration({
        request,
        user,
        traceId
    });

    if (!result) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: 'Service returned undefined response'
        });
    }

    return reply.status(result.status).send(result.response);
}

export const getAllExpenseConfigurationHierarchies = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };

    const result = await expenseConfigurationService.getAllExpenseConfigurationHierarchies({
        program_id,
        traceId
    });

    if (!result) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: 'Service returned undefined response'
        });
    }

    return reply.status(result.status).send(result.response);
};

export async function expenseConfigurationAdvancedFilter(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const user = request?.user;

    const result = await expenseConfigurationService.expenseConfigurationAdvancedFilter({
        request,
        user,
        traceId
    });

    if (!result) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: 'Service returned undefined response'
        });
    }

    return reply.status(result.status).send(result.response);
}


export async function getExpenseTypesByProgramIdAndHierarchies(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_ids } = request.query as { hierarchy_ids: string };
    const traceId = generateCustomUUID();

    const result = await expenseConfigurationService.getExpenseTypesByProgramIdAndHierarchies({
        program_id,
        hierarchy_ids,
        traceId
    });

    if (!result) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: 'Service returned undefined response'
        });
    }

    return reply.status(result.status).send(result.response);
}

export async function getExpenseConfigByExpenseType(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();

    const result = await expenseConfigurationService.getExpenseConfigByExpenseType({
        request,
        traceId
    });

    if (!result) {
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: 'Service returned undefined response'
        });
    }

    return reply.status(result.status).send(result.response);
}
