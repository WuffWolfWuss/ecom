export const HEALTH_MODULE_OPTIONS = 'HEALTH_MODULE_OPTIONS';

export interface HealthModuleOptions {
  database?: 'postgres' | 'mongo' | 'none';
  kafka?: boolean;
  nats?: boolean;
}
