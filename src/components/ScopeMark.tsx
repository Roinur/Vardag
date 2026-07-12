import { UserRound, UsersRound, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../app/I18nContext';
import type { SharingScope } from '../types/models';
import { useAuth } from '../app/AuthContext';
import { Heading, Text } from './Typography';

export function ScopeMark({ scope = 'family', ownerId, assigneeId, assigneeIds, assigneeName, assigneeNames, recordTitle }: {
  scope?: SharingScope;
  ownerId?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  assigneeName?: string;
  assigneeNames?: string[];
  recordTitle: string;
}) {
  const { t } = useI18n();
  const { user, householdMembers } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const isFamily = scope === 'family';
  const recipientIds = assigneeIds?.length ? assigneeIds : assigneeId ? [assigneeId] : [];
  const isWholeFamily = isFamily && recipientIds.length === 0;
  const fallbackNames = assigneeNames?.length ? assigneeNames : assigneeName ? [assigneeName] : [];
  const recipients = recipientIds.map((id, index) => householdMembers.find((member) => member.id === id) ?? {
    id,
    displayName: fallbackNames[index] ?? t('Family member'),
    avatarUrl: undefined,
    role: 'member' as const
  });
  const owner = householdMembers.find((member) => member.id === ownerId);
  const createdByMe = Boolean(user?.id && ownerId === user.id);
  const assignedToMe = Boolean(user?.id && recipientIds.includes(user.id));
  const currentMember = householdMembers.find((member) => member.id === user?.id);
  const relevantPerson = createdByMe && recipients.length
    ? assignedToMe ? currentMember ?? recipients[0] : recipients[0]
    : owner ?? recipients[0];
  const relation = isWholeFamily
    ? t('From {name}', { name: owner?.displayName ?? t('Family member') })
    : createdByMe && recipients.length && !assignedToMe
      ? t('To {name}', { name: recipients.map((member) => member.displayName).join(', ') })
      : !createdByMe && owner
        ? t('From {name}', { name: owner.displayName })
        : fallbackNames.join(', ') || relevantPerson?.displayName || t(isFamily ? 'Family' : 'Personal');

  return (
    <>
      <button
        type="button"
        className={`scope-identity-button ${isWholeFamily ? 'is-family' : 'is-personal'}`}
        aria-label={`${relation}: ${recordTitle}`}
        onClick={() => setIsOpen(true)}
      >
        {isWholeFamily ? <UsersRound className="h-4 w-4" /> : relevantPerson?.avatarUrl ? (
          <img src={relevantPerson.avatarUrl} alt="" referrerPolicy="no-referrer" />
        ) : <UserRound className="h-4 w-4" />}
      </button>

      {isOpen ? createPortal(
        <div className="modal-backdrop fixed inset-0 z-[70] grid place-items-center px-5" onClick={() => setIsOpen(false)}>
          <div className="identity-dialog" role="dialog" aria-modal="true" aria-label={recordTitle} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="icon-button absolute right-3 top-3" aria-label={t('Close')} onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </button>
            <Heading level={3} className="pr-10 text-lg leading-snug">{recordTitle}</Heading>
            <div className="mt-4 flex items-center gap-3">
              <div className={`scope-identity-button h-11 w-11 ${isWholeFamily ? 'is-family' : 'is-personal'}`}>
                {isWholeFamily ? <UsersRound className="h-5 w-5" /> : relevantPerson?.avatarUrl ? <img src={relevantPerson.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <UserRound className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <Text className="text-xs">{isWholeFamily ? t('Shared with family') : isFamily ? t('Shared with selected people') : t('Personal')}</Text>
                <Text className="font-semibold text-app-fg">{relation}</Text>
              </div>
            </div>
          </div>
        </div>, document.body
      ) : null}
    </>
  );
}
