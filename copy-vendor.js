// Copia a biblioteca de Excel (instalada pelo npm) para a pasta pública
const fs=require('fs'),path=require('path');
const src=path.join(__dirname,'..','node_modules','xlsx','dist','xlsx.full.min.js'),dst=path.join(__dirname,'..','public','vendor');
fs.mkdirSync(dst,{recursive:true});
if(fs.existsSync(src)){fs.copyFileSync(src,path.join(dst,'xlsx.full.min.js'));console.log('xlsx copiado')}else console.log('xlsx não encontrado (o painel tentará carregar da internet)');
