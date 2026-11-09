export const USER_TOPICS = {
  /** Kafka — a user registered. */
  REGISTERED: 'user.registered',
  /** NATS — login notification. */
  LOGIN: 'user.login',
} as const;

export interface IUserRegisteredEvent {
  id: string;
  email: string;
}

export interface IUserLoginMessage {
  email: string;
}
