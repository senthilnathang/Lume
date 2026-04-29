export class RecordCreatedEvent {
  constructor(
    public readonly entityId: number,
    public readonly record: any,
    public readonly userId: number,
  ) {}
}

export class RecordUpdatedEvent {
  constructor(
    public readonly entityId: number,
    public readonly record: any,
    public readonly previousData: any,
    public readonly userId: number,
  ) {}
}

export class RecordDeletedEvent {
  constructor(
    public readonly entityId: number,
    public readonly recordId: number,
    public readonly userId: number,
  ) {}
}
