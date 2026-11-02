'use strict';
// Armazenamento em arquivos (servidor próprio)
const fs=require('fs'),path=require('path');
module.exports=function(dir){
  fs.mkdirSync(dir,{recursive:true});
  const F={db:path.join(dir,'db.json'),users:path.join(dir,'users.json')};
  const rd=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return d}};
  const wr=(f,o)=>{const t=f+'.tmp';fs.writeFileSync(t,JSON.stringify(o));fs.renameSync(t,f)};
  let DB=rd(F.db,{docs:{}}),U=rd(F.users,{});const T={};
  return{
    async getDoc(k){return DB.docs[k]||null},
    async putDoc(k,d){const o=DB.docs[k],v=(o?o.v:0)+1;DB.docs[k]={d,v};wr(F.db,DB);return v},
    async versions(){const o={};Object.keys(DB.docs).forEach(k=>o[k]=DB.docs[k].v);return o},
    async getUser(n){return U[n]||null},async setUser(n,u){U[n]=u;wr(F.users,U)},async delUser(n){delete U[n];wr(F.users,U)},
    async listUsers(){return Object.values(U).map(u=>({user:u.name,role:u.role}))},
    async count(ip){const t=T[ip];if(!t||Date.now()-t.t>600e3)return 0;return t.n},
    async fail(ip){const t=T[ip]&&Date.now()-T[ip].t<600e3?T[ip]:(T[ip]={n:0,t:Date.now()});t.n++},async clear(ip){delete T[ip]},
    hasUsers(){return Object.keys(U).length>0}}};
