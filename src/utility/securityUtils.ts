import { FastifyRequest } from 'fastify';
export const unProtectedRoutes: { url: string; method: string; queryParams?: Record<string, string> }[] = [
    { url: '/config/health-check', method: 'GET' },
    { url: '/config/v1/api/countries/get-all', method: 'GET' },
    { url: '/config/docs/*', method: 'GET' }
];
export const handleRouteSecurity = (request: FastifyRequest): boolean => {
    const query = (request.query as Record<string, string>) || {};
    const currentPath = request.routeOptions?.url ?? request.url ?? (request.raw.url as string);
    const isMatched = unProtectedRoutes.some((route) => {
        const isUrlMatch =
            route.url === request.routeOptions?.url ||
            (route.url.endsWith('/*') && currentPath.startsWith(route.url.replace('/*', '')));
        const isMethodMatch = route.method === request.method;
        if (isUrlMatch && isMethodMatch) {
            const isQueryParamsMatch =
                !route.queryParams || JSON.stringify(route.queryParams) === JSON.stringify(query);
            return isQueryParamsMatch;
        }
        return false;
    });
    return isMatched;
};