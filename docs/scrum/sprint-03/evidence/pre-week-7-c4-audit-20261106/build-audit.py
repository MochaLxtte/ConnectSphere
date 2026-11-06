"""Rebuild retrospective C4 sources and per-element proofs from the pinned Git tree.

Run from the repository root. Reads Git objects, never checks out historical code.
The three original Markdown snapshots and their preservation manifest are not written.
"""
from pathlib import Path
import hashlib, json, re, subprocess, html

R = Path.cwd()
E = R / 'docs/scrum/sprint-03/evidence/pre-week-7-c4-audit-20261106'
A = R / 'docs/architecture/archive/pre-week-7-customer-changes'
C = 'b981f1133750e7ddd42ac412651c915cb4485418'
H = lambda b: hashlib.sha256(b).hexdigest()
URL = subprocess.check_output(['git', 'remote', 'get-url', 'origin'], text=True).strip().removesuffix('.git')
if URL.startswith('git@github.com:'): URL = 'https://github.com/' + URL.split(':', 1)[1]
tree = subprocess.check_output(['git', 'ls-tree', '-r', C], text=True).splitlines()
blobs = {line.split('\t')[1]: line.split()[2] for line in tree}
cache = {}

def blob(p):
    if p not in cache: cache[p] = subprocess.check_output(['git', 'cat-file', 'blob', blobs[p]])
    return cache[p]

def proof(p, token):
    s = blob(p).decode('utf-8-sig')
    assert token in s, (p, token)
    line = s[:s.index(token)].count('\n') + 1
    return dict(path=p, git_blob=blobs[p], sha256=H(blob(p)), token=token,
                line=line, snippet=s.splitlines()[line-1].strip(), url=f'{URL}/blob/{C}/{p}#L{line}')

def pr(p, t): return [proof(p, t)]
def write(p, s):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(s.encode('utf-8'))
def js(p, obj): write(p, json.dumps(obj, indent=2, ensure_ascii=False)+'\n')

B = 'backend/src/'
V = 'frontend/src/'
AU = B+'modules/auth/'
EV = B+'modules/events/'
MIG = 'database/migrations/005_core_feature_schema.sql'
roleproof = lambda role: pr(AU+'types.ts', "'"+role+"'")
api = pr(B+'app.ts', 'export function createApp(')
web = pr(V+'app/router.ts', 'export const router = createRouter(')
auth = pr(AU+'supabase.ts', 'export async function verifySupabaseAccessToken(')
db = pr(B+'db/pool.ts', 'const pool = new pg.Pool(')
signin = pr(V+'features/auth/supabase-client.ts', 'supabase.auth.signInWithPassword(')
jwks = pr(AU+'supabase.ts', 'return cachedJwks ??= createRemoteJWKSet(')
sql = lambda f: pr(EV+f+'.ts', 'client.query')
models = []

def node(i, label, proofs, assessment='Implemented', note='', group=None):
    return dict(id=i, label=label, proofs=proofs, assessment=assessment, note=note, group=group)

def edge(a, b, label, proofs, assessment='Implemented', note='', dashed=False):
    return dict(id=f'{a}__{b}', **{'from':a, 'to':b}, label=label, proofs=proofs,
                assessment=assessment, note=note, dashed=dashed)

def boundary(i, label, members, proofs, note):
    return dict(id=i, label=label, members=members, proofs=proofs, assessment='Logical ownership', note=note)

def add(name, title, kind, nodes, edges, bounds=(), original=None):
    if original is not None:
        source=original+'\n'
    else:
        lines=['---', 'title: '+title, 'config:', '  layout: elk', '---', 'flowchart LR']
        outside=[n for n in nodes if not n['group']]
        for n in outside: lines.append('  '+n['id']+'["'+n['label']+'"]')
        for b in bounds:
            lines.append('  subgraph '+b['id']+'["'+b['label']+'"]')
            for n in nodes:
                if n['group']==b['id']: lines.append('    '+n['id']+'["'+n['label']+'"]')
            lines.append('  end')
        for x in edges: lines.append('  '+x['from']+(' -.->' if x['dashed'] else ' -->')+'|"'+x['label']+'"| '+x['to'])
        lines += ['  classDef person fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e;',
                  '  classDef external fill:#f1f5f9,stroke:#64748b,color:#0f172a;',
                  '  classDef planned fill:#fff7ed,stroke:#c2410c,color:#7c2d12,stroke-dasharray:5 4;',
                  '  classDef legend fill:#ffffff,stroke:#94a3b8,color:#475569;',
                  '  class legend legend;']
        for n in nodes:
            if n['assessment']=='Planned workflow': lines.append('  class '+n['id']+' planned;')
        source='\n'.join(lines)+'\n'
    folder='original' if kind=='Original' else 'reconstructed'
    p=A/'c4-source'/folder/(name.replace('-original','').replace('-reconstructed','')+'.mmd')
    write(p,source)
    for n in nodes:
        if n['assessment']=='Notation':
            n['notation_source']=dict(path=p.relative_to(R).as_posix(),sha256=H(source.encode()))
    models.append(dict(name=name,title=title,kind=kind,source=p.relative_to(R).as_posix(),
                       source_sha256=H(source.encode()),nodes=nodes,edges=edges,boundaries=list(bounds)))

# The original diagrams are copied verbatim, including their intended-release scope.
old=blob('docs/architecture/README.md').decode('utf-8')
assert blob('docs/architecture/README.md')==(A/'architecture.md').read_bytes()
blocks=re.findall(r'```mermaid\s*\n(.*?)\n```',old,re.S)
orig1nodes=[
 node('organiser','Event Organiser<br/>Provides requests and manages own events',roleproof('EVENT_ORGANISER')),
 node('coordinator','Event Coordinator<br/>Reviews and coordinates assigned events',roleproof('EVENT_COORDINATOR')),
 node('venue','Venue Staff<br/>Maintains venues and decides bookings',roleproof('VENUE_STAFF'),'Planned workflow','Role exists; maintenance/booking API and UI absent (N1).'),
 node('technical','Technical Support Staff<br/>Arranges equipment',roleproof('TECHNICAL_SUPPORT_STAFF'),'Planned workflow','Role and equipment schema exist; business API/UI absent (N1).'),
 node('attendee','Attendee<br/>Registers and withdraws',roleproof('ATTENDEE'),'Planned workflow','Role and registration schema exist; business API/UI absent (N1).'),
 node('system','ConnectSphere<br/>Event planning and venue booking system',api+web,'Mixed implemented/planned','System description is intended-release scope, not a claim that venue booking was working.'),
 node('identity','Supabase Auth<br/>External identity service',signin+auth)]
orig1edges=[
 edge('organiser','system','Requests and changes',pr(V+'features/events/api/event-requests.ts',"return sendJson<SavedEventRequest>('POST', '/api/events', input, signal);")+pr(EV+'update-draft.ts','export async function updateOwnedDraft('),'Implemented subset','Owned draft create/update, submit, outcomes and clarification/cancellation; not arbitrary post-submission change approval.'),
 edge('coordinator','system','Review and planning',pr(EV+'assignment-router.ts','export function createAssignmentRouter(')+pr(EV+'review-router.ts','export function createReviewRouter(')),
 edge('venue','system','Venue availability and booking decisions',pr(MIG,'CREATE TABLE venue_bookings'),'Planned workflow','Schema only; no corresponding route/page (N1).'),
 edge('technical','system','Availability and reservations',pr(MIG,'CREATE TABLE equipment_requests'),'Planned workflow','Schema only; no corresponding route/page (N1).'),
 edge('attendee','system','Event registration',pr(MIG,'CREATE TABLE event_registrations'),'Planned workflow','Schema only; no corresponding route/page (N1).'),
 edge('system','identity','Sign-in and token verification',signin+jwks,'Implemented with qualification','Browser exchanges credentials; API verifies locally with cached JWKS, or local legacy HS256 secret. Not a per-request remote verification call.')]
add('c1-context-original','Original C1 - pre-Week 7 intended release','Original',orig1nodes,orig1edges,original=blocks[0])
orig2nodes=[node('user','User<br/>One of five application roles',pr(AU+'types.ts','export const USER_ROLES = [')),
 node('identity','Supabase Auth<br/>Email/password sign-in and signing keys',signin+jwks),
 node('web','Web application<br/>Vue 3, TypeScript, Vite<br/>Pages and API client',web+pr('frontend/package.json','"vue"'),group='boundary'),
 node('api','API application<br/>Express 5, TypeScript<br/>Authorization and business rules',api+pr('backend/package.json','"express"'),group='boundary'),
 node('db','Database<br/>Supabase PostgreSQL<br/>Persistent application records',db+pr('backend/src/db/connection.ts',"url.searchParams.get('sslmode') !== 'verify-full'"),group='boundary')]
orig2edges=[edge('user','web','Uses browser',web),
 edge('web','api','HTTP JSON /api',pr(V+'lib/api-client.ts','fetch(')+pr('frontend/vite.config.ts',"'/api':")),
 edge('web','identity','HTTPS credential exchange',signin),
 edge('api','identity','HTTPS public signing keys',jwks,'Conditional JWKS fetch','Cached key retrieval, not one remote request per API call; HS256 fallback uses a local secret.'),
 edge('api','db','SQL via pg over TLS',db+pr(B+'db/connection.ts',"url.searchParams.get('sslmode') !== 'verify-full'"),'Supabase configuration','TLS verify-full required for Supabase; local PostgreSQL can use a non-TLS connection.')]
b2=boundary('boundary','ConnectSphere system boundary',['web','api','db'],api+web+db,'Logical ownership of application data, not physical hosting or a single deployment. Supabase Auth remains external.')
add('c2-containers-original','Original C2 - pre-Week 7 containers','Original',orig2nodes,orig2edges,[b2],blocks[1])

legend=lambda text: node('legend',text,[],'Notation','Retrospective notation added on 6 November; checked against this diagram definition, with no application-code counterpart.')
rn1=[node('organiser','Event Organiser<br/>[Person]<br/>Own requests and outcomes',roleproof('EVENT_ORGANISER')),
 node('coordinator','Event Coordinator<br/>[Person]<br/>Allocation, review and lifecycle',roleproof('EVENT_COORDINATOR')),
 node('venue','Venue Staff<br/>[Person: planned workflow]<br/>Venue management and decisions',roleproof('VENUE_STAFF'),'Planned workflow','Role enum exists; feature absent (N1).'),
 node('technical','Technical Support Staff<br/>[Person: planned workflow]<br/>Equipment availability and reservations',roleproof('TECHNICAL_SUPPORT_STAFF'),'Planned workflow','Role enum exists; feature absent (N1).'),
 node('attendee','Attendee<br/>[Person: planned workflow]<br/>Registration and withdrawal',roleproof('ATTENDEE'),'Planned workflow','Role enum exists; feature absent (N1).'),
 node('system','ConnectSphere<br/>[Software system]<br/>Implemented request and review workflows',api+web),
 node('identity','Supabase Auth<br/>[External software system]<br/>Email/password identity and signing keys',signin+jwks),
 legend('Legend<br/>Solid: implemented interaction<br/>Dashed: planned business interaction<br/>Source: 1 Oct 2026 / b981f11<br/>Reconstructed: 6 Nov 2026')]
rn1e=[edge('organiser','system','Draft, submit, respond and view outcomes',pr(EV+'submitted-requests-router.ts','const created = await createDraft(')+pr(EV+'clarifications.ts','export async function respondToClarification(')),
 edge('coordinator','system','Allocate, clarify, review and manage lifecycle',pr(EV+'assignment.ts','export async function assignCoordinator(')+pr(EV+'lifecycle.ts','export async function confirmEvent(')+pr(EV+'review-decision.ts','export async function recordInitialReview(')),
 edge('venue','system','Planned: maintain venues and decide bookings',orig1edges[2]['proofs'],'Planned workflow','Schema only; N1.',True),
 edge('technical','system','Planned: equipment availability and reservations',orig1edges[3]['proofs'],'Planned workflow','Schema only; N1.',True),
 edge('attendee','system','Planned: registration and withdrawal',orig1edges[4]['proofs'],'Planned workflow','Schema only; N1.',True),
 edge('system','identity','Sign-in and signing-key discovery',signin+jwks,'Implemented with qualification','Context-level aggregate: browser credential exchange and API cached JWKS retrieval; local JWT verification. HS256 fallback has no remote key request.')]
add('c1-context-reconstructed','Pre-Week 7 C1 - reconstructed from b981f11 on 6 Nov 2026','Reconstruction',rn1,rn1e)

rn2=[node('user','Application user<br/>[Person]<br/>Five trusted role values',pr(AU+'types.ts','export const USER_ROLES = ['),'Implemented','Business UI exists only for organiser/coordinator workflows; other provisioned roles can authenticate.'),
 node('identity','Supabase Auth<br/>[External software system]<br/>Email/password and published signing keys',signin+jwks),
 node('web','Web application<br/>[Container: Vue 3 / TypeScript / Vite]<br/>Browser pages and API client',orig2nodes[2]['proofs'],group='systemBoundary'),
 node('api','API application<br/>[Container: Express 5 / TypeScript]<br/>One Node.js process',api+pr(B+'server.ts','const server = app.listen('),group='systemBoundary'),
 node('db','Application database<br/>[Container: Supabase PostgreSQL]<br/>Application-owned records and triggers',db+pr(MIG,'CREATE TABLE notifications'),group='systemBoundary'),
 legend('Legend<br/>Arrows: calls or data access<br/>Boundary: logical system ownership<br/>Database hosting: Supabase<br/>Local development: Vite 5173 / API 3000')]
rn2e=[edge('user','web','Uses browser pages',web),
 edge('web','api','HTTP JSON /api + HttpOnly session cookie',orig2edges[1]['proofs']+pr(AU+'router.ts','HttpOnly; SameSite=Lax;'),'Implemented','Development /api proxy targets API3000; same-origin fetch carries the Path=/api cookie. No deployment claim.'),
 edge('web','identity','HTTPS: temporary credential exchange',signin+pr(V+'features/auth/supabase-client.ts','persistSession: false'),'Implemented','SDK session discarded locally after extracting token; Express owns durable browser cookie.'),
 edge('api','identity','HTTPS: cached JWKS retrieval',jwks,'Conditional JWKS fetch','JWT verified locally; optional legacy SUPABASE_JWT_SECRET path makes no JWKS request.'),
 edge('api','db','SQL via pg pool / transaction clients',db+pr(B+'db/connection.ts',"url.searchParams.get('sslmode') !== 'verify-full'"),'Implemented','TLS verify-full for Supabase; direct/session pooler supported. Browser does not use the Data API.')]
rb2=boundary('systemBoundary','ConnectSphere - logical system boundary',['web','api','db'],b2['proofs'],b2['note'])
add('c2-containers-reconstructed','Pre-Week 7 C2 - reconstructed from b981f11 on 6 Nov 2026','Reconstruction',rn2,rn2e,[rb2])

groups={
 'http':['app.ts','modules/events/assignment-router.ts','modules/events/clarification-router.ts','modules/events/lifecycle-router.ts','modules/events/review-router.ts','modules/events/submitted-requests-router.ts','modules/events/workflow-http.ts'],
 'session':['modules/auth/router.ts'], 'tokens':['modules/auth/supabase.ts'],
 'profiles':['modules/auth/user-repository.ts','modules/auth/types.ts'],
 'queries':['modules/events/submitted-requests.ts','modules/events/event-request-detail.ts'],
 'drafts':['modules/events/create-draft.ts','modules/events/update-draft.ts','modules/events/draft-eligibility.ts','modules/events/draft-update-input.ts'],
 'submission':['modules/events/submit-request.ts','modules/events/submit-eligibility.ts','modules/events/submit-input.ts'],
 'assignment':['modules/events/assignment.ts'], 'clarification':['modules/events/clarifications.ts'],
 'review':['modules/events/review-decision.ts','modules/events/review-input.ts','modules/events/review-eligibility.ts'],
 'lifecycle':['modules/events/lifecycle.ts'], 'workflow':['modules/events/workflow-support.ts'],
 'policy':['modules/events/coordinator-access.ts'], 'notices':['modules/notifications/notify.ts']}
specs=[
 ('http','HTTP boundary<br/>[Component: Express routers]<br/>Health, JSON, role gates and errors','app.ts','export function createApp('),
 ('session','Session authentication<br/>[Component: TypeScript]<br/>Login, cookie, me and logout','modules/auth/router.ts','export async function authenticateRequest('),
 ('tokens','Token verifier<br/>[Component: jose]<br/>Local JWT verification / cached keys','modules/auth/supabase.ts','export async function verifySupabaseAccessToken('),
 ('profiles','Profile repository<br/>[Component: SQL / TypeScript]<br/>Supabase UID to app user / five roles','modules/auth/user-repository.ts','export async function findUserBySupabaseUid('),
 ('queries','Request queries<br/>[Component: TypeScript / SQL]<br/>Owned lists, queues, detail and actions','modules/events/submitted-requests.ts','export function listReviewableRequests('),
 ('drafts','Draft commands<br/>[Component: TypeScript / SQL]<br/>Create / update own DRAFT and validate','modules/events/update-draft.ts','export async function updateOwnedDraft('),
 ('submission','Submission command<br/>[Component: TypeScript / SQL]<br/>Validate saved draft and submit','modules/events/submit-request.ts','export async function submitEventRequest('),
 ('assignment','Coordinator assignment<br/>[Component: TypeScript / SQL]<br/>Triage, allocate and hand over','modules/events/assignment.ts','export async function assignCoordinator('),
 ('clarification','Clarification workflow<br/>[Component: TypeScript / SQL]<br/>Start review, ask and respond','modules/events/clarifications.ts','export async function requestClarification('),
 ('review','Initial review decision<br/>[Component: TypeScript / SQL]<br/>One approval / rejection and validation','modules/events/review-decision.ts','export async function recordInitialReview('),
 ('lifecycle','Event lifecycle<br/>[Component: TypeScript / SQL]<br/>Confirm, cancel, complete and history','modules/events/lifecycle.ts','export async function confirmEvent('),
 ('workflow','Workflow support<br/>[Component: TypeScript / SQL]<br/>Actor transaction, locks and relationships','modules/events/workflow-support.ts','export async function inActorTransaction<T>('),
 ('policy','Assignment policy<br/>[Component: TypeScript]<br/>Current assigned coordinator check','modules/events/coordinator-access.ts','export function isAssignedCoordinator('),
 ('notices','Notification writer<br/>[Component: TypeScript / SQL]<br/>In-app rows in caller transaction','modules/notifications/notify.ts','export async function notify(')]
rn3=[node('web','Web application<br/>[External container: Vue 3]<br/>Event and review pages',web),
 node('identity','Supabase Auth<br/>[External software system]<br/>Published signing keys',jwks),
 node('db','Application database<br/>[External container: PostgreSQL]<br/>Records, constraints and SQL triggers',db+pr(MIG,'CREATE TABLE notifications')),
 legend('Legend<br/>Arrows: runtime calls or SQL access<br/>Components share one API process<br/>Pure type imports are omitted<br/>No venue / equipment / attendee API<br/>No inbox API or background scheduler')]
for i,label,f,t in specs: rn3.append(node(i,label,pr(B+f,t),group='apiBoundary'))
rn3e=[
 edge('web','http','HTTP JSON /api and session cookie',rn2e[1]['proofs']),
 edge('http','session','Auth endpoints and authenticate callback',pr(B+'app.ts',"if (auth) app.use('/api/auth', createAuthRouter(auth));")+pr(B+'runtime-app.ts','authenticateRequest(pool, supabaseAuth, request)')),
 edge('session','tokens','Verify cookie or login access token',pr(AU+'router.ts','verifySupabaseAccessToken(accessToken)')),
 edge('tokens','identity','HTTPS: retrieve and cache JWKS',jwks,'Conditional JWKS fetch','HS256 secret fallback is local, without this remote call.'),
 edge('session','profiles','Resolve verified UID',pr(AU+'router.ts','findUserBySupabaseUid(database, claims.uid)')),
 edge('profiles','db','SELECT app_users by Supabase UID',pr(AU+'user-repository.ts','WHERE supabase_user_id = $1')),
 edge('http','queries','Owned lists, queue and detail reads',pr(EV+'submitted-requests-router.ts','listOwnedRequests(dependencies, actor)')),
 edge('queries','policy','Injected visibility and decision policy',pr(EV+'submitted-requests.ts','await canViewRequest(actor, row)')+pr(EV+'event-request-detail.ts','await canReviewRequest(actor, row, client)')+pr(B+'runtime-app.ts','canViewRequest: isAssignedCoordinator')),
 edge('queries','db','SELECT requests and first review',sql('event-request-detail')),
 edge('http','drafts','Create or update saved draft',pr(EV+'submitted-requests-router.ts','createDraft(dependencies,')+pr(EV+'submitted-requests-router.ts','updateOwnedDraft(dependencies,')),
 edge('drafts','db','Own transaction: INSERT / UPDATE DRAFT',sql('create-draft')+sql('update-draft')),
 edge('http','submission','Submit saved request',pr(EV+'submitted-requests-router.ts','submitEventRequest(')),
 edge('submission','db','Own transaction: lock, validate and submit',sql('submit-request')),
 edge('http','assignment','Triage, allocate and read assignment history',pr(EV+'assignment-router.ts',"from './assignment.js'")),
 edge('assignment','workflow','Transaction, lock and relationship helpers',pr(EV+'assignment.ts',"from './workflow-support.js'")),
 edge('assignment','db','Read profiles / requests; update assignment',sql('assignment')),
 edge('assignment','notices','Persist assignment notices',pr(EV+'assignment.ts','await notify(client, notifications)')),
 edge('http','clarification','Start review, ask, respond and list',pr(EV+'clarification-router.ts',"from './clarifications.js'")),
 edge('clarification','workflow','Transaction, lock and relationship helpers',pr(EV+'clarifications.ts',"from './workflow-support.js'")),
 edge('clarification','db','Read / write clarification records',sql('clarifications')),
 edge('clarification','notices','Persist clarification / review-start notices',pr(EV+'clarifications.ts','await notify(client,')),
 edge('http','review','Record initial review decision',pr(EV+'review-router.ts','recordInitialReview(')),
 edge('review','policy','Injected decision authorization',pr(EV+'review-decision.ts','await canReviewRequest(reviewer, request, client)')+pr(B+'runtime-app.ts','canReviewRequest: isAssignedCoordinator')),
 edge('review','db','Own transaction: review and status update',sql('review-decision')),
 edge('http','lifecycle','Confirm, cancel, complete and history',pr(EV+'lifecycle-router.ts',"from './lifecycle.js'")),
 edge('lifecycle','workflow','Locks, status changes and arrangement cancellation',pr(EV+'lifecycle.ts',"from './workflow-support.js'")),
 edge('lifecycle','db','Read readiness, attendees and history',sql('lifecycle')),
 edge('lifecycle','notices','Persist lifecycle notices',pr(EV+'lifecycle.ts','await notify(client, notifications)')),
 edge('workflow','policy','Resolve assigned-coordinator relation',pr(EV+'workflow-support.ts','isAssignedCoordinator(actor, event)')),
 edge('workflow','db','BEGIN / locks / status and arrangement writes',sql('workflow-support')),
 edge('notices','db','INSERT notifications in caller transaction',pr(B+'modules/notifications/notify.ts','INSERT INTO notifications')),
 edge('http','db','Readiness: SELECT scaffold_metadata',pr(B+'app.ts','SELECT key, value FROM scaffold_metadata')),
 edge('http','workflow','Workflow error / UUID helpers',pr(EV+'workflow-http.ts',"import { UUID_PATTERN, WorkflowError, type WorkflowActor } from './workflow-support.js';"))]
rb3=boundary('apiBoundary','API application - one Express / Node.js process',list(groups),pr(B+'runtime-app.ts','return createApp({')+pr(B+'server.ts','const server = app.listen('),'Code components in one process; PostgreSQL and Auth are external to this container. Routers grouped into HTTP boundary; reusable type declarations and bootstrap are catalogued separately.')
add('c3-components-reconstructed','Pre-Week 7 C3 - reconstructed from b981f11 on 6 Nov 2026','Reconstruction',rn3,rn3e,[rb3])

# Exhaustive runtime import check across the chosen backend component partition.
# Type-only imports do not express C4 runtime interactions.
mapping={B+f:g for g,files in groups.items() for f in files}
support={B+p for p in ['server.ts','runtime-app.ts','config/env.ts','db/pool.ts','db/connection.ts','modules/events/types.ts']}
backend={p for p in blobs if p.startswith(B) and p.endswith('.ts')}
assert set(mapping)|support==backend, sorted(backend-set(mapping)-support)
imports=[]
shown={(x['from'],x['to']) for x in rn3e}
for p,g in mapping.items():
    s=blob(p).decode('utf-8')
    for match in re.finditer(r'^import\s+(.*?)\s+from\s+[\'\"](.+?)[\'\"];',s,re.M|re.S):
        clause,target=match.groups()
        if clause.lstrip().startswith('type ') or not target.startswith('.'): continue
        # Imported named clauses containing only type declarations are also compile-time only.
        names=[x.strip() for x in clause.strip('{} \r\n').split(',') if x.strip()]
        if names and all(x.startswith('type ') for x in names): continue
        targetpath=(Path(p).parent/target).as_posix()
        # Resolve dot-dot segments without depending on the historical file being checked out.
        import posixpath
        targetpath=posixpath.normpath(targetpath).replace('.js','.ts')
        if targetpath in mapping and mapping[targetpath]!=g:
            pair=(g,mapping[targetpath])
            assert pair in shown, ('Missing runtime dependency',p,targetpath,pair)
            imports.append(dict(source=p,target=targetpath,component_from=g,component_to=mapping[targetpath]))
catalog=[dict(path=p,git_blob=blobs[p],sha256=H(blob(p)),lines=len(blob(p).splitlines())) for p in blobs
         if p.startswith((B,V,'database/migrations/')) or p in ['package.json','backend/package.json','frontend/package.json','frontend/vite.config.ts','docs/architecture/README.md','docs/requirements/README.md','docs/requirements/assumptions-and-questions.md','database/README.md']]
js(E/'source-catalog.json',catalog)
js(E/'source-tree.json',dict(commit=C,files=[dict(path=p,git_blob=b) for p,b in blobs.items()]))
negative=dict(id='N1',method='Full pinned Git tree plus complete mounted-router and frontend-route source inspection',
             commit=C,backend_files=sorted(backend),frontend_pages=sorted(p for p in blobs if p.startswith(V) and '/pages/' in p and p.endswith('.vue')),
             route_mounts=pr(B+'app.ts',"if (auth) app.use('/api/auth'")+pr(B+'app.ts',"createAssignmentRouter(workspace)")+pr(V+'app/router.ts','routes: ['),
             findings=['No venue, equipment or registration API module/router/page; relevant SQL schema is present.',
                       'No notification inbox router/page; only notifications/notify.ts persists in-app rows.',
                       'Five role enum values only; no Lead Coordinator or Safety Officer role and no safety/hold-expiry scheduler.',
                       'server.ts starts a single HTTP server; no background scheduling bootstrap.'],
             migration_files=sorted(p for p in blobs if p.startswith('database/migrations/')))
js(E/'negative-evidence.json',negative)
js(E/'component-map.json',dict(files=mapping,bootstrap_and_shared_types=sorted(support),runtime_imports=imports,
                            policy_injection=pr(B+'runtime-app.ts','canViewRequest: isAssignedCoordinator')+pr(B+'runtime-app.ts','canReviewRequest: isAssignedCoordinator')))
js(E/'models.json',models)

counts={k:sum(len(m[k]) for m in models) for k in ['nodes','edges','boundaries']}
js(E/'audit.json',dict(label='Pre-Week 7 customer changes - retrospective C4 audit',prepared_on='2026-11-06',
    source_commit=C,source_commit_date='2026-10-01T15:06:46+08:00',customer_change_receipt='2026-10-02',
    preparation='AI-assisted source inspection by Codex; approved design-document scope. Independent review: Not recorded.',
    original_c3='Not recorded',original_exports='Not recorded; new PNG/SVG renders prepared on 6 November',
    counts=counts,source_catalog_files=len(catalog),backend_component_files=len(mapping),
    limitations='Retrospective static code/design audit, not a historical execution or fresh live application acceptance. Planned original interactions are retained and qualified.',
    models=[dict(name=m['name'],nodes=len(m['nodes']),edges=len(m['edges']),boundaries=len(m['boundaries'])) for m in models]))

# Human-readable element ledger. Every node, edge and boundary gets its own row.
out=['# Pre-Week 7 C4 originals and retrospective audit','',
 'Prepared on **6 November 2026** from commit `'+C+'` (1 October), before receipt of the customer changes on 2 October. [Open the diagram gallery](c4-gallery.html).','',
 'The original C1/C2 Mermaid below is unchanged. Their PNG/SVG files are **new renders**, not evidence of exports made in October. The separate C1/C2/C3 reconstructions describe the pinned code and explicitly mark planned business workflows. An original C3 is **Not recorded**. The three original Markdown files and preservation manifest remain unchanged.','',
 '## Audit scope and findings','',
 '- Every displayed node, directed connection and boundary has an individual row below. Application elements have pinned code/schema anchors in [models.json](../../../scrum/sprint-03/evidence/pre-week-7-c4-audit-20261106/models.json); the three new notation legends are checked against their diagram definitions.',
 '- Original C1 described an intended first release: venue, equipment and attendee interactions were planned. The role enum and SQL schema existed, but their feature APIs/pages did not. Later prose in the old architecture document overstated implementation; the Git tree and mounted routes govern these reconstructions.',
 '- Coordinators could allocate unassigned requests and the current coordinator could hand over. No Lead Coordinator, Safety Officer, safety review or Week 7 temporary-hold scheduler existed in this snapshot.',
 '- Supabase Auth handles the browser credential exchange. Express verifies JWTs locally using cached JWKS or an optional local HS256 secret, then resolves `app_users`. No separate server session table, browser database access or per-request remote identity lookup is shown.',
 '- The database boundary is logical application ownership. Supabase hosts PostgreSQL; TLS verify-full is required for Supabase connections. Local development uses Vite 5173 with an `/api` proxy to Express 3000.',
 '- C3 groups 14 code components inside one API process. All backend source files are partitioned into those components or explicit bootstrap/shared-type support. Every cross-component runtime import and both injected assignment policies are checked; type-only imports are omitted.',
 '- Draft, submission and initial-review commands manage their own SQL transactions. Only assignment, clarification and lifecycle call the notification writer; it inserts in-app records in the caller transaction. There is no inbox API, email delivery service or notification worker in this snapshot.',
 '- This audit is static documentation work. Application suites: **Not executed**. Live integrated acceptance: **Not assessed**. Independent review: **Not recorded**.','',
 'Source inventory, absence checks, component partition, hashes, rendering checks and reproduction instructions are in [S3-E32 evidence](../../../scrum/sprint-03/evidence/pre-week-7-c4-audit-20261106/README.md).','']

def refs(proofs):
    return '<br/>'.join('['+p['path']+':'+str(p['line'])+']('+p['url']+')' for p in proofs)

for m in models:
    out += ['## '+m['title'],'',
            '**'+m['kind']+'**. '+str(len(m['nodes']))+' blocks, '+str(len(m['edges']))+' connections, '+str(len(m['boundaries']))+' boundaries. Legend blocks are counted and labelled as notation.','',
            '[SVG](c4-exports/'+m['name']+'.svg) · [PNG](c4-exports/'+m['name']+'.png) · [Mermaid source]('+Path(m['source']).relative_to(A.relative_to(R)).as_posix()+')','',
            '```mermaid', (R/m['source']).read_text(encoding='utf-8').rstrip(), '```','',
            '| Element | Label / endpoints | Assessment and qualification | Pinned source |',
            '| --- | --- | --- | --- |']
    for n in m['nodes']:
        evidence=refs(n['proofs']) if n['assessment']!='Notation' else '[Diagram definition]('+Path(m['source']).relative_to(A.relative_to(R)).as_posix()+')'
        out.append('| Node `'+n['id']+'` | '+n['label']+' | '+n['assessment']+'. '+n['note']+' | '+evidence+' |')
    for x in m['edges']:
        out.append('| Edge `'+x['id']+'` | `'+x['from']+'` → `'+x['to']+'`: '+x['label']+' | '+x['assessment']+'. '+x['note']+' | '+refs(x['proofs'])+' |')
    for b in m['boundaries']:
        out.append('| Boundary `'+b['id']+'` | '+', '.join('`'+x+'`' for x in b['members'])+' | '+b['note']+' | '+refs(b['proofs'])+' |')
    out.append('')
write(A/'c4-audit.md','\n'.join(out)+'\n')

cards=[]
for m in models:
    note='Unchanged October Mermaid; rendered 6 November. Intended-release scope includes planned features.' if m['kind']=='Original' else 'New reconstruction prepared 6 November from the 1 October code; not an original October artifact.'
    cards.append('<article id="'+m['name']+'"><h2>'+html.escape(m['title'])+'</h2><p>'+note+'</p><p><a href="c4-exports/'+m['name']+'.svg">Open full-size SVG</a> · <a href="c4-exports/'+m['name']+'.png">PNG</a> · <a href="'+Path(m['source']).relative_to(A.relative_to(R)).as_posix()+'">Mermaid</a></p><a href="c4-exports/'+m['name']+'.svg"><img src="c4-exports/'+m['name']+'.png" alt="'+html.escape(m['title'])+'"></a></article>')
write(A/'c4-gallery.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ConnectSphere - pre-Week 7 C4 diagrams</title><style>body{font:16px/1.5 Arial,sans-serif;background:#f5f7fa;color:#172033;margin:0}main{max-width:1280px;margin:auto;padding:32px 24px}h1{font-size:30px;margin:0}h2{font-size:23px}article{background:white;border:1px solid #cbd5e1;border-radius:8px;padding:24px;margin:28px 0}a{color:#1849a9}img{display:block;max-width:100%;max-height:950px;object-fit:contain;margin:auto}nav{display:flex;gap:20px;flex-wrap:wrap;margin:20px 0}a:focus-visible{outline:3px solid #2563eb;outline-offset:4px}p{max-width:1050px}</style><main><h1>Pre-Week 7 customer changes: C4 diagrams</h1><p>Source: <strong>1 October 2026 / b981f11</strong>. Exports and reconstructions prepared <strong>6 November 2026</strong>.</p><p>Two genuine original C1/C2 diagrams, followed by three separately labelled reconstructions. An original C3 is <strong>Not recorded</strong>. Venue, equipment and attendee workflows were planned: their roles/schema existed, but business APIs and pages were absent.</p><nav><a href="#c1-context-original">Original C1</a><a href="#c2-containers-original">Original C2</a><a href="#c1-context-reconstructed">Audited C1</a><a href="#c2-containers-reconstructed">Audited C2</a><a href="#c3-components-reconstructed">Audited C3</a><a href="c4-audit.md">Every-element audit</a><a href="../../exports/index.html">Current diagrams</a></nav>'+''.join(cards)+'</main></html>\n')
print(json.dumps(dict(models=len(models),**counts,runtime_imports=len(imports),catalog_files=len(catalog))))
