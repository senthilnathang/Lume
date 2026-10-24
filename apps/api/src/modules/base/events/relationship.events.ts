/** Emitted only after a relationship mutation commits. */
export class RelationshipChangedEvent {
  durable?: boolean;
  eventKey?: string;
  constructor(
    public readonly relationshipId: number,
    public readonly sourceRecordId: number,
    public readonly targetRecordId: number,
    public readonly userId: number,
    public readonly companyId: number,
  ) {}
}
