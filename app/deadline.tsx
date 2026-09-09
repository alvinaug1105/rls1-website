'use client';
import { useState } from 'react';
import { Copy, Download, Clock } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
export function deadlineTimestamp(date: string, time: string, zone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw Error('Choose both a date and time.');
  const [y, m, d] = date.split('-').map(Number),
    [h, n] = time.split(':').map(Number);
  if (h > 23 || n > 59) throw Error('Enter a valid time.');
  const local = zone === 'local';
  const stamp = local
    ? new Date(y, m - 1, d, h, n)
    : new Date(Date.UTC(y, m - 1, d, h, n));
  const fields = local
    ? [
        stamp.getFullYear(),
        stamp.getMonth() + 1,
        stamp.getDate(),
        stamp.getHours(),
        stamp.getMinutes(),
      ]
    : [
        stamp.getUTCFullYear(),
        stamp.getUTCMonth() + 1,
        stamp.getUTCDate(),
        stamp.getUTCHours(),
        stamp.getUTCMinutes(),
      ];
  if (fields.join() != [y, m, d, h, n].join())
    throw Error('This date or time does not exist in the selected timezone.');
  return Math.floor(stamp.getTime() / 1000) - (zone === 'hongkong' ? 28800 : 0);
}
export function Deadline() {
  const [date, setDate] = useState(''),
    [time, setTime] = useState('12:00'),
    [zone, setZone] = useState('hongkong'),
    [status, setStatus] = useState('');
  let stamp: number | undefined,
    error = '';
  if (date)
    try {
      stamp = deadlineTimestamp(date, time, zone);
    } catch (e) {
      error = (e as Error).message;
    }
  const code = stamp ? `<t:${stamp}:F> (<t:${stamp}:R>)` : '';
  const format = (z?: string) =>
    stamp
      ? new Intl.DateTimeFormat('en-GB', {
          dateStyle: 'full',
          timeStyle: 'short',
          ...(z ? { timeZone: z } : {}),
        }).format(new Date(stamp * 1000))
      : '';
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus(
        'Copied. Paste into Discord to show each driver their local time.',
      );
    } catch {
      setStatus(
        'Automatic copying is unavailable. Select the timestamp below and copy it manually.',
      );
    }
  }
  function calendar() {
    if (!stamp) return;
    const utc = (s: number) =>
      new Date(s * 1000)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
    const text = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//RLS1//Deadline//EN\r\nBEGIN:VEVENT\r\nUID:deadline-${stamp}@rls1\r\nDTSTAMP:${utc(Math.floor(Date.now() / 1000))}\r\nDTSTART:${utc(stamp)}\r\nSUMMARY:RLS1 submission deadline\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/calendar' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rls1-deadline.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <p className="muted">
        Enter the deadline in Hong Kong time or choose another timezone. The
        preview confirms exactly what drivers will see.
      </p>
      <div className="deadlinefields">
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setStatus('');
            }}
          />
        </label>
        <label>
          Time
          <input
            type="time"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              setStatus('');
            }}
          />
        </label>
        <div>
          <p className="fieldlabel">Timezone</p>
          <Select
            value={zone}
            onValueChange={(v) => {
              setZone(String(v));
              setStatus('');
            }}
          >
            <SelectTrigger aria-label="Deadline timezone">
              <SelectValue>
                {zone === 'hongkong'
                  ? 'Hong Kong (UTC+8)'
                  : zone === 'utc'
                    ? 'UTC'
                    : 'My device timezone'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hongkong">Hong Kong (UTC+8)</SelectItem>
              <SelectItem value="local">My device timezone</SelectItem>
              <SelectItem value="utc">UTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {stamp && (
        <div className="deadlinepreview">
          <Clock />
          <p>
            <strong>Hong Kong</strong>
            <br />
            {format('Asia/Hong_Kong')}
          </p>
          <p>
            <strong>Your local time</strong>
            <br />
            {format()}
          </p>
          <label>
            Discord timestamp
            <textarea
              readOnly
              value={code}
              rows={2}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <div className="formactions">
            <button className="primary" onClick={copy}>
              <Copy size={16} />
              Copy for Discord
            </button>
            <button className="outline" onClick={calendar}>
              <Download size={16} />
              Save calendar reminder
            </button>
          </div>
          <p className="footnote">
            The time is displayed here; Discord renders the timestamp after you
            paste it there. Calendar notifications depend on your calendar app
            settings.
          </p>
        </div>
      )}
      <p aria-live="polite">{status}</p>
    </>
  );
}
