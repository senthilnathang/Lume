import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_FLAG_KEY } from '@core/decorators/feature-flag.decorator';
import { FeaturesDataService } from '@modules/base_features_data/services/features-data.service';
import { FeatureFlagContext } from '@modules/base_features_data/services/feature-flag-evaluator.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featuresDataService: FeaturesDataService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    const flagKey = this.reflector.get<string>(FEATURE_FLAG_KEY, handler);

    if (!flagKey) {
      return true;
    }

    const user = request.user;
    const ipAddress = request.ip || request.connection?.remoteAddress;

    const flagContext: FeatureFlagContext = {
      userId: user?.id,
      roleId: user?.role?.id,
      companyId: user?.companyId,
      ipAddress,
      currentDate: new Date(),
    };

    const isEnabled = await this.featuresDataService.isEnabledForContext(flagKey, flagContext);

    if (!isEnabled) {
      throw new ForbiddenException(`Feature flag '${flagKey}' is not enabled for this user`);
    }

    return true;
  }
}
