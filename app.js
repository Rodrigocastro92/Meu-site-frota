'use strict';
// Núcleo do painel: login, perfis, dados e páginas. Usado pelo servidor local e pelo Vercel.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const APP=path.join(__dirname,'..','app'),VEND=path.join(__dirname,'..','public','vendor');
const ROLES=['controlador','cliente'],LVL={cliente:1,controlador:3};
const RULES={painel:{read:1,write:3},laudos:{read:1,write:3},privado:{read:3,write:3}};
const mkhash=p=>{const salt=crypto.randomBytes(16).toString('hex');return{salt,h:crypto.scryptSync(p,salt,64).toString('hex')}};
const okpass=(p,u)=>{try{return crypto.timingSafeEqual(crypto.scryptSync(p,u.salt,64),Buffer.from(u.h,'hex'))}catch(e){return false}};
function create(store,secret){
  const sign=p=>crypto.createHmac('sha256',secret).update(p).digest('base64url');
  const cookie=(u,secure)=>{const p=Buffer.from(JSON.stringify({u:u.name,r:u.role,e:Date.now()+12*3600e3})).toString('base64url');return 'sid='+p+'.'+sign(p)+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200'+(secure?'; Secure':'')};
  const session=req=>{const m=(req.headers.cookie||'').match(/(?:^|;\s*)sid=([^;]+)/);if(!m)return null;const [p,s]=m[1].split('.');if(!p||!s)return null;
    try{if(!crypto.timingSafeEqual(Buffer.from(sign(p)),Buffer.from(s)))return null;const o=JSON.parse(Buffer.from(p,'base64url').toString());if(o.e<Date.now()||!LVL[o.r])return null;return{user:o.u,role:o.r}}catch(e){return null}};
  const send=(res,code,obj,h)=>{const str=typeof obj==='string';res.writeHead(code,Object.assign({'content-type':str?'text/plain; charset=utf-8':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'},h||{}));res.end(str?obj:JSON.stringify(obj))};
  const body=req=>new Promise((ok,er)=>{if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))return ok(req.body);if(typeof req.body==='string'){try{return ok(JSON.parse(req.body||'{}'))}catch(e){return er(e)}}const c=[];let n=0;req.on('data',d=>{n+=d.length;if(n>4e6){er(new Error('grande'));req.destroy()}else c.push(d)});req.on('end',()=>{try{ok(JSON.parse(Buffer.concat(c).toString()||'{}'))}catch(e){er(e)}});req.on('error',er)});
  const page=(res,f)=>{try{const b=fs.readFileSync(path.join(APP,f));res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(b)}catch(e){send(res,404,'Não encontrado')}};
  async function handle(req,res,p){
    const ses=session(req),sec=(req.headers['x-forwarded-proto']||'')==='https',ip=String(req.headers['x-forwarded-for']||(req.socket&&req.socket.remoteAddress)||'').split(',')[0].trim();
    try{
      if(p==='/health')return send(res,200,{ok:true});
      if(p==='/api/login'&&req.method==='POST'){
        if(await store.count(ip)>=8)return send(res,429,{erro:'Muitas tentativas. Aguarde alguns minutos.'});
        const b=await body(req),u=await store.getUser(String(b.user||'').toLowerCase());
        if(!u||!okpass(String(b.pass||''),u)){await store.fail(ip);return send(res,401,{erro:'Usuário ou senha incorretos.'})}
        await store.clear(ip);return send(res,200,{user:u.name,role:u.role},{'set-cookie':cookie(u,sec)})}
      if(p==='/api/logout')return send(res,200,{ok:true},{'set-cookie':'sid=; Path=/; Max-Age=0'});
      if(p==='/api/me'){if(!ses)return send(res,401,{erro:'login'});const u=await store.getUser(ses.user.toLowerCase());if(!u)return send(res,401,{erro:'login'});return send(res,200,{user:u.name,role:u.role},{'set-cookie':cookie(u,sec)})}
      if(p==='/api/versions'){if(!ses)return send(res,401,{erro:'login'});const v=await store.versions(),L=LVL[ses.role],o={};Object.keys(v).forEach(k=>{const r=RULES[k.split('/')[0]];if(r&&L>=r.read)o[k]=v[k]});return send(res,200,o)}
      if(p.startsWith('/api/db/')){
        if(!ses)return send(res,401,{erro:'login'});
        const m=p.slice(8).match(/^([A-Za-z0-9_-]{1,60})\/([A-Za-z0-9_-]{1,60})$/);if(!m)return send(res,400,{erro:'caminho'});
        const rule=RULES[m[1]],L=LVL[ses.role],key=m[1]+'/'+m[2];if(!rule)return send(res,403,{erro:'sem acesso'});
        if(req.method==='GET'){if(L<rule.read)return send(res,403,{erro:'sem acesso'});const d=await store.getDoc(key);return send(res,200,d?{exists:true,data:d.d,v:d.v}:{exists:false,v:0})}
        if(req.method==='PUT'){if(L<rule.write)return send(res,403,{erro:'sem acesso'});const d=await body(req);return send(res,200,{v:await store.putDoc(key,d)})}
        return send(res,405,{erro:'método'})}
      if(p==='/api/users'){
        if(!ses||ses.role!=='controlador')return send(res,403,{erro:'sem acesso'});
        if(req.method==='GET')return send(res,200,await store.listUsers());
        if(req.method==='POST'){const b=await body(req),n=String(b.user||'').trim();if(!n||String(b.pass||'').length<6||!ROLES.includes(b.role))return send(res,400,{erro:'Informe nome, senha com 6+ caracteres e o perfil.'});await store.setUser(n.toLowerCase(),Object.assign({},mkhash(String(b.pass)),{role:b.role,name:n}));return send(res,200,{ok:true})}
        if(req.method==='DELETE'){const b=await body(req),n=String(b.user||'').toLowerCase();if(n===ses.user.toLowerCase())return send(res,400,{erro:'Você não pode remover o próprio usuário.'});await store.delUser(n);return send(res,200,{ok:true})}}
      if(p.startsWith('/api/'))return send(res,404,{erro:'rota'});
      if(p==='/'||p==='/index.html')return page(res,ses?'index.html':'login.html');
      if(p==='/login'||p==='/login.html')return page(res,'login.html');
      if(p.startsWith('/vendor/')){const f=path.normalize(path.join(VEND,p.slice(8)));if(f.startsWith(VEND)&&fs.existsSync(f)){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'public, max-age=86400'});return fs.createReadStream(f).pipe(res)}}
      return send(res,404,'Não encontrado');
    }catch(e){send(res,500,{erro:'falha interna'})}
  }
  return{handle}}
module.exports={create,mkhash,ROLES};
