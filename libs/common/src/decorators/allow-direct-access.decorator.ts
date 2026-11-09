import { SetMetadata } from '@nestjs/common';

export const ALLOW_DIRECT_ACCESS_KEY = 'allowDirectAccess';

/**
 * Lets a route be called without the gateway's internal secret
 * (e.g. health checks from Docker/orchestrator). Use sparingly.
 */
export const AllowDirectAccess = () =>
  SetMetadata(ALLOW_DIRECT_ACCESS_KEY, true);
