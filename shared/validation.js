import { isValidDate } from './dates.js';
import { SLOT_VALUES } from './slots.js';

export function readingErrors({ date, slot, value } = {}, today) {
  const fields = {};
  if (!isValidDate(date)) fields.date = 'Please choose a valid date.';
  else if (date > today) fields.date = 'Date cannot be in the future.';
  if (!SLOT_VALUES.includes(slot)) fields.slot = 'Please choose one of the four time slots.';
  if (value === '' || value === null || value === undefined) fields.value = 'Please enter a glucose value.';
  else if (!Number.isInteger(value) || value < 40 || value > 600) fields.value = 'Value must be a whole number between 40 and 600 mg/dl.';
  return fields;
}
