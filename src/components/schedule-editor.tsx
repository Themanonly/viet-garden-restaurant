import React from 'react';
import type { MenuAvailability, MenuWeekday } from '../content/menu';

type ScheduleEditorProps = {
  schedule: MenuAvailability['schedule'];
  errors: Record<string, string[]>;
  onChange: (schedule: MenuAvailability['schedule']) => void;
};

const weekdays: Array<{ key: MenuWeekday; label: string }> = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export function ScheduleEditor({ schedule, errors, onChange }: ScheduleEditorProps) {
  const updateDay = (weekday: MenuWeekday, periods: MenuAvailability['schedule'][MenuWeekday]) => onChange({ ...schedule, [weekday]: periods });

  return (
    <section className="admin-section" aria-labelledby="schedule-title">
      <div className="admin-section-heading"><div><p className="admin-eyebrow">Weekly availability</p><h2 id="schedule-title">Schedule</h2></div></div>
      <div className="admin-schedule-list">
        {weekdays.map(({ key, label }) => {
          const periods = schedule[key];
          return (
            <div className="admin-schedule-day" key={key}>
              <div className="admin-day-heading"><h3>{label}</h3>{periods.length === 0 ? <span className="admin-empty-note">No periods</span> : null}</div>
              <div className="admin-period-list">
                {periods.map((period, index) => {
                  const basePath = `schedule.${key}[${index}]`;
                  return (
                    <div className="admin-period" key={`${key}-${index}`}>
                      <div className="admin-time-field">
                        <label htmlFor={`${key}-${index}-opens`}>Opens</label>
                        <input id={`${key}-${index}-opens`} type="time" value={period.opensAt} onChange={(event) => updateDay(key, periods.map((item, itemIndex) => itemIndex === index ? { ...item, opensAt: event.target.value } : item))} aria-invalid={Boolean(errors[`${basePath}.opens`]?.length)} />
                        {errors[`${basePath}.opens`]?.map((error) => <p className="admin-field-error" key={error}>{error}</p>)}
                      </div>
                      <div className="admin-time-field">
                        <label htmlFor={`${key}-${index}-closes`}>Closes</label>
                        <input id={`${key}-${index}-closes`} type="time" value={period.closesAt} onChange={(event) => updateDay(key, periods.map((item, itemIndex) => itemIndex === index ? { ...item, closesAt: event.target.value } : item))} aria-invalid={Boolean(errors[`${basePath}.closes`]?.length)} />
                        {errors[`${basePath}.closes`]?.map((error) => <p className="admin-field-error" key={error}>{error}</p>)}
                      </div>
                      <button type="button" className="admin-text-button" onClick={() => updateDay(key, periods.filter((_, itemIndex) => itemIndex !== index))}>Remove period</button>
                    </div>
                  );
                })}
              </div>
              <button type="button" className="admin-secondary-button" onClick={() => updateDay(key, [...periods, { opensAt: '', closesAt: '' }])}>Add period</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export { weekdays };