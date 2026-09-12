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

assert request('/api/admin/session','POST',{'key':key})[0]==200
existing=json.loads(request('/api/entries?admin=1')[1])['data']
assert not any(e['kind'] in ['qualifying','duel'] and 'Round 24:' in e['title'] for e in existing), 'Round 24 must be unused for this local test'
qbody=json.dumps([{'driver':f'Test Driver {i+1}','team':'Test team','ms':60000+i*1000,'attempts':1} for i in range(8)])
record={'round':24,'qualifyingBody':qbody,'winners':{'QF1':'Test Driver 1'},'laps':{'Test Driver 1':61000}}
def payload(value):return {'kind':'duel','title':'Season 1 — Round 24: Yas Marina','body':json.dumps(value),'replace':True,'expectedId':None,'expectedBody':None}
try:
    assert request('/api/entries','POST',payload(record),opener=urllib.request.build_opener())[0]==403
    assert request('/api/entries','POST',payload(record))[0]==400
    assert request('/api/entries','POST',{'kind':'qualifying','title':'Season 1 — Round 24: Yas Marina','body':qbody})[0]==200
    for change in [{'winners':{'QF1':'Test Driver 2'}},{'winners':{'SF1':'Test Driver 1'}},{'winners':{'FINAL':'Test Driver 1'}},{'laps':{'Test Driver 1':-1}},{'round':'24'},{'qualifyingBody':'old'}]:
        assert request('/api/entries','POST',payload({**record,**change}))[0]==400,change
    assert request('/api/entries','POST',payload(record))[0]==200
    assert request('/api/entries','POST',payload(record))[0]==409
    public=json.loads(request('/api/entries?public=1')[1])['data']
    assert any(e['kind']=='duel' and e['body']==json.dumps(record) for e in public)
    print('PASS: Duel API authentication, published qualifying dependency, invalid winners/laps/rounds, stale qualifying, publish visibility and stale replacement protection.')
finally:
    for e in json.loads(request('/api/entries?admin=1')[1])['data']:
        if e['kind'] in ['qualifying','duel'] and 'Round 24:' in e['title']:
            assert request('/api/entries','PATCH',{'id':e['id'],'action':'delete'})[0]==200
    request('/api/admin/session','DELETE')
