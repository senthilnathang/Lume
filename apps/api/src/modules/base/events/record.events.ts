export class RecordCreatedEvent {
  durable?: boolean;
  eventKey?: string;
  constructor(
    public readonly entityId: number,
    public readonly record: any,
    public readonly userId: number,
  ) {}
}

export class RecordUpdatedEvent {
  durable?: boolean;
  eventKey?: string;
  constructor(
    public readonly entityId: number,
    public readonly record: any,
    public readonly previousData: any,
    public readonly userId: number,
  ) {}
}

export class RecordDeletedEvent {
  durable?: boolean;
  eventKey?: string;
  constructor(
    public readonly entityId: number,
    public readonly recordId: number,
    public readonly userId: number,
    public readonly companyId?: number,
  ) {}
}
