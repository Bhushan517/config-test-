export function getRedisKeyForAuth(token: string, programId: string, otherParam: string | null) {
    let key = `auth:${token}:${programId}`;

    if (otherParam) {
        key += `:${otherParam}`;
    }

    return key;
}
