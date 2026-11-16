import json, sys, collections
t=sys.argv[1]
r=[x for x in json.load(open(f'{t}/results.json')) if 'menu' in x]
print(t, 'screens', len(r))
print('doc overflow:', [ (x['stage'][:5],x['menu']) for x in r if x['docOverflow']][:20])
ov=collections.Counter(); 
for x in r:
  for o in x['overflow']: ov[o]+=1
print('overflow els:', ov.most_common(10))
sm=collections.Counter()
for x in r:
  for s in x['small']:
    sm[s.rsplit(' ',1)[0]]+=1
print('small targets:', sm.most_common(14))
lc=collections.Counter()
for x in r:
  for s in x['lowc']:
    lc[s.split(' "')[0].rsplit(' ',1)[0]+' '+s.split('"')[1][:20] if '"' in s else s]+=1
print('low contrast:', lc.most_common(20))
tiny=collections.Counter()
for x in r:
  for s in x['tinyEx']: tiny[s.split(' ')[0]+' '+s.split(' ')[1]]+=1
print('tiny text:', tiny.most_common(12))
cl=collections.Counter()
for x in r:
  for s in x['clipped']:
    if 'sr-only' in s or 'gk-sr' in s: continue
    cl[s]+=1
print('clipped:', cl.most_common(12))
errs=collections.Counter()
for x in r:
  for e in x['errs']: errs[(e[:110])]+=1
print('errors:', errs.most_common(10))
print('font sizes per screen: min', min(x['fontSizes'] for x in r), 'max', max(x['fontSizes'] for x in r), 'avg', sum(x['fontSizes'] for x in r)/len(r))
print('tallest pages:', sorted([(x['pageH'], x['stage'][:5], x['menu']) for x in r], reverse=True)[:8])
rb=collections.Counter()
for x in r:
  for k,v in x['rawBtn'].items(): rb[k]+=1
print('raw button classes (screens):', rb.most_common(25))
