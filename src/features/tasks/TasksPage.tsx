import { CheckSquare, Flag, Plus, UsersRound } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useVardagData } from '../../app/VardagDataContext';
import { useI18n } from '../../app/I18nContext';
import { EmptyState } from '../../components/EmptyState';
import { CategoryPicker } from '../../components/CategoryPicker';
import { EntrySheet } from '../../components/EntrySheet';
import { FormField } from '../../components/FormField';
import { GlassCard } from '../../components/GlassCard';
import { PageHeader } from '../../components/PageHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ScopePicker } from '../../components/ScopePicker';
import { StatCard } from '../../components/StatCard';
import { StatsGrid } from '../../components/StatsGrid';
import { TaskItem } from '../../components/TaskItem';
import { Text } from '../../components/Typography';
import type { Priority, RepeatRule, SharingScope } from '../../types/models';
import { todayISO } from '../../lib/utils';
import { useAuth } from '../../app/AuthContext';
import { isRecordVisibleToUser } from '../../lib/recordVisibility';

type TaskTab = 'today' | 'upcoming' | 'completed' | 'week';

export function TasksPage() {
  const { t } = useI18n();
  const { user, householdMembers } = useAuth();
  const { tasks, addTask, toggleTask, deleteTask } = useVardagData();
  const [tab, setTab] = useState<TaskTab>('today');
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(todayISO());
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('Personal');
  const [repeat, setRepeat] = useState<RepeatRule>('none');
  const [scope, setScope] = useState<SharingScope>('family');
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string }>>([]);
  const [scopeFilter, setScopeFilter] = useState<SharingScope>('family');
  const today = todayISO();
  const now = new Date(`${today}T12:00:00`);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = monday.toISOString().slice(0, 10);
  const weekEnd = sunday.toISOString().slice(0, 10);

  const scopedTasks = useMemo(() => tasks.filter((task) => (task.scope ?? 'family') === scopeFilter && isRecordVisibleToUser(task, user?.id)), [scopeFilter, tasks, user?.id]);
  const filteredTasks = useMemo(() => {
    if (tab === 'week') return scopedTasks.filter((task) => task.status === 'todo' && (!task.dueDate || (task.dueDate >= weekStart && task.dueDate <= weekEnd)));
    if (tab === 'completed') return scopedTasks.filter((task) => task.status === 'done');
    if (tab === 'upcoming') return scopedTasks.filter((task) => task.status === 'todo' && task.dueDate !== today);
    return scopedTasks.filter((task) => task.status === 'todo' && (!task.dueDate || task.dueDate === today));
  }, [scopedTasks, tab, today, weekEnd, weekStart]);
  const sectionTitle = tab === 'completed' ? t('Completed Tasks') : tab === 'upcoming' ? t('Upcoming Tasks') : t(filteredTasks.length === 1 ? "Today's Task" : "Today's Tasks");
  const filteredCountLabel = tab === 'completed' ? t('Completed') : tab === 'upcoming' ? t('upcoming') : t('Due today');

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    await addTask({
      title: title.trim(),
      dueDate,
      priority,
      category: category.trim() || undefined,
      repeat,
      scope,
      assigneeId: assignees[0]?.id,
      assigneeName: assignees[0]?.name,
      assigneeIds: assignees.map((member) => member.id),
      assigneeNames: assignees.map((member) => member.name)
    });
    setTitle('');
    setDueDate(todayISO());
    setPriority('medium');
    setCategory('Personal');
    setRepeat('none');
    setScope('family');
    setAssignees([]);
    setIsAdding(false);
  };

  return (
    <>
      <PageHeader title={t('Tasks')} />
      <ScopePicker value={scopeFilter} onChange={setScopeFilter} className="mb-4" showLabel={false} />
      <SegmentedControl<TaskTab>
        value={tab}
        options={['today', 'upcoming', 'completed', 'week']}
        labels={{ today: t('today'), upcoming: t('upcoming'), completed: t('completed'), week: t('Week') }}
        onChange={setTab}
        ariaLabel={t('Task view')}
      />

      {tab !== 'week' ? <StatsGrid>
        <StatCard icon={CheckSquare} value={filteredTasks.length} label={filteredCountLabel} tone="blue" compact />
        <StatCard icon={Flag} value={filteredTasks.filter((task) => task.priority === 'high').length} label={t('High priority')} tone="purple" compact />
      </StatsGrid> : null}

      {tab === 'week' ? (
        <section className="mb-5">
          <SectionHeader title={t('Who does what')} icon={<UsersRound className="h-5 w-5 text-app-purple" />} />
          <div className="family-week" aria-label={t('Assigned tasks this week')}>
            {householdMembers.map((member) => {
              const memberTasks = filteredTasks.filter((task) => task.assigneeId === member.id || task.assigneeIds?.includes(member.id));
              return <div className="family-week__column" key={member.id}>
                <div className="family-week__person">
                  {member.avatarUrl ? <img src={member.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span>{member.displayName.slice(0, 1).toUpperCase()}</span>}
                  <div className="min-w-0"><Text className="truncate font-semibold text-app-fg">{member.displayName}</Text><Text className="text-xs">{memberTasks.length} {t(memberTasks.length === 1 ? 'task' : 'tasks')}</Text></div>
                </div>
                <div className="family-week__tasks">
                  {memberTasks.map((task) => <button type="button" className="family-week__task" key={task.id} onClick={() => void toggleTask(task)}><CheckSquare className="h-4 w-4 shrink-0 text-app-active" /><span><strong>{task.title}</strong><small>{task.dueDate ? new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' }).format(new Date(`${task.dueDate}T12:00:00`)) : t('This week')}</small></span></button>)}
                  {!memberTasks.length ? <Text className="family-week__empty">{t('Nothing assigned')}</Text> : null}
                </div>
              </div>;
            })}
          </div>
        </section>
      ) : <GlassCard className="mb-5">
        <SectionHeader
          title={sectionTitle}
          icon={<CheckSquare className="h-6 w-6 text-app-active" />}
          action={t('Add task')}
          onAction={() => { setScope(scopeFilter); setAssignees([]); setIsAdding(true); }}
        />
        {filteredTasks.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
        ))}
        {filteredTasks.length === 0 ? (
          <EmptyState icon={CheckSquare} title={t('No tasks here')} body={t('Add one directly or use Detect Cards on Today.')} />
        ) : null}
      </GlassCard>}

      <EntrySheet
        isOpen={isAdding}
        title={t('New task')}
        description={t('Add it directly with the details that matter.')}
        icon={CheckSquare}
        onClose={() => setIsAdding(false)}
      >
        <form onSubmit={handleAdd} className="entry-sheet-form">
          <ScopePicker value={scope} onChange={setScope} allowAssignee assigneeIds={assignees.map((member) => member.id)} onAssigneesChange={setAssignees} />
          <FormField label={t('Task')}>
            <input className="form-control" placeholder={t('What needs doing?')} value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label={t('Due date')}>
              <input className="form-control" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
            </FormField>
            <FormField label={t('Priority')}>
              <select className="form-control" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                <option value="low">{t('Low')}</option>
                <option value="medium">{t('Medium')}</option>
                <option value="high">{t('High')}</option>
              </select>
            </FormField>
          </div>
          <FormField label={t('Repeat?')}>
            <select className="form-control" value={repeat} onChange={(event) => setRepeat(event.target.value as RepeatRule)}>
              {(['none', 'daily', 'weekly', 'biweekly', 'monthly'] as RepeatRule[]).map((value) => <option key={value} value={value}>{t(`Repeat ${value}`)}</option>)}
            </select>
          </FormField>
          <FormField label={t('Category')}>
            <CategoryPicker value={category} onChange={setCategory} />
          </FormField>
          <div className="entry-sheet-actions">
            <button type="button" className="secondary-button" onClick={() => setIsAdding(false)}>{t('Cancel')}</button>
            <button className="primary-button" type="submit">
              <Plus className="h-4 w-4" />
              {t('Add task')}
            </button>
          </div>
        </form>
      </EntrySheet>
    </>
  );
}
