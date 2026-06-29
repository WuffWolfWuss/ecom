// Request bị business logic reject
export class BusinessRpcException extends Error {
  constructor(
    public readonly reason: string,
    public readonly details?: any,
  ) {
    super(reason);
  }
}

// Request — timeout, connection drop
export class AmbiguousRpcException extends Error {
  constructor(
    message: string,
    public readonly topic: string,
  ) {
    super(message);
  }
}
