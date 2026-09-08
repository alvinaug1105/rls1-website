import { canonical, roundNumber } from './season';
export const penaltyTypes = [
  'Time penalty',
  'Grid penalty',
  'Position penalty',
  'Warning',
  'Disqualification',
  'Steward note',
] as const;
export function validateClassification(kind: string, rows: unknown) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 100)
    throw Error('Enter between 1 and 100 drivers.');
  for (const r of rows) {
    if (
      !r ||
      typeof r.driver !== 'string' ||
      !r.driver.trim() ||
      r.driver.length > 100 ||
      typeof r.team !== 'string' ||
      !r.team.trim() ||
      r.team.length > 100
    )
      throw Error('Every row needs a driver and team (up to 100 characters).');
    if (
      r.position !== undefined &&
      (!Number.isInteger(r.position) ||
        r.position < 1 ||
        r.position > rows.length)
    )
      throw Error('Positions must fit the classification.');
    if (kind === 'race' && (!Number.isFinite(r.points) || r.points < 0))
      throw Error('Points must be zero or more.');
    if (
      kind === 'qualifying' &&
      (!Number.isSafeInteger(r.ms) ||
        r.ms <= 0 ||
        !Number.isInteger(r.attempts) ||
        r.attempts < 1 ||
        r.attempts > 3)
    )
      throw Error('Enter a valid lap time and 1–3 attempts.');
    if (
      r.duelMs !== undefined &&
      (!Number.isSafeInteger(r.duelMs) || r.duelMs <= 0)
    )
      throw Error('Enter a valid duel lap.');
  }
  if (
    new Set(rows.map((r) => canonical(r.driver).toLowerCase())).size !==
    rows.length
  )
    throw Error(
      'Each driver can only appear once. Shawn and Atlegang refer to the same driver.',
    );
  if (
    rows.some((r) => r.position !== undefined) &&
    rows.some((r, i) => r.position !== i + 1)
  )
    throw Error('Positions must be unique and match finishing order.');
}
export function validateOfficial(kind: string, title: string, body: string) {
  if (roundNumber(title) < 1 || roundNumber(title) > 24)
    throw Error('Choose Round 1 to Round 24.');
  const value = JSON.parse(body);
  if (kind === 'race' || kind === 'qualifying') {
    validateClassification(kind, value);
    return;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid event information.');
  if (kind === 'event') {
    if (
      typeof value.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
      !Number.isFinite(Date.parse(value.date)) ||
      new Date(value.date).toISOString().slice(0, 10) !== value.date
    )
      throw Error('Choose a valid date.');
    if (value.startAt) {
      if (
        typeof value.startAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.startAt) ||
        !Number.isFinite(Date.parse(value.startAt))
      )
        throw Error('Choose a valid start time.');
      const hkDate = new Date(Date.parse(value.startAt) + 28800000)
        .toISOString()
        .slice(0, 10);
      if (hkDate !== value.date)
        throw Error('The start time must match the event date in Hong Kong.');
    }
    if (!['UPCOMING', 'QUALIFYING', 'LIVE'].includes(value.status))
      throw Error('Choose an event status.');
    if (typeof value.notes !== 'string' || value.notes.length > 2000)
      throw Error('Event notes must be under 2,000 characters.');
  }
  if (kind === 'penalty') {
    for (const field of ['driver', 'reason', 'penalty'])
      if (
        typeof value[field] !== 'string' ||
        !value[field].trim() ||
        value[field].length > 2000
      )
        throw Error('Enter the driver, reason and decision.');
    if (!penaltyTypes.includes(value.type))
      throw Error('Choose a penalty type.');
    if (typeof value.note !== 'string' || value.note.length > 2000)
      throw Error('Keep the steward note under 2,000 characters.');
  }
}
