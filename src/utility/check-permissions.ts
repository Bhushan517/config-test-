import { elastiCacheConnectionManager, initializeElastiCacheConnections } from './permissions-util';
import logger from '../plugins/logger-plugin';

interface RequiredPermissions {
  token: any;
  programId: string;
  requiredPermissions: { permissions: string[] };
  action: string;
}

function validateInputs(token: string, programId: string): void {
  if (!programId) {
    throw new Error('Missing program-id parameter');
  }
  if (!token?.startsWith('Bearer ')) {
    throw new Error("Unauthorized: Token not found or invalid");
  }
}

export async function checkPermission(params: RequiredPermissions): Promise<void> {
  try {
    const { token, programId, requiredPermissions, action } = params;
    validateInputs(token, programId);
    const tokenValue = token.split(' ')[1];

    await initializeElastiCacheConnections();

    // Your application logic
    const policies = await elastiCacheConnectionManager.getPolicies(
      programId,
      tokenValue
    );
    console.log('policies are now::::::::::', JSON.stringify(policies));

    logger.info(`✅ Fetched ${policies.length} policies for programId: ${programId}`);

    if (!Array.isArray(policies)) {
      throw new Error('Invalid policies returned');
    }

    const permissionArray = Array.isArray(requiredPermissions.permissions) ? requiredPermissions.permissions : [requiredPermissions.permissions];

    for (const permission of permissionArray) {
      validatePermissions(policies, [permission], action);
    }
  } catch (error: any) {
    logger.error(error.stack);
    throw new Error(`Unauthorized: You do not have permission to access this resource`);
  }
}

function matchesResource(resource: string, permissionResource: string): boolean {
  if (!resource || !permissionResource) return false;

  if (permissionResource === "*" || permissionResource === "srn:*") {
    return true;
  }

  const resourceParts = resource.split(':');
  const permissionParts = permissionResource.split(':');

  for (let i = 0; i < permissionParts.length; i++) {
    if (permissionParts[i] === '*') return true;
    if (permissionParts[i] !== resourceParts[i]) return false;
  }

  return permissionParts.length <= resourceParts.length;
}

function validatePermissions(policies: any[], requiredPermissions: string[], action?: string): void {
  let hasValidPermission = false;

  for (const requiredPermission of requiredPermissions) {
    const matchingPolicies = policies.filter(policy =>
      matchesResource(requiredPermission, policy.permissions.srn)
    );

    if (matchingPolicies.length === 0) {
      logger.info(`No matching policies for permission: ${requiredPermission}`);
      continue;
    }

    const allowed = matchingPolicies.some(policy =>
      policy.permissions.policy === "ALLOW" &&
      (policy.permissions.actions.includes("*") || policy.permissions.actions.includes(action))
    );

    const denied = matchingPolicies.some(policy =>
      policy.permissions.policy === "DENY" &&
      (policy.permissions.actions.includes("*") || policy.permissions.actions.includes(action))
    );

    if (denied) {
      throw new Error(`Unauthorized: Action explicitly denied for ${requiredPermission}`);
    }

    if (allowed) {
      hasValidPermission = true;
    }
  }

  if (!hasValidPermission) {
    throw new Error('Unauthorized: No valid permissions found.');
  }
}
