"""Verify all retained source proofs, diagram elements, exports, archives and links.
Run from the repository root after build-audit.py and render-audit.mjs.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import hashlib, json, re, subprocess, collections

R=Path.cwd()
E=R/'docs/scrum/sprint-03/evidence/pre-week-7-c4-audit-20261106'
A=R/'docs/architecture/archive/pre-week-7-customer-changes'
C='b981f1133750e7ddd42ac412651c915cb4485418'
H=lambda b: hashlib.sha256(b).hexdigest()
read=lambda p: json.loads(p.read_text(encoding='utf-8'))
cache={}
def blob(b):
    if b not in cache: cache[b]=subprocess.check_output(['git','cat-file','blob',b])
    return cache[b]
def check(condition,message):
    if not condition: raise AssertionError(message)

actual_tree={line.split('\t')[1]:line.split()[2] for line in subprocess.check_output(['git','ls-tree','-r',C],text=True).splitlines()}
tree=read(E/'source-tree.json')
check(tree['commit']==C,'pinned tree commit')
check({x['path']:x['git_blob'] for x in tree['files']}==actual_tree,'full pinned tree inventory')
catalog=read(E/'source-catalog.json')
for f in catalog:
    b=blob(f['git_blob'])
    check(actual_tree[f['path']]==f['git_blob'] and H(b)==f['sha256'] and len(b.splitlines())==f['lines'],'source catalog '+f['path'])

proof_count=0
def proof(p):
    global proof_count
    b=blob(p['git_blob']);s=b.decode('utf-8-sig')
    check(actual_tree[p['path']]==p['git_blob'] and H(b)==p['sha256'],'pinned proof hash '+p['path'])
    check(p['token'] in s and s[:s.index(p['token'])].count('\n')+1==p['line'],'proof token/line '+p['path'])
    check(s.splitlines()[p['line']-1].strip()==p['snippet'],'proof excerpt '+p['path'])
    check('/blob/'+C+'/'+p['path']+'#L'+str(p['line']) in p['url'],'pinned source URL')
    proof_count+=1

preserved=0
for folder in ['pre-week-7-customer-changes','before-2026-11-06-update']:
    directory=A.parent/folder;manifest=read(directory/'manifest.json')
    for f in manifest['files']:
        b=(directory/f['snapshot_path']).read_bytes()
        check(H(b)==f['sha256'],'preserved file changed '+str(directory/f['snapshot_path']))
        if 'git_blob' in f: check(b==blob(f['git_blob']),'historical snapshot differs from original Git blob')
        preserved+=1
manifest=read(A/'manifest.json')
check(manifest['source_commit']==C and manifest['historical_exports']=='Not recorded' and manifest['class_diagram']=='Not recorded' and manifest['sequence_diagrams']=='Not recorded','original provenance was rewritten')
blocks=lambda s:re.findall(r'```mermaid\s*\n(.*?)\n```',s,re.S)
oldblocks=blocks((A/'architecture.md').read_text(encoding='utf-8'))
current=(R/'docs/architecture/README.md').read_text(encoding='utf-8')
before=(A.parent/'before-2026-11-06-update/architecture.md').read_text(encoding='utf-8')
check(blocks(current)[:3]==blocks(before)[:3],'current C4 source altered')
for d in read(R/'docs/scrum/sprint-03/evidence/c4-audit-20261105/audit.json')['diagrams']:
    for f in d['exports']:check(H((R/f['path']).read_bytes())==f['sha256'],'current C4 export altered '+f['path'])

models=read(E/'models.json');render={d['name']:d for d in read(E/'render-validation.json')['diagrams']}
visual={d['name']:d for d in read(E/'visual-review.json')['diagrams']}
doc=(A/'c4-audit.md').read_text(encoding='utf-8')
counts=collections.Counter();results=[]
for m in models:
    source=(R/m['source']).read_bytes();s=source.decode('utf-8')
    check(H(source)==m['source_sha256'],'Mermaid hash '+m['name'])
    check(s.rstrip() in doc,'Mermaid not included in audit ledger '+m['name'])
    if m['kind']=='Original':
        ix=0 if m['name'].startswith('c1') else 1
        check(source==(oldblocks[ix]+'\n').encode(),'original C4 source altered')
    parsednodes={};parsededges=[];parsedbounds={};stack=[]
    for line in s.splitlines():
        b=re.match(r'\s*subgraph (\w+)\["(.*?)"\]',line)
        if b: stack.append(b[1]);parsedbounds[b[1]]={'label':b[2],'members':[]};continue
        if line.strip()=='end':stack.pop();continue
        n=re.match(r'\s*(\w+)(?:\["|\[\(")(.*?)"(?:\]|\)\])\s*$',line)
        if n:
            check(n[1] not in parsednodes,'duplicate node '+n[1]);parsednodes[n[1]]=n[2]
            if stack:parsedbounds[stack[-1]]['members'].append(n[1])
        x=re.match(r'\s*(\w+)\s+(-->|-\.->)\|(?:"(.*?)"|([^|]*))\|\s+(\w+)\s*$',line)
        if x:parsededges.append((x[1],x[5],x[3] if x[3] is not None else x[4],x[2]=='-.->'))
    check(parsednodes=={n['id']:n['label'] for n in m['nodes']},'every source node '+m['name'])
    check(parsededges==[(x['from'],x['to'],x['label'],x['dashed']) for x in m['edges']],'every source connection '+m['name'])
    check(set(parsedbounds)=={b['id'] for b in m['boundaries']},'boundary inventory')
    for b in m['boundaries']:
        check(parsedbounds[b['id']]['label']==b['label'] and set(parsedbounds[b['id']]['members'])==set(b['members']),'boundary membership '+m['name'])
    for k,kind in [('nodes','Node'),('edges','Edge'),('boundaries','Boundary')]:
        counts[k]+=len(m[k])
        for item in m[k]:
            check('| '+kind+' `'+item['id']+'` |' in doc,'missing ledger row '+m['name']+':'+item['id'])
            if item['assessment']=='Notation':
                check(item['notation_source']=={'path':m['source'],'sha256':m['source_sha256']},'legend definition proof')
                check(not item['proofs'],'legend incorrectly attributed to historical application code')
            else:
                check(bool(item['proofs']),'missing source proof '+item['id'])
                for p in item['proofs']:proof(p)
    q=render[m['name']]
    check(q['result']=='Pass' and not q['problems'],'SVG checks failed '+m['name'])
    check(q['source_sha256']==m['source_sha256'],'stale rendered source '+m['name'])
    for ext in ['png','svg']:
        digest=H((A/'c4-exports'/(m['name']+'.'+ext)).read_bytes())
        check(digest==q[ext+'_sha256']==visual[m['name']][ext+'_sha256'],'stale export / visual review '+m['name'])
    check(visual[m['name']]['result']=='Pass','missing visual review')
    check(len(q['nodes'])==len(m['nodes']) and len(q['edges'])==len(m['edges']) and len(q['clusters'])==len(m['boundaries']),'rendered element counts')
    check(not q['collisions'] and not q['labelCollisions'] and not q['nodeCollisions'] and not q['outOfBounds'] and all(n['label_within_shape'] for n in q['nodes']),'render geometry')
    results.append(dict(name=m['name'],nodes=len(m['nodes']),edges=len(m['edges']),boundaries=len(m['boundaries']),source_proofs='Pass',render_and_visual='Pass'))

cm=read(E/'component-map.json'); backend={p for p in actual_tree if p.startswith('backend/src/') and p.endswith('.ts')}
check(set(cm['files'])|set(cm['bootstrap_and_shared_types'])==backend,'backend source partition incomplete')
c3=next(m for m in models if m['name']=='c3-components-reconstructed')
pairs={(x['from'],x['to']) for x in c3['edges']}
check(set(cm['files'].values())=={n['id'] for n in c3['nodes'] if n['group']=='apiBoundary'},'component diagram mismatch')
for i in cm['runtime_imports']:
    check((i['component_from'],i['component_to']) in pairs,'cross-component runtime import not shown')
    check(cm['files'][i['source']]==i['component_from'] and cm['files'][i['target']]==i['component_to'],'component mapping proof')
for p in cm['policy_injection']:proof(p)
negative=read(E/'negative-evidence.json')
check(set(negative['backend_files'])==backend,'negative evidence backend inventory')
check(set(negative['frontend_pages'])=={p for p in actual_tree if p.startswith('frontend/src/') and '/pages/' in p and p.endswith('.vue')},'negative evidence page inventory')
check(len(negative['migration_files'])==6 and set(negative['migration_files'])=={p for p in actual_tree if p.startswith('database/migrations/')},'historical migrations')
for p in negative['route_mounts']:proof(p)
check(not any('/'+x+'/' in p for p in backend for x in ['venues','equipment','registrations','safety']),'unexpected historical business module')
roles=blob(actual_tree['backend/src/modules/auth/types.ts']).decode()
check(re.findall(r"'([A-Z_]+)'",roles)==['EVENT_ORGANISER','EVENT_COORDINATOR','VENUE_STAFF','TECHNICAL_SUPPORT_STAFF','ATTENDEE'],'historical role enum')

class Links(HTMLParser):
    def __init__(self):super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        self.links.extend(v for k,v in attrs if k in ['href','src'])
links=0
docs=[A/'README.md',A/'c4-audit.md',A/'c4-gallery.html',E/'README.md',R/'docs/architecture/exports/index.html']
for p in docs:
    s=p.read_text(encoding='utf-8'); targets=[]
    if p.suffix=='.html':
        parser=Links();parser.feed(s);targets=parser.links
    else:targets=re.findall(r'\[[^\]]+\]\(([^)\s]+)\)',s)
    for t in targets:
        u=urlsplit(t)
        if u.scheme or u.netloc or not u.path:continue
        target=p.parent/unquote(u.path)
        # This report is written only after all checks pass, including its own link.
        check(target.exists() or target.resolve()==(E/'validation.json').resolve(),'broken local link '+str(p)+': '+t);links+=1
agents=(R/'AGENTS.md').read_text(encoding='utf-8')
for p in [A/'c4-audit.md',E/'README.md']:check(p.relative_to(R).as_posix() in agents,'new document not mapped')
check(dict(counts)==read(E/'audit.json')['counts'],'summary counts mismatch')
check(counts=={'nodes':44,'edges':55,'boundaries':3},'unexpected audit scope')
result=dict(result='Pass',source_commit=C,source_catalog_files=len(catalog),proof_references=proof_count,
            original_files_preserved=preserved,current_c4_source_and_six_exports_unchanged=True,
            current_other_models='Validated separately with design-audit-20261106/validate-design.py',
            counts=dict(counts),backend_source_files=len(backend),cross_component_runtime_imports=len(cm['runtime_imports']),
            local_links_checked=links,models=results,scope='Static historical code/design, topology, geometry, provenance and local links; no live business acceptance')
(E/'validation.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps(result))
