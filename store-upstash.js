'use strict';
// Armazenamento no Upstash Redis (banco gratuito ligado ao Vercel). Usa só fetch, sem bibliotecas.
const URL_=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL,TOK=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
const configured=()=>!!(URL_&&TOK);
async function cmd(a){const r=await fetch(URL_,{method:'POST',headers:{Authorization:'Bearer '+TOK,'content-type':'application/json'},body:JSON.stringify(a)}),j=await r.json();if(j.error)throw new Error(j.error);return j.result}
async function pipe(a){const r=await fetch(URL_+'/pipeline',{method:'POST',headers:{Authorization:'Bearer '+TOK,'content-type':'application/json'},body:JSON.stringify(a)}),j=await r.json();if(!Array.isArray(j))throw new Error('pipeline');return j.map(x=>{if(x.error)throw new Error(x.error);return x.result})}
const DOCS='painel:docs',VER='painel:ver',USR='painel:users';
module.exports={configured,
  async getDoc(k){const s=await cmd(['HGET',DOCS,k]);return s?JSON.parse(s):null},
  async putDoc(k,d){const v=await cmd(['HINCRBY',VER,k,1]);await cmd(['HSET',DOCS,k,JSON.stringify({d,v})]);return v},
  async versions(){const a=await cmd(['HGETALL',VER]),o={};for(let i=0;i<(a||[]).length;i+=2)o[a[i]]=+a[i+1];return o},
  async getUser(n){const s=await cmd(['HGET',USR,n]);return s?JSON.parse(s):null},
  async setUser(n,u){await cmd(['HSET',USR,n,JSON.stringify(u)])},async delUser(n){await cmd(['HDEL',USR,n])},
  async listUsers(){const a=await cmd(['HGETALL',USR]),o=[];for(let i=0;i<(a||[]).length;i+=2){const u=JSON.parse(a[i+1]);o.push({user:u.name,role:u.role})}return o},
  async count(ip){return +(await cmd(['GET','painel:rl:'+ip]))||0},
  async fail(ip){await pipe([['INCR','painel:rl:'+ip],['EXPIRE','painel:rl:'+ip,600]])},async clear(ip){await cmd(['DEL','painel:rl:'+ip])},
  // primeira execução: carrega os dados iniciais e cria o primeiro controlador
  async ensureInit(seed,admin,pass,mkhash){
    if(seed&&(await cmd(['SET','painel:init','1','NX']))==='OK'){let batch=[],size=0;
      for(const k of Object.keys(seed)){const s=JSON.stringify({d:seed[k].d,v:1});batch.push(['HSET',DOCS,k,s],['HSET',VER,k,1]);size+=s.length;if(size>250000){await pipe(batch);batch=[];size=0}}
      if(batch.length)await pipe(batch)}
    if(admin&&pass&&pass.length>=6&&!(await cmd(['HLEN',USR])))await cmd(['HSET',USR,admin.toLowerCase(),JSON.stringify(Object.assign({},mkhash(pass),{role:'controlador',name:admin}))])}};
