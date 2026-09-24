"""Local-only checks for the 2026-09 quality pass. Removes its own fixtures.

Covers: native (pre-hydration / no-JS) organiser login never placing the key in
a URL, redirect targets fixed to internal paths, the guarded Duel write for a
round seeded from archive qualifying, new security headers and public routes.
"""
import runpy, json, urllib.request, urllib.error, urllib.parse
ctx = runpy.run_path('tests/admin-http.py')
request, anon, key, base = ctx['request'], ctx['anon'], ctx['key'], ctx['base']

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def form_login(value, origin=base):
    r = urllib.request.Request(
        base + '/api/admin/session', method='POST',
        headers={'Content-Type': 'application/x-www-form-urlencoded', 'Origin': origin},
        data=urllib.parse.urlencode({'key': value}).encode())
    try:
        with urllib.request.build_opener(NoRedirect).open(r, timeout=20) as res:
            return res.status, res.headers
    except urllib.error.HTTPError as e:
        return e.code, e.headers

status, h = form_login(key)
assert status == 303 and h['Location'].endswith('/admin'), (status, h.get('Location'))
assert 'HttpOnly' in h['Set-Cookie'] and 'SameSite=Strict' in h['Set-Cookie']
assert key not in h['Location'] and key not in h['Set-Cookie']
status, h = form_login('definitely-wrong')
assert status == 303 and h['Location'].endswith('/admin?error=1') and 'Set-Cookie' not in h
assert 'definitely-wrong' not in h['Location']
assert form_login(key, origin='https://evil.example')[0] == 403
status, body, _ = request('/admin?error=1', opener=anon)
assert status == 200 and 'Key not accepted' in body and 'method="post"' in body and 'action="/api/admin/session"' in body

status, _, h = request('/', opener=anon)
assert status == 200
assert 'max-age=31536000' in h.get('Strict-Transport-Security', '')
assert h.get('Cross-Origin-Opener-Policy') == 'same-origin'
assert "form-action 'self'" in h.get('Content-Security-Policy', '')
for path in ['/rounds/1', '/rounds/24', '/championship', '/calendar', '/drivers', '/noticeboard', '/results']:
    assert request(path, opener=anon)[0] == 200, path
for path in ['/rounds/0', '/rounds/25', '/rounds/abc']:
    assert request(path, opener=anon)[0] == 404, path
status, body, _ = request('/rounds/3', opener=anon)
assert 'Round 03 — Japan' in body and '/rounds/3' in body
sitemap = request('/sitemap.xml', opener=anon)[1]
assert '/rounds/24' in sitemap and '/admin' not in sitemap and '/api' not in sitemap

# Guarded Duel write for a round whose qualifying comes from the archive.
assert request('/api/admin/session', 'POST', {'key': key})[0] == 200
data = json.loads(request('/api/entries?admin=1')[1])['data']
round1 = 'Season 1 — Round 1: Australia'
assert not any(e['kind'] in ['duel', 'qualifying'] and 'Round 1:' in e['title'] for e in data), 'Round 1 Duel/qualifying must be unused locally'
from pathlib import Path
archive = json.loads(Path('tests/fixtures/season-archive.json').read_text())
qbody = next(e['body'] for e in archive if e['id'] == 'archive-q1')
record = {'round': 1, 'qualifyingBody': qbody, 'winners': {'QF1': 'Winter'}, 'laps': {}}
payload = {'kind': 'duel', 'title': round1, 'body': json.dumps(record), 'replace': True, 'expectedId': None, 'expectedBody': None}
try:
    assert request('/api/entries', 'POST', payload)[0] == 200
    # Same first-publication request again: deterministic id -> conflict, not 503.
    assert request('/api/entries', 'POST', payload)[0] == 409
    public = json.loads(request('/api/entries?public=1')[1])['data']
    assert any(e['kind'] == 'duel' and 'Round 1:' in e['title'] for e in public)
finally:
    for e in json.loads(request('/api/entries?admin=1')[1])['data']:
        if e['kind'] == 'duel' and 'Round 1:' in e['title']:
            assert request('/api/entries', 'PATCH', {'id': e['id'], 'action': 'delete'})[0] == 200
assert request('/api/admin/session', 'DELETE')[0] == 200
print('PASS: native form login (303, fixed redirects, no key in URL), cross-origin form rejection, HSTS/COOP/form-action headers, public routes/404s/metadata, sitemap scope, guarded archive-seeded Duel write and duplicate-publication conflict.')
