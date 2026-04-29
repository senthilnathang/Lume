import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@core/decorators/public.decorator';
import { PolicyEvaluatorService } from './policy-evaluator.service';

export const POLICY_KEY = 'policy';

export function Policy(...policies: string[]) {
  return SetMetadata(POLICY_KEY, policies);
}

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private policyEvaluator: PolicyEvaluatorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.get<boolean>(
      IS_PUBLIC_KEY,
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No user and not public = deny by default
    if (!user) {
      throw new ForbiddenException(
        'Access denied: authentication required',
      );
    }

    // Check if specific policies are required
    const requiredPolicies = this.reflector.get<string[]>(
      POLICY_KEY,
      context.getHandler(),
    );

    if (!requiredPolicies || requiredPolicies.length === 0) {
      // If no specific policy is required, deny by default (deny-all)
      throw new ForbiddenException(
        'Access denied: no policy defined for this endpoint',
      );
    }

    // Evaluate policies
    const requestContext = {
      userId: user.id,
      roleId: user.roleId,
      userRoles: user.roles || [],
      metadata: { endpoint: request.path, method: request.method },
    };

    // At least one policy must allow the action
    for (const policyName of requiredPolicies) {
      // For now, we check if user has the policy name as a permission
      // In full implementation, we'd look up the policy from registry
      if (user.permissions && user.permissions.includes(policyName)) {
        return true;
      }
    }

    throw new ForbiddenException(
      `Access denied: required permissions not granted`,
    );
  }
}
