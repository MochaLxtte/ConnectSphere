const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const ts=require(path.join(process.cwd(),'node_modules/typescript'));
const root=process.cwd();const files=new Map();
function source(file){file=path.resolve(file);if(!files.has(file))files.set(file,ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true));return files.get(file);}
function visit(node,fn){fn(node);ts.forEachChild(node,c=>visit(c,fn));}
function constants(sf,body){const m=new Map();for(const scope of [sf,body].filter(Boolean))for(const st of scope.statements||[])if(ts.isVariableStatement(st))for(const d of st.declarationList.declarations)if(ts.isIdentifier(d.name)&&d.initializer)m.set(d.name.text,d.initializer);for(const st of sf.statements)if(ts.isImportDeclaration(st)&&st.moduleSpecifier.text.startsWith('.')&&st.importClause?.namedBindings&&ts.isNamedImports(st.importClause.namedBindings)) { const f=path.resolve(path.dirname(sf.fileName),st.moduleSpecifier.text.replace(/\.js$/,'.ts')); const imported=source(f); for(const e of st.importClause.namedBindings.elements) { let init; for(const x of imported.statements)if(ts.isVariableStatement(x))for(const d of x.declarationList.declarations)if(d.name.getText(imported)===(e.propertyName?.text||e.name.text))init=d.initializer; if(init)m.set(e.name.text,init); } } return m;}
function val(n,env,seen=new Set()){
 if(!n)return undefined;if(ts.isAsExpression(n)||ts.isParenthesizedExpression(n)||ts.isSatisfiesExpression(n))return val(n.expression,env,seen);
 if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))return n.text;if(ts.isNumericLiteral(n))return Number(n.text);
 if(ts.isIdentifier(n)&&env.has(n.text)&&!seen.has(n.text))return val(env.get(n.text),env,new Set([...seen,n.text]));
 if(ts.isArrayLiteralExpression(n))return n.elements.map(e=>val(e,env,seen));
 if(ts.isObjectLiteralExpression(n)){let obj={};for(const p of n.properties){if(ts.isSpreadAssignment(p))Object.assign(obj,val(p.expression,env,seen));else if(ts.isPropertyAssignment(p))obj[p.name.text||p.name.getText()]=val(p.initializer,env,seen);else if(ts.isShorthandPropertyAssignment(p))obj[p.name.text]=val(p.name,env,seen);}return obj;}
 return undefined;
}
const app=source('backend/src/app.ts');const imports=new Map();
for(const statement of app.statements)if(ts.isImportDeclaration(statement)&&statement.importClause?.namedBindings&&ts.isNamedImports(statement.importClause.namedBindings))for(const e of statement.importClause.namedBindings.elements)imports.set(e.name.text,{file:path.resolve(path.dirname(app.fileName),statement.moduleSpecifier.text.replace(/\.js$/,'.ts')),name:e.propertyName?.text||e.name.text});
const mounts=[];const direct=[];
visit(app,n=>{if(!ts.isCallExpression(n)||!ts.isPropertyAccessExpression(n.expression)||n.expression.expression.getText(app)!=='app')return;const method=n.expression.name.text;
 if(method==='use'&&ts.isStringLiteral(n.arguments[0])&&ts.isCallExpression(n.arguments[1]))mounts.push({prefix:n.arguments[0].text,factory:n.arguments[1].expression.getText(app),line:app.getLineAndCharacterOfPosition(n.getStart(app)).line+1});
 if(['get','post','put','patch','delete'].includes(method)&&ts.isStringLiteral(n.arguments[0]))direct.push({method:method.toUpperCase(),path:n.arguments[0].text,source:'backend/src/app.ts',line:app.getLineAndCharacterOfPosition(n.getStart(app)).line+1,roles:[],access:'public',success_status:200,source_text:n.getText(app)});
});
const routes=[...direct];
for(const mount of mounts){const imported=imports.get(mount.factory);if(!imported)throw Error('Missing import '+mount.factory);const sf=source(imported.file);let factory;visit(sf,n=>{if(ts.isFunctionDeclaration(n)&&n.name?.text===imported.name)factory=n;});if(!factory)throw Error('Missing factory '+mount.factory);const env=constants(sf,factory.body);
 visit(factory.body,n=>{if(!ts.isCallExpression(n)||!ts.isPropertyAccessExpression(n.expression)||n.expression.expression.getText(sf)!=='router')return;const method=n.expression.name.text;
 if(!['get','post','put','patch','delete'].includes(method))return;
 let locals=[];if(ts.isStringLiteral(n.arguments[0]))locals=[n.arguments[0].text];
 else if(ts.isTemplateExpression(n.arguments[0])) { let loop=n.parent;while(loop&&!ts.isForOfStatement(loop))loop=loop.parent;if(!loop)throw Error('Unsupported dynamic route');const values=val(loop.expression,env);locals=values.map(v=>n.arguments[0].head.text+n.arguments[0].templateSpans.map(span=>v+span.literal.text).join('')); }
 else throw Error('Unresolved route path');
 for(const local of locals) {const text=n.getText(sf);let options,workflow;
 visit(n,x=>{if(ts.isCallExpression(x)&&x.expression.getText(sf)==='workflowRoute'){workflow=x;options=val(x.arguments[1],env);}});
 let roles=workflow?(options?.roles||[]):[...new Set([...text.matchAll(/['"](EVENT_ORGANISER|EVENT_COORDINATOR|EVENT_COORDINATOR_LEAD|VENUE_STAFF|TECHNICAL_SUPPORT_STAFF|ATTENDEE|SAFETY_OFFICER)['"]/g)].map(m=>m[1]))];
 if(workflow&&/roles:/.test(workflow.arguments[1].getText(sf))&&!options?.roles)throw Error('Unresolved explicit roles '+text);
 if(workflow&&options?.roles&&!roles.every(r=>typeof r==='string'))throw Error('Unresolved roles '+text);
 const routePath=(mount.prefix+'/'+local).replace(/\/+/g,'/').replace(/\/$/,'');
 const status=options?.successStatus||((method==='post'&&/response\.status\(201\)/.test(text))?201:200);
 const publicAuth=routePath==='/api/auth/login'||routePath==='/api/auth/logout';
 routes.push({method:method.toUpperCase(),path:routePath,factory:mount.factory,mount_line:mount.line,source:path.relative(root,sf.fileName).replaceAll('\\','/'),line:sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1,roles,access:publicAuth?'public':roles.length?'role restricted':'any mapped signed-in role',success_status:routePath==='/api/auth/logout'?204:status,options,source_text:text});
 } });
}
routes.sort((a,b)=>a.path.localeCompare(b.path)||a.method.localeCompare(b.method));
const keys=routes.map(r=>r.method+' '+r.path);if(new Set(keys).size!==keys.length)throw Error('Duplicate route');
const out=process.argv[2];const report={source_commit:'fb6d8d93f721b114accc9857a05d62e859987e23',scope:'Statically mounted Express routes; no server or database started',count:routes.length,mounts:mounts.map(m=>({...m,module:imports.get(m.factory).file})),routes,source_files:[...files].map(([file,sf])=>({path:path.relative(root,file).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}))};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
for(const r of routes)console.log([r.method,r.path,r.roles.join(',')||r.access,r.success_status,r.source+':'+r.line].join(' | '));
console.log('TOTAL '+routes.length);
