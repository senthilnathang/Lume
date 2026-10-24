import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'featureFlagKey';

export const FeatureFlag = (flagKey: string) => SetMetadata(FEATURE_FLAG_KEY, flagKey);
