import type { SharingScope } from '../types/models';

interface VisibleRecord {
  scope?: SharingScope;
  ownerId?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  eligibleVoterIds?: string[];
}

export const isRecordVisibleToUser = (record: VisibleRecord, userId?: string): boolean => {
  if (!userId) return true;
  if ((record.scope ?? 'family') === 'personal') return !record.ownerId || record.ownerId === userId;

  const recipients = record.assigneeIds?.length
    ? record.assigneeIds
    : record.assigneeId
      ? [record.assigneeId]
      : record.eligibleVoterIds?.length
        ? record.eligibleVoterIds
        : [];

  return record.ownerId === userId || recipients.length === 0 || recipients.includes(userId);
};
