import { TriggerDef } from '@mikro-orm/core';

export function updatedAtTrigger(tableName: string): TriggerDef {
  const name = `${tableName}_touch_updated_at`;

  return {
    name,
    timing: 'before',
    events: ['update'],
    forEach: 'row',
    expression: `create trigger ${name} before update on ${tableName} for each row execute function app.touch_updated_at()`,
  };
}
