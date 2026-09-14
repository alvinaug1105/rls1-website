"""Local-only adversarial checks; removes its own disposable fixture."""
import runpy, json, urllib.request, time
ctx=runpy.run_path('tests/admin-http.py')
request=ctx['request']; anon=ctx['anon']; key=ctx['key']; base=ctx['base']
assert request('/api/admin/session','POST',{'key':key})[0]==200
assert not json.loads(request('/api/entries')[1])['isAdmin']
for path in ['/admin','/admin/media','/admin/events?round=abc','/admin/results?round=-1','/admin/qualifying?round=999999999','/admin/duel?round=%3Cscript%3E']:
    status,body,h=request(path)
    assert status==200,path
    assert 'no-store' in h.get('Cache-Control',''),(path,dict(h))
    assert "frame-ancestors 'none'" in h.get('Content-Security-Policy',''),path
    assert key not in body
before=time.time()*1000
status,body,h=request('/api/time',opener=anon)
assert status==200 and 'no-store' in h['Cache-Control']
assert before-1000 <= json.loads(body)['now'] <= time.time()*1000+1000
assert request('/api/admin/session','POST',{'key':'x'*6000})[0]==413
assert request('/api/entries','PATCH',{'id':'x'*6000,'action':'delete'})[0]==413
assert request('/api/entries','POST',{'body':'x'*60000})[0]==413
for origin in ['', 'https://evil.example']:
    assert request('/api/entries','POST',{'kind':'notice','title':'test','body':'test'},origin=origin)[0]==403
    assert request('/api/admin/session','DELETE',origin=origin)[0]==403
payload='<script>alert(1)</script><img src=x onerror=alert(1)> "\'><svg onload=alert(1)> SQL: \'; DROP TABLE entries; --'
marker='Disposable security text fixture'
identifier=None
try:
    status,_,_=request('/api/entries?public=1','POST',{'kind':'story','title':marker,'body':payload,'author':'Security test','approved':1,'admin':True,'published':True})
    assert status==200
    records=json.loads(request('/api/entries?admin=1')[1])['data']
    record=next(r for r in records if r['title']==marker);identifier=record['id']
    assert record['approved']==0 and record['body']==payload
    for path in ['/api/entries','/api/entries?public=1']:
        data=json.loads(request(path)[1]);assert not data['isAdmin'];assert all(r['id']!=identifier for r in data['data'])
        assert all('userId' not in r for r in data['data'])
    assert request('/api/entries','PATCH',{'id':identifier,'action':'approve'})[0]==200
    assert any(r['id']==identifier for r in json.loads(request('/api/entries?public=1')[1])['data'])
finally:
    if identifier: assert request('/api/entries','PATCH',{'id':identifier,'action':'delete'})[0]==200
# Atomic expected-body replacement checks on an unused local test round.
for kind, first, second in [('event', {'date':'2027-01-06','status':'UPCOMING','notes':'version one'}, {'date':'2027-01-06','status':'UPCOMING','notes':'version two'}), ('race', [{'driver':'Test Driver','team':'Test Team','points':1}], [{'driver':'Test Driver','team':'Test Team','points':2}])]:
    data=json.loads(request('/api/entries?admin=1')[1])['data']
    assert not any(e['kind']==kind and 'Round 24:' in e['title'] for e in data), 'Round 24 must be unused for this local fixture'
    post={'kind':kind,'title':'Season 1 — Round 24: Security test','body':json.dumps(first)}
    rid=None
    try:
        assert request('/api/entries','POST',post)[0]==200
        record=next(e for e in json.loads(request('/api/entries?admin=1')[1])['data'] if e['title']==post['title'] and e['kind']==kind);rid=record['id']
        update={**post,'body':json.dumps(second),'replace':True,'expectedId':rid,'expectedBody':record['body']}
        assert request('/api/entries','POST',update)[0]==200
        assert request('/api/entries','POST',update)[0]==409
    finally:
        if rid: assert request('/api/entries','PATCH',{'id':rid,'action':'delete'})[0]==200
assert request('/api/admin/session','DELETE')[0]==200
print('PASS: explicit public scope, bounded bodies, media protection, headers, malformed rounds, CSRF, mass assignment, SQL-like stored text and server time.')
