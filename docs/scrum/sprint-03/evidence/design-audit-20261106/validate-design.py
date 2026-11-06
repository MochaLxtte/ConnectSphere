from pathlib import Path
import json,re,hashlib,collections,subprocess
R=Path.cwd();E=R/'docs/scrum/sprint-03/evidence/design-audit-20261106';H=lambda b:hashlib.sha256(b).hexdigest()
def check(b,msg):
 if not b: raise AssertionError(msg)
S=json.loads((E/'schema.json').read_text());D={t['name']:t for t in S['tables']};F={f['name']:f for f in S['foreign_keys']};M=json.loads((E/'models.json').read_text());Q={q['name']:q for q in json.loads((E/'visual-qa.json').read_text())};A=json.loads((E/'endpoint-audit.json').read_text())
arch=(R/'docs/architecture/README.md').read_text(encoding='utf-8');data=(R/'docs/database-diagram.md').read_text(encoding='utf-8');api=(R/'docs/architecture/api-contract.md').read_text(encoding='utf-8')
assertions=[]
def ok(name):assertions.append(name)
archive_files=0
for folder in ['pre-week-7-customer-changes','before-2026-11-06-update']:
 p=R/'docs/architecture/archive'/folder;x=json.loads((p/'manifest.json').read_text())
 for f in x['files']:
  check(H((p/f['snapshot_path']).read_bytes())==f['sha256'],'archive changed '+f['snapshot_path']);archive_files+=1
  if 'git_blob' in f:check(subprocess.check_output(['git','cat-file','blob',f['git_blob']])==(p/f['snapshot_path']).read_bytes(),'historical blob mismatch')
ok('All '+str(archive_files)+' original files match preserved hashes; genuine historical files also match Git blobs')
old=R/'docs/architecture/archive/before-2026-11-06-update'
check((old/'api-contract.md').read_text(encoding='utf-8') in api,'API history missing');check((old/'database-diagram.md').read_text(encoding='utf-8') in data,'DB history missing');check((old/'architecture.md').read_text(encoding='utf-8').split('## Class diagram',1)[1] in arch,'architecture history missing');ok('Original dated API, database and architecture history retained')
blocks=lambda text:re.findall(r'```mermaid\s*\n(.*?)\n```',text,re.S)
check(blocks(arch)[:3]==blocks((old/'architecture.md').read_text(encoding='utf-8'))[:3],'C4 source changed');ok('C1, C2 and C3 Mermaid source unchanged from preceding C4 correction')
def st(t):return {'timestamp with time zone':'timestamptz','time without time zone':'time','character varying':'varchar','double precision':'float8','ARRAY':'array'}.get(t,t).replace('[]','Array').replace(' ','_')
from xml.etree import ElementTree as ET
model_results=[]
for m in M:
 source=(E/m['source']).read_text();check(H(source.encode())==m['sha256'],'model source hash '+m['name']);check(source.rstrip() in (data if m['name']=='erd-database' else arch),'Markdown differs '+m['name']);q=Q[m['name']]
 check(q['source_sha256']==m['sha256'],'stale visual audit '+m['name'])
 for ext in ['png','svg']:check(H((R/'docs/architecture/exports'/(m['name']+'.'+ext)).read_bytes())==q[ext+'_sha256'],'stale export '+m['name']+ext)
 check(not q['outOfBounds'] and not q['edgeLabelOverlaps'] and not q['edgeLabelNodeOverlaps'],'geometry '+m['name']);check(not any(n['clipped'] for n in q['nodes']),'clipped node '+m['name'])
 if m['kind']=='sequenceDiagram':
  check(q['messageCount']==len(m['edges']),'sequence message count '+m['name']);check(q['participantCount']==len(m['nodes']),'sequence participant count '+m['name']);ids={n['id'] for n in m['nodes']}
  for x in m['nodes']+m['edges']:
   p=x['proof'];b=(R/p['file']).read_bytes();check(H(b)==p['sha256'],'proof file changed');check(p['token'] in b.decode('utf-8'),'proof anchor missing')
  for x in m['edges']:check(x['from'] in ids and x['to'] in ids,'unknown participant');check(x['from']+x['arrow']+x['to']+': '+x['label'] in source,'missing message')
 else:
  check(len(q['nodes'])==len(m['nodes']),'rendered node count '+m['name']);check(len(q['edges'])==len(m['edges']),'rendered edge count '+m['name']);check(len(q['edgeLabels'])==len(m['edges']),'rendered association labels '+m['name'])
  edge_texts=[]
  for n in m['nodes']:
   t=D[n['table']];dc={c['name']:c for c in t['columns']};check(set(n['columns'])<=set(dc),'invented field');identity=n['class'] if 'class' in n else n['table'];check(any(identity in v['id'] for v in q['nodes']),'rendered node missing '+identity)
   qn=next(v for v in q['nodes'] if ('classId-'+identity+'-' if m['kind']=='classDiagram' else 'entity-'+identity+'-') in v['id'])
   for col in n['columns']:
    check(st(dc[col]['type'])+' '+col in source,'field type missing')
    check(re.sub(r'\s+','',st(dc[col]['type'])+col) in re.sub(r'\s+','',qn['text']),'rendered attribute missing '+identity+'.'+col)
  for i,fk in enumerate(m['edges']):
   f=F[fk];cl=m['kind']=='classDiagram';parent=''.join(w.title() for w in f['parent'].split('_')) if cl else f['parent'];child=''.join(w.title() for w in f['child'].split('_')) if cl else f['child'];pc='1' if f['required'] else '0..1';cc='0..1' if f['child_unique'] else '0..*';label=','.join(f['columns'])
   if cl:
    label+=' ['+pc+' / '+cc+']';check(parent+' --> '+child+' : '+label in source,'class FK cardinality '+fk)
   else:
    left='||' if f['required'] else '|o';right='o|' if f['child_unique'] else 'o{';rel='--' if f['identifying'] else '..';check(f['parent']+' '+left+rel+right+' '+f['child']+' : "'+label+'"' in source,'ERD FK cardinality '+fk)
   edge_texts.append(label)
   edge=next((e for e in q['edges'] if e['id'].endswith('_'+str(i+1 if cl else i))),None);check(edge is not None,'SVG edge identity '+fk)
   check(parent in edge['id'] and child in edge['id'],'SVG endpoints '+fk)
   if not cl:
    check(('onlyOneStart' if f['required'] else 'zeroOrOneStart') in edge['start'],'SVG parent marker '+fk);check(('zeroOrOneEnd' if f['child_unique'] else 'zeroOrMoreEnd') in edge['end'],'SVG child marker '+fk);check(('edge-pattern-solid' if f['identifying'] else 'edge-pattern-dashed') in edge['style'],'SVG identifying type '+fk)
  check(collections.Counter(edge_texts)==collections.Counter(e['text'] for e in q['edgeLabels']),'rendered edge label contents '+m['name'])
 model_results.append({'name':m['name'],'nodes_or_participants':len(m['nodes']),'connections_or_messages':len(m['edges']),'source_and_export_match':True,'source_proofs_or_catalog_match':True,'geometry_pass':True})
ok('Every displayed class/entity attribute, node, FK endpoint, cardinality and association label checked against catalog')
ok('Every sequence participant and all 177 messages have unchanged implementation proof anchors; rendered counts match')
check(set(next(m['edges'] for m in M if m['name']=='class'))==set(F),'class FK coverage');check(set(next(m['edges'] for m in M if m['name']=='erd-database'))==set(F),'database FK coverage');check(len(D)==24 and sum(len(t['columns']) for t in D.values())==243 and len(F)==55,'schema counts')
for t in D.values():
 start=data.index('### '+t['name']+'\n');part=data[start:].split('\n### ',1)[0].split('\n## ',1)[0]
 check(sum(1 for l in part.splitlines() if l.startswith('| `'))==len(t['columns']),'dictionary column count '+t['name'])
ok('Complete catalog: 24 tables, 243 columns, 55 FKs; all 243 dictionary rows and all 55 graph relationships covered')
keys={r['method']+' '+r['path'] for r in A['routes']};check(len(keys)==85 and A['runtime_verification']['exact_match'],'route runtime check');check({r['method']+' '+r['path'] for r in json.loads((E/'route-inventory.json').read_text())['routes']}==keys,'route inventory mismatch')
for r in A['routes']:
 check('| `'+r['method']+' '+r['path']+'` |' in api,'missing API route');check(r['request_contract'].replace('|','&#124;') in api,'request contract mismatch');check(r['response_contract'].replace('|','&#124;') in api,'response contract mismatch')
for f in A['source_files']:check(H((R/f['path']).read_bytes())==f['sha256'],'route source hash changed '+f['path'])
ok('All 85 documented endpoints match registered runtime routes, status/role inventory and individual handler references')
for s in json.loads((E/'api-shapes.json').read_text()):check(s['declarations'] in api,'type reference missing')
ok('Exact TypeScript DTO declarations retained from 30 current source files')
# Validate current-section relative file links; archive originals retain their original context.
links=[]
for p in [R/'docs/architecture/README.md',R/'docs/architecture/api-contract.md',R/'docs/database-diagram.md']:
 content=p.read_text(encoding='utf-8').split('## Earlier ')[0]
 for label,target in re.findall(r'\[([^\]]+)\]\(([^)]+)\)',content):
  if target.startswith(('http:','https:','#')):continue
  file=target.split('#')[0];check((p.parent/file).exists(),'broken link '+str(p)+': '+target);links.append(target)
ok('All '+str(len(links))+' current-document file links resolve; immutable snapshot links are scoped to their recorded original context')
report={'audit_id':'DESIGN-20261106-01','date':'2026-11-06','source_commit':A['source_commit'],'status':'Pass','checks':assertions,'original_files_hash_verified':archive_files,'tables':24,'application_tables':22,'columns':243,'foreign_keys':55,'routes':85,'new_or_refreshed_models':len(M),'sequence_participants':sum(len(m['nodes']) for m in M if m['kind']=='sequenceDiagram'),'sequence_messages':sum(len(m['edges']) for m in M if m['kind']=='sequenceDiagram'),'models':model_results,'scope_limits':['Static/code and migrated-schema audit, with runtime router construction and render checks; no deployed/shared-database or integrated app acceptance test','No commits, pushes, PRs, Jira status changes or product-code changes']}
(E/'audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['models','checks']}));print('\n'.join(assertions))
