'use strict';
// Função do Vercel: recebe todas as rotas (veja vercel.json)
const fs=require('fs'),path=require('path');
const store=require('../lib/store-upstash'),{create,mkhash}=require('../lib/app');
let ready=null,app=null;
function seed(){try{return JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','db.json'),'utf8')).docs}catch(e){return null}}
const aviso=(res,t)=>{res.writeHead(500,{'content-type':'text/html; charset=utf-8'});res.end('<meta charset="utf-8"><body style="font-family:system-ui;max-width:640px;margin:40px auto;line-height:1.5"><h2>Falta configurar o painel</h2><p>'+t+'</p>')};
module.exports=async(req,res)=>{
  const secret=process.env.SESSION_SECRET;
  if(!secret||secret.length<16)return aviso(res,'No Vercel, em <b>Settings → Environment Variables</b>, crie a variável <b>SESSION_SECRET</b> com um texto longo e aleatório (16+ caracteres) e faça um novo deploy.');
  if(!store.configured())return aviso(res,'Falta ligar o banco de dados. No Vercel, abra a aba <b>Storage</b>, crie um banco <b>Upstash Redis</b> e conecte ao projeto. Depois faça um novo deploy.');
  if(!ready)ready=store.ensureInit(seed(),process.env.ADMIN_USER,process.env.ADMIN_PASS,mkhash).catch(e=>{ready=null;throw e});
  try{await ready}catch(e){return aviso(res,'Não consegui falar com o banco de dados. Confira a conexão do Upstash na aba Storage.')}
  if(!app)app=create(store,secret);
  const u=new URL(req.url,'http://x'),p=u.searchParams.get('__p')||u.pathname;
  return app.handle(req,res,p)};
