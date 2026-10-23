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

export const POLICY_ROLES_KEY = 'policy_roles';
export const AUTHENTICATED_KEY = 'policy_authenticated';

export function RequireRoles(...roles: string[]) {
  return SetMetadata(POLICY_ROLES_KEY, roles);
}

export function Authenticated() {
  return SetMetadata(AUTHENTICATED_KEY, true);
}

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private policyEvaluator: PolicyEvaluatorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const user = context.switchToHttp().getRequest().user;
    if (!user?.id) throw new ForbiddenException('Access denied: authentication required');

    const roles = this.reflector.getAllAndOverride<string[]>(POLICY_ROLES_KEY, targets);
    const permissions = this.reflector.getAllAndOverride<string[]>(POLICY_KEY, targets);
    const authenticated = this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_KEY, targets);
    if (!roles?.length && !permissions?.length && !authenticated) {
      throw new ForbiddenException('Access denied: no policy defined for this endpoint');
    }
    if (roles?.length && !roles.includes(user.role_name)) {
      throw new ForbiddenException('Access denied: required role not granted');
    }
    if (permissions?.length && !permissions.some(permission => user.permissions?.includes(permission))) {
      throw new ForbiddenException('Access denied: required permissions not granted');
    }
    return true;
  }
}
