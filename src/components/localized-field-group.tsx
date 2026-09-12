import React from 'react';
import type { LocalizedText } from '../content/models';

type LocalizedFieldGroupProps = {
  id: string;
  label: string;
  value: LocalizedText;
  errors?: Record<string, string[]>;
  onChange: (locale: 'fr' | 'en' | 'ar', value: string) => void;
  required?: boolean;
  fieldPrefix?: string;
};

const fields = [
  { locale: 'fr' as const, label: 'FR', direction: 'ltr' as const },
  { locale: 'en' as const, label: 'EN', direction: 'ltr' as const },
  { locale: 'ar' as const, label: 'AR', direction: 'rtl' as const },
];

export function LocalizedFieldGroup({ id, label, value, errors = {}, onChange, required = false, fieldPrefix = '' }: LocalizedFieldGroupProps) {
  return (
    <fieldset className="admin-localized-group">
      <legend>{label}</legend>
      <div className="admin-localized-fields">
        {fields.map((field) => {
          const fieldId = `${fieldPrefix}${id}-${field.locale}`;
          const fieldErrors = errors[`${id}.${field.locale}`] ?? [];
          return (
            <div className="admin-field" key={field.locale}>
              <label htmlFor={fieldId}>{field.label}{required ? ' *' : ''}</label>
              <textarea
                id={fieldId}
                dir={field.direction}
                value={value[field.locale] ?? ''}
                required={required}
                onChange={(event) => onChange(field.locale, event.target.value)}
                aria-invalid={fieldErrors.length > 0}
                aria-describedby={fieldErrors.length > 0 ? `${fieldId}-error` : undefined}
                rows={2}
              />
              {fieldErrors.length > 0 ? <p className="admin-field-error" id={`${fieldId}-error`}>{fieldErrors.join(' ')}</p> : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}