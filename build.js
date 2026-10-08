const fs=require('fs');const r=f=>fs.readFileSync('src/'+f,'utf8');
fs.mkdirSync('www',{recursive:true});
const h=r('index.html').replace('/*CSS*/',()=>r('style.css')).replace('/*JSPDF*/',()=>r('jspdf.umd.min.js')).replace('/*NEST*/',()=>r('nest.js')).replace('/*APP*/',()=>r('app.js'));
fs.writeFileSync('www/index.html',h);fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/ShearNesting.html',h);
console.log('built',h.length);
