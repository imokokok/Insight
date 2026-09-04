'use client';

import { useMemo } from 'react';

import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  enum?: (string | number | boolean)[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
  anyOf?: JsonSchemaProperty[];
  oneOf?: JsonSchemaProperty[];
}

export interface ToolInputSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

interface McpToolParamsFormProps {
  schema?: ToolInputSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

export function McpToolParamsForm({ schema, value, onChange }: McpToolParamsFormProps) {
  const properties = schema?.properties ?? {};
  const required = schema?.required ?? [];

  if (Object.keys(properties).length === 0) {
    return (
      <div className="border-l-2 border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        This tool takes no parameters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(properties).map(([name, prop]) => (
        <FormField
          key={name}
          name={name}
          property={prop}
          required={required.includes(name)}
          value={value[name]}
          onChange={(newValue) => onChange({ ...value, [name]: newValue })}
        />
      ))}
    </div>
  );
}

interface FormFieldProps {
  name: string;
  property: JsonSchemaProperty;
  required: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
  depth?: number;
}

function FormField({ name, property, required, value, onChange, depth = 0 }: FormFieldProps) {
  const types = useMemo(() => {
    if (Array.isArray(property.type)) return property.type;
    return property.type ? [property.type] : [];
  }, [property.type]);

  const isEnum = property.enum && property.enum.length > 0;
  const isArray = types.includes('array');
  const isObject = types.includes('object');
  const isBoolean = types.includes('boolean');
  const isNumber = types.includes('number') || types.includes('integer');

  const label = (
    <span className="flex items-center gap-1.5">
      <span className="font-medium text-slate-900">{name}</span>
      {required && <span className="text-red-500">*</span>}
      {!required && <span className="text-xs text-slate-400 font-normal">optional</span>}
    </span>
  );

  const description = property.description ? (
    <p className="text-xs text-slate-500 mt-0.5">{property.description}</p>
  ) : null;

  if (isEnum) {
    return (
      <div className={cn(depth > 0 && 'pl-4 border-l-2 border-slate-100')}>
        {label}
        {description}
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="mt-1.5 w-full border border-slate-900/20 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {!required && <option value="">-- Select --</option>}
          {property.enum?.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (isBoolean) {
    return (
      <div
        className={cn('flex items-start gap-3', depth > 0 && 'pl-4 border-l-2 border-slate-100')}
      >
        <input
          id={`field-${name}`}
          type="checkbox"
          checked={Boolean(value ?? false)}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <label htmlFor={`field-${name}`} className="text-sm">
            {label}
          </label>
          {description}
        </div>
      </div>
    );
  }

  if (isNumber) {
    return (
      <div className={cn(depth > 0 && 'pl-4 border-l-2 border-slate-100')}>
        {label}
        {description}
        <input
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChange(undefined);
              return;
            }
            const num = types.includes('integer') ? parseInt(raw, 10) : parseFloat(raw);
            onChange(Number.isNaN(num) ? raw : num);
          }}
          min={property.minimum}
          max={property.maximum}
          className="mt-1.5 w-full border border-slate-900/20 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
    );
  }

  if (isArray && property.items) {
    const itemsValue = Array.isArray(value) ? value : [];

    // Array of objects: render a simple table builder.
    if (property.items.type === 'object' && property.items.properties) {
      return (
        <div className={cn(depth > 0 && 'pl-4 border-l-2 border-slate-100')}>
          {label}
          {description}
          <ArrayOfObjectsField
            name={name}
            itemSchema={property.items}
            value={itemsValue as Record<string, unknown>[]}
            onChange={onChange}
          />
        </div>
      );
    }

    // Array of primitives: comma-separated input.
    const itemEnum = property.items.enum;
    if (itemEnum && itemEnum.length > 0) {
      return (
        <div className={cn(depth > 0 && 'pl-4 border-l-2 border-slate-100')}>
          {label}
          {description}
          <select
            multiple
            value={(itemsValue as string[]).map(String)}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
              onChange(selected.length > 0 ? selected : undefined);
            }}
            className="mt-1.5 min-h-[120px] w-full border border-slate-900/20 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {itemEnum.map((option) => (
              <option key={String(option)} value={String(option)}>
                {String(option)}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">Hold Cmd/Ctrl to select multiple</p>
        </div>
      );
    }

    return (
      <div className={cn(depth > 0 && 'pl-4 border-l-2 border-slate-100')}>
        {label}
        {description}
        <input
          type="text"
          value={Array.isArray(value) ? value.join(', ') : ''}
          onChange={(e) => {
            const trimmed = e.target.value.trim();
            onChange(trimmed ? trimmed.split(',').map((s) => s.trim()) : undefined);
          }}
          placeholder="Separate multiple values with commas"
          className="mt-1.5 w-full border border-slate-900/20 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
    );
  }

  if (isObject && property.properties) {
    const objectValue =
      typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
    return (
      <div className={cn(depth > 0 && 'pl-4 border-l-2 border-slate-100')}>
        {label}
        {description}
        <div className="mt-2 space-y-4 border-y border-slate-900/15 bg-slate-50 p-4">
          {Object.entries(property.properties ?? {}).map(([childName, childProp]) => (
            <FormField
              key={childName}
              name={childName}
              property={childProp}
              required={(property.required ?? []).includes(childName)}
              value={objectValue[childName]}
              onChange={(newValue) => onChange({ ...objectValue, [childName]: newValue })}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    );
  }

  // Default string / fallback input.
  return (
    <div className={cn(depth > 0 && 'pl-4 border-l-2 border-slate-100')}>
      {label}
      {description}
      <input
        type="text"
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={property.pattern ? `Format: ${property.pattern}` : undefined}
        className="mt-1.5 w-full border border-slate-900/20 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}

interface ArrayOfObjectsFieldProps {
  name: string;
  itemSchema: JsonSchemaProperty;
  value: Record<string, unknown>[];
  onChange: (value: unknown) => void;
}

function ArrayOfObjectsField({ itemSchema, value, onChange }: ArrayOfObjectsFieldProps) {
  const properties = itemSchema.properties ?? {};
  const required = itemSchema.required ?? [];

  const addRow = () => {
    onChange([...value, {}]);
  };

  const removeRow = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : undefined);
  };

  const updateRow = (index: number, fieldName: string, fieldValue: unknown) => {
    const next = value.map((row, i) => (i === index ? { ...row, [fieldName]: fieldValue } : row));
    onChange(next);
  };

  return (
    <div className="mt-2 space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-slate-500">
          No data yet. Click the button below to add an entry.
        </p>
      )}
      {value.map((row, index) => (
        <div key={index} className="border-b border-slate-900/10 bg-slate-50 p-4 last:border-b-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Item #{index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(properties).map(([fieldName, fieldProp]) => (
              <div key={fieldName}>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {fieldName}
                  {required.includes(fieldName) && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {fieldProp.enum ? (
                  <select
                    value={String(row[fieldName] ?? '')}
                    onChange={(e) => updateRow(index, fieldName, e.target.value || undefined)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {!required.includes(fieldName) && <option value="">--</option>}
                    {fieldProp.enum.map((option) => (
                      <option key={String(option)} value={String(option)}>
                        {String(option)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={
                      fieldProp.type === 'number' || fieldProp.type === 'integer'
                        ? 'number'
                        : 'text'
                    }
                    value={row[fieldName] === undefined ? '' : String(row[fieldName])}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        updateRow(index, fieldName, undefined);
                        return;
                      }
                      if (fieldProp.type === 'number' || fieldProp.type === 'integer') {
                        const num =
                          fieldProp.type === 'integer' ? parseInt(raw, 10) : parseFloat(raw);
                        updateRow(index, fieldName, Number.isNaN(num) ? raw : num);
                      } else {
                        updateRow(index, fieldName, raw);
                      }
                    }}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
                {fieldProp.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{fieldProp.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={addRow}
        leftIcon={<Plus className="w-4 h-4" />}
      >
        Add an entry
      </Button>
    </div>
  );
}
