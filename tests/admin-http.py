import json, pathlib, urllib.request, urllib.error, http.cookiejar, argparse
parser=argparse.ArgumentParser(description='Local-only admin route and session integration checks. Creates and removes one disposable story.')
parser.add_argument('--key-file', required=True, help='Private local key file; never commit this file.')
args=parser.parse_args()
base='http://localhost:3000'
raw=pathlib.Path(args.key_file).read_text()
key=raw.split('private key:\n\n')[1].split('\n')[0] if 'private key:\n\n' in raw else raw.strip()
jar=http.cookiejar.CookieJar(); client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def request(path, method='GET', body=None, origin=base, opener=client):
    h={'Content-Type':'application/json','Origin':origin}
    r=urllib.request.Request(base+path,method=method,headers=h,data=json.dumps(body).encode() if body is not None else None)
    try:
        with opener.open(r,timeout=20) as response: return response.status,response.read().decode(),response.headers
    except urllib.error.HTTPError as e:return e.code,e.read().decode(),e.headers
anon=urllib.request.build_opener()
for path in ['/admin','/admin/events','/admin/qualifying','/admin/results','/admin/stewarding','/admin/standings','/admin/drivers','/admin/submissions','/admin/publishing']:
    status,body,h=request(path,opener=anon)
    assert status==200 and 'Organiser access only' in body and 'Logged in as Organiser' not in body,path
    assert key not in body
assert request('/api/entries?admin=1',opener=anon)[0]==401
for kind in ['race','qualifying','event','penalty','notice']:
    assert request('/api/entries','POST',{'kind':kind,'title':'Unauthorised test','body':'{}'},opener=anon)[0]==403
assert request('/api/entries','PATCH',{'id':'not-a-real-id','action':'approve'},opener=anon)[0]==403
assert request('/api/admin/session','POST',{'key':'bad'})[0]==401
assert request('/api/admin/session','POST',{'key':key},origin='https://example.com')[0]==403
status,body,h=request('/api/admin/session','POST',{'key':key})
assert status==200 and 'HttpOnly' in h['Set-Cookie'] and 'SameSite=Strict' in h['Set-Cookie']
assert key not in h['Set-Cookie']
assert json.loads(request('/api/admin/session')[1])['authenticated']
assert json.loads(request('/api/entries?admin=1')[1])['isAdmin']
assert not json.loads(request('/api/entries?public=1')[1])['isAdmin']
assert 'Logged in as Organiser' in request('/admin/events')[1]
assert request('/api/entries','POST',{'kind':'notice','title':'test','body':'test'},origin='https://example.com')[0]==403
# Disposable guest moderation: create under the local session, reject, ensure public filtering, approve and delete.
marker='Disposable admin session moderation check'
id=None
try:
    assert request('/api/entries','POST',{'kind':'story','title':marker,'body':'A disposable local test story.'})[0]==200
    data=json.loads(request('/api/entries?admin=1')[1])['data'];id=next(e['id'] for e in data if e['title']==marker)
    assert request('/api/entries','PATCH',{'id':id,'action':'reject'})[0]==200
    assert all(e['id']!=id for e in json.loads(request('/api/entries?public=1')[1])['data'])
    assert next(e for e in json.loads(request('/api/entries?admin=1')[1])['data'] if e['id']==id)['approved']==-1
    assert request('/api/entries','PATCH',{'id':id,'action':'approve'})[0]==200
    assert any(e['id']==id for e in json.loads(request('/api/entries?public=1')[1])['data'])
finally:
    if id: assert request('/api/entries','PATCH',{'id':id,'action':'delete'})[0]==200
assert request('/api/admin/session','DELETE')[0]==200
assert not json.loads(request('/api/admin/session')[1])['authenticated']
assert request('/api/entries?admin=1')[0]==401
assert 'Logged in as Organiser' not in request('/admin/results')[1]
print('PASS: all protected routes, invalid/correct credentials, HttpOnly cookie, session reuse/logout, origin checks, private data isolation and reject/approve lifecycle; disposable post removed.')
