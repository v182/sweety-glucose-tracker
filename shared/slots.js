export const SLOTS = Object.freeze([
  { value: 'fasting', label: 'Morning (fasting)', shortLabel: 'Fasting', description: 'Before your first meal', color: '#14857c' },
  { value: 'after_breakfast', label: 'After breakfast', shortLabel: 'Breakfast', description: 'Your morning check-in', color: '#eaa354' },
  { value: 'after_lunch', label: 'After lunch', shortLabel: 'Lunch', description: 'Your afternoon check-in', color: '#8098d8' },
  { value: 'after_dinner', label: 'After dinner', shortLabel: 'Dinner', description: 'Your evening check-in', color: '#ba8bb3' },
]);

export const SLOT_VALUES = SLOTS.map((slot) => slot.value);
export const slotLabel = (value) => SLOTS.find((slot) => slot.value === value)?.label ?? value;
