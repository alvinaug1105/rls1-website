import { limitedText, BodyLimitError } from '@/lib/request-body';
import { json, sameOrigin, requestId, logServerError } from '@/lib/http';
import { validateDuel, qualifyingFor } from '@/app/duel';
import type { Entry } from '@/app/league';
import { mergeArchive, roundNumber } from '@/app/season';
import { validateOfficial } from '@/app/validation';
import { getDb } from '@/db';
import { entries } from '@/db/schema';
import { eq, desc, and, gte, count, sql, type SQL } from 'drizzle-orm';
import { admin } from '@/lib/organiser-auth';
const official = ['race', 'qualifying', 'event', 'penalty', 'notice', 'duel'];
const singleton = ['race', 'qualifying', 'event', 'duel'];
// Responses depend on the organiser credential, so caches must key on it.
const reply = (body: unknown, status = 200) =>
  json(body, status, { Vary: 'Cookie, x-league-key' });
export async function GET(req: Request) {
  try {
    const isAdmin =
      new URL(req.url).searchParams.get('admin') === '1' && (await admin(req));
    if (new URL(req.url).searchParams.get('admin') === '1' && !isAdmin)
      return reply({ error: 'Your session has expired. Sign in again.' }, 401);
    const data = await getDb()
      .select({
        id: entries.id,
        kind: entries.kind,
        title: entries.title,
        body: entries.body,
        author: entries.author,
        approved: entries.approved,
        created: entries.created,
      })
      .from(entries)
      .where(isAdmin ? undefined : eq(entries.approved, 1))
      .orderBy(desc(entries.created));
    return reply({ data, isAdmin });
  } catch (e) {
    logServerError('entries GET', requestId(req), e);
    return reply(
      { error: 'The league archive is unavailable. Please try again shortly.' },
      503,
    );
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return reply({ error: 'Invalid origin.' }, 403);
  const isAdmin =
    new URL(req.url).searchParams.get('public') !== '1' && (await admin(req));
  let data;
  try {
    const raw = await limitedText(req, 50000);
    data = JSON.parse(raw);
  } catch (e) {
    return reply({ error: e instanceof BodyLimitError ? 'Post is too long.' : 'Invalid submission.' }, e instanceof BodyLimitError ? 413 : 400);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return reply({ error: 'Invalid submission.' }, 400);
  const { kind, title, body } = data;
  if (![...official, 'video', 'story'].includes(kind))
    return reply({ error: 'Invalid post type.' }, 400);
  if (!isAdmin && official.includes(kind))
    return reply({ error: 'Race control access required.' }, 403);
  try {
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      title.length > 150 ||
      typeof body !== 'string' ||
      body.length > 40000
    )
      throw Error('Check the title and content.');
    if (['race', 'qualifying', 'event', 'penalty'].includes(kind))
      validateOfficial(kind, title, body);
    if (kind === 'notice' && !body.trim())
      throw Error('Write an announcement before publishing.');
    if (kind === 'story' && body.trim().length < 10)
      throw Error('Write at least 10 characters for your story.');
    if (kind === 'video') {
      const v = JSON.parse(body);
      if (
        !v ||
        typeof v.url !== 'string' ||
        new URL(v.url).protocol !== 'https:' ||
        typeof v.notes !== 'string'
      )
        throw Error('Use an HTTPS video link and valid notes.');
    }
  } catch (e) {
    return reply(
      {
        error:
          e instanceof SyntaxError
            ? 'Invalid content format.'
            : (e as Error).message,
      },
      400,
    );
  }
  // A Duel is only valid against the exact qualifying classification it was
  // seeded from. The write below repeats that check inside the same SQL
  // statement, so a qualifying change between validation and write cannot
  // produce a published Duel with stale seeds.
  let duelGuard: SQL | undefined;
  if (kind === 'duel') {
    try {
      const round = roundNumber(title);
      if (!/^Season 1 — Round ([1-9]|1[0-9]|2[0-4]): .+$/.test(title))
        return reply({ error: 'Invalid Duel round title.' }, 400);
      const current = mergeArchive(
        await getDb().select().from(entries).where(eq(entries.approved, 1)),
      ) as Entry[];
      validateDuel(JSON.parse(body), current, round);
      const seeded = qualifyingFor(current, round)!;
      duelGuard = seeded.id.startsWith('archive-')
        ? sql`NOT EXISTS (SELECT 1 FROM entries WHERE kind = 'qualifying' AND id = ${`result-qualifying-${round}`})`
        : sql`EXISTS (SELECT 1 FROM entries WHERE id = ${seeded.id} AND body = ${seeded.body} AND approved = 1)`;
    } catch {
      return reply({ error: 'Unable to validate Duel. Check the published qualifying and bracket, then retry.' }, 400);
    }
  }
  let guestName = '',
    guestId = '';
  if (!isAdmin) {
    guestName = typeof data.author === 'string' ? data.author.trim() : '';
    if (data.website || guestName.length < 2 || guestName.length > 50)
      return reply(
        { error: 'Enter a display name between 2 and 50 characters.' },
        400,
      );
    const bytes = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(
        (req.headers.get('cf-connecting-ip') || 'local') +
          new Date().toISOString().slice(0, 10),
      ),
    );
    guestId =
      'guest-' +
      Array.from(new Uint8Array(bytes))
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
  }
  try {
    if (!isAdmin) {
      const recent = await getDb()
        .select({ total: count() })
        .from(entries)
        .where(
          and(
            eq(entries.userId, guestId),
            gte(entries.created, new Date(Date.now() - 3600000).toISOString()),
          ),
        );
      if (recent[0].total >= 5)
        return reply(
          {
            error:
              'You have submitted five posts recently. Please try again in an hour.',
          },
          429,
        );
    }
    if (singleton.includes(kind)) {
      const all = await getDb()
        .select()
        .from(entries)
        .where(eq(entries.kind, kind));
      const match = all.find(
        (e) => roundNumber(e.title) === roundNumber(title),
      );
      if (data.replace) {
        if (
          (match?.id ?? null) !== data.expectedId ||
          (match?.body ?? null) !== data.expectedBody
        )
          return reply(
            {
              error:
                'This entry changed since you opened it. Reload and review the latest version before saving.',
            },
            409,
          );
        if (match) {
          const updated = duelGuard
            ? await getDb().run(
                sql`UPDATE entries SET title = ${title.trim()}, body = ${body} WHERE id = ${match.id} AND body = ${data.expectedBody} AND ${duelGuard}`,
              )
            : await getDb()
                .update(entries)
                .set({ title: title.trim(), body })
                .where(
                  and(
                    eq(entries.id, match.id),
                    eq(entries.body, data.expectedBody),
                  ),
                );
          return updated.meta.changes
            ? reply({ ok: true })
            : reply(
                {
                  error:
                    'This entry changed while saving. Reload and review it.',
                },
                409,
              );
        }
      } else if (match)
        return reply(
          {
            error:
              'This round already has an entry. Open it in the publishing desk to edit.',
          },
          409,
        );
    }
    const record = {
      id: singleton.includes(kind)
        ? `result-${kind}-${roundNumber(title)}`
        : crypto.randomUUID(),
      kind,
      title: title.trim(),
      body,
      author: isAdmin ? 'Race Control' : `Guest · ${guestName}`,
      userId: isAdmin ? 'race-control' : guestId,
      approved: isAdmin ? 1 : 0,
      created: new Date().toISOString(),
    };
    // Singleton ids are deterministic, so a concurrent first publication is
    // reported as a conflict instead of a server error or a duplicate.
    const inserted = duelGuard
      ? await getDb().run(
          sql`INSERT INTO entries (id, kind, title, body, author, user_id, approved, created) SELECT ${record.id}, ${record.kind}, ${record.title}, ${record.body}, ${record.author}, ${record.userId}, ${record.approved}, ${record.created} WHERE ${duelGuard} ON CONFLICT (id) DO NOTHING`,
        )
      : await getDb().insert(entries).values(record).onConflictDoNothing();
    return inserted.meta.changes
      ? reply({ ok: true })
      : reply(
          {
            error:
              'This round changed while saving. Reload and review the latest version.',
          },
          409,
        );
  } catch (e) {
    const ref = requestId(req);
    logServerError('entries POST', ref, e);
    return reply(
      {
        error:
          'Unable to save. Refresh and check whether your entry was published before retrying.',
      },
      503,
    );
  }
}
export async function PATCH(req: Request) {
  if (!sameOrigin(req) || !(await admin(req)))
    return reply({ error: 'Race control access required.' }, 403);
  let data: { id?: unknown; action?: unknown } | null;
  try {
    data = (JSON.parse(await limitedText(req, 4096))) as typeof data;
  } catch (e) {
    return reply({ error: 'Invalid request.' }, e instanceof BodyLimitError ? 413 : 400);
  }
  if (
    !data ||
    typeof data.id !== 'string' ||
    !data.id.trim() ||
    typeof data.action !== 'string' ||
    !['approve', 'reject', 'delete'].includes(data.action)
  )
    return reply({ error: 'Choose a valid post and action.' }, 400);
  try {
    if (data.action === 'reject') {
      const post = await getDb()
        .select({ kind: entries.kind })
        .from(entries)
        .where(eq(entries.id, data.id))
        .get();
      if (!post || !['story', 'video'].includes(post.kind))
        return reply(
          { error: 'Only guest stories and videos can be rejected.' },
          400,
        );
    }
    const result =
      data.action !== 'delete'
        ? await getDb()
            .update(entries)
            .set({ approved: data.action === 'approve' ? 1 : -1 })
            .where(eq(entries.id, data.id))
        : await getDb().delete(entries).where(eq(entries.id, data.id));
    return result.meta.changes
      ? reply({ ok: true })
      : reply(
          { error: 'This post no longer exists. Refresh the publishing desk.' },
          404,
        );
  } catch (e) {
    logServerError('entries PATCH', requestId(req), e);
    return reply(
      { error: 'Unable to update this post. Please try again.' },
      503,
    );
  }
}
