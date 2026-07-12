import { Check, UserRound, UsersRound } from 'lucide-react';
import { useAuth } from '../app/AuthContext';
import { useI18n } from '../app/I18nContext';
import type { SharingScope } from '../types/models';
import { SlidingControl } from './SlidingControl';
import { Text } from './Typography';

interface ScopePickerProps {
  value: SharingScope;
  onChange: (scope: SharingScope) => void;
  className?: string;
  compact?: boolean;
  allowAssignee?: boolean;
  assigneeIds?: string[];
  onAssigneesChange?: (members: Array<{ id: string; name: string }>) => void;
  showLabel?: boolean;
}

export function ScopePicker({
  value,
  onChange,
  className = '',
  compact = false,
  allowAssignee = false,
  assigneeIds = [],
  onAssigneesChange,
  showLabel = true
}: ScopePickerProps) {
  const { household, householdMembers, refreshHouseholdMembers } = useAuth();
  const { t } = useI18n();
  const familyLabel = household?.name && household.name !== 'My family' ? household.name : t('Family');

  return (
    <div className={className}>
      {showLabel ? <Text className="mb-1.5 text-xs font-semibold text-app-fg">{t('Sharing')}</Text> : null}
      <SlidingControl
        value={value}
        options={[
          { value: 'family', label: familyLabel, icon: UsersRound, activeClassName: 'text-app-purple' },
          { value: 'personal', label: t('Personal'), icon: UserRound, activeClassName: 'text-app-active' }
        ]}
        onChange={(scope) => {
          onChange(scope);
          if (scope === 'personal') onAssigneesChange?.([]);
          if (scope === 'family' && allowAssignee) void refreshHouseholdMembers();
        }}
        ariaLabel={t('Sharing')}
        compact={compact}
      />
      {allowAssignee && value === 'family' ? (
        <div className="assignee-picker" aria-label={t('Choose recipient')}>
          {householdMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              className={`assignee-chip ${assigneeIds.includes(member.id) ? 'is-active' : ''}`}
              onClick={() => {
                const selected = householdMembers
                  .filter((candidate) => candidate.id === member.id ? !assigneeIds.includes(member.id) : assigneeIds.includes(candidate.id))
                  .map((candidate) => ({ id: candidate.id, name: candidate.displayName }));
                onAssigneesChange?.(selected);
              }}
            >
              {member.avatarUrl ? <img className="assignee-avatar" src={member.avatarUrl} alt="" /> : <span className="assignee-avatar">{member.displayName.slice(0, 1).toUpperCase()}</span>}
              <span className="truncate">{member.displayName}</span>
              {assigneeIds.includes(member.id) ? <Check className="h-3.5 w-3.5" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FamilyMemberPicker({
  selectedIds,
  onChange,
  label
}: {
  selectedIds: string[];
  onChange: (members: Array<{ id: string; name: string }>) => void;
  label?: string;
}) {
  const { householdMembers, refreshHouseholdMembers } = useAuth();
  const { t } = useI18n();

  return (
    <div>
      <Text className="mb-1.5 text-xs font-semibold text-app-fg">{label ?? t('Who can vote?')}</Text>
      <div className="assignee-picker" aria-label={label ?? t('Who can vote?')} onPointerDown={() => void refreshHouseholdMembers()}>
        {householdMembers.map((member) => (
          <button
            key={member.id}
            type="button"
            className={`assignee-chip ${selectedIds.includes(member.id) ? 'is-active' : ''}`}
            onClick={() => {
              const selected = householdMembers
                .filter((candidate) => candidate.id === member.id ? !selectedIds.includes(member.id) : selectedIds.includes(candidate.id))
                .map((candidate) => ({ id: candidate.id, name: candidate.displayName }));
              onChange(selected);
            }}
          >
            {member.avatarUrl ? <img className="assignee-avatar" src={member.avatarUrl} alt="" /> : <span className="assignee-avatar">{member.displayName.slice(0, 1).toUpperCase()}</span>}
            <span className="truncate">{member.displayName}</span>
            {selectedIds.includes(member.id) ? <Check className="h-3.5 w-3.5" /> : null}
          </button>
        ))}
      </div>
      <Text className="mt-1.5 text-xs">{selectedIds.length ? t('Only selected people can vote.') : t('No selection means the whole family.')}</Text>
    </div>
  );
}
