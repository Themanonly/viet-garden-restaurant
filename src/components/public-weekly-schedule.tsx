import React from 'react';
import type { MenuAvailability, MenuWeekday } from '../content/menu';
import { localizedText, type Locale, type LocalizedText } from '../content/models';

export const weekdayLabels: Record<MenuWeekday, LocalizedText> = {
  monday: { fr: 'Lundi', en: 'Monday', ar: 'الإثنين' },
  tuesday: { fr: 'Mardi', en: 'Tuesday', ar: 'الثلاثاء' },
  wednesday: { fr: 'Mercredi', en: 'Wednesday', ar: 'الأربعاء' },
  thursday: { fr: 'Jeudi', en: 'Thursday', ar: 'الخميس' },
  friday: { fr: 'Vendredi', en: 'Friday', ar: 'الجمعة' },
  saturday: { fr: 'Samedi', en: 'Saturday', ar: 'السبت' },
  sunday: { fr: 'Dimanche', en: 'Sunday', ar: 'الأحد' },
};

export const weekdaysOrder: MenuWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const closedText: LocalizedText = {
  fr: 'Fermé',
  en: 'Closed',
  ar: 'مغلق',
};

const scheduleEyebrow: LocalizedText = {
  fr: 'Horaires & Ouverture',
  en: 'Hours & Availability',
  ar: 'أوقات العمل والافتتاح',
};

const scheduleTitle: LocalizedText = {
  fr: 'La semaine chez Viet Garden',
  en: 'Weekly Hours at Viet Garden',
  ar: 'أوقات العمل الأسبوعية في فييت غاردن',
};

export function PublicWeeklySchedule({ availability, locale }: { availability: MenuAvailability; locale: Locale }) {
  const { schedule } = availability;

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <p className="schedule-eyebrow">{localizedText(scheduleEyebrow, locale)}</p>
        <h2 id="schedule-section-title">{localizedText(scheduleTitle, locale)}</h2>
      </div>

      <div className="schedule-grid" role="list">
        {weekdaysOrder.map((day) => {
          const periods = schedule[day] ?? [];
          const isClosed = periods.length === 0;
          const formattedPeriods = isClosed
            ? localizedText(closedText, locale)
            : periods.map((p) => `${p.opensAt} – ${p.closesAt}`).join(', ');

          return (
            <div key={day} className={`schedule-row${isClosed ? ' is-closed' : ''}`} role="listitem">
              <span className="schedule-day">{localizedText(weekdayLabels[day], locale)}</span>
              <span className="schedule-divider" aria-hidden="true" />
              <span className="schedule-hours">{formattedPeriods}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
