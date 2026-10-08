(function(){
var $=function(i){return document.getElementById(i)};
var COLORS=['#4e9af1','#f2a541','#6cc38a','#d97ab5','#9b8cf0','#e4725f','#5cc2c9','#c2b24a'];
var last=null;
function store(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function load(k){try{return localStorage.getItem(k)}catch(e){return null}}
function f2(v){return (Math.round(v*100)/100).toString()}
function unit(){return $('unit').value}
function toMM(v){return unit()==='in'?v*25.4:v}
function fromMM(v){return unit()==='in'?v/25.4:v}
function area2(a){return unit()==='in'?f2(a)+' sq in':f2(a)+' sq mm'}
function other(v){return unit()==='in'?f2(v*25.4)+' mm':f2(v/25.4)+' in'}
function addRow(box,kind,o){
  o=o||{};var d=document.createElement('div');d.className='row';
  d.innerHTML='<input class="n" placeholder="Name" value="'+(o.name||'')+'"><input class="d" type="number" step="any" inputmode="decimal" value="'+(o.w==null?'':o.w)+'"><input class="d" type="number" step="any" inputmode="decimal" value="'+(o.h==null?'':o.h)+'"><input class="q" type="number" step="1" inputmode="numeric" value="'+(o.qty==null?1:o.qty)+'"><button class="x" title="Remove">&times;</button>';
  d.querySelector('.x').onclick=function(){d.remove()};
  $(box).appendChild(d);
}
function rows(box){
  var out=[];[].forEach.call($(box).children,function(d){
    var i=d.querySelectorAll('input');var w=parseFloat(i[1].value),h=parseFloat(i[2].value),q=parseInt(i[3].value,10);
    if(w>0&&h>0&&q>0)out.push({name:i[0].value||('Item '+(out.length+1)),w:w,h:h,qty:q});
  });return out;
}
function setRows(box,list){$(box).innerHTML='';list.forEach(function(o){addRow(box,box,o)})}
function example(){
  $('unit').value='in';$('gap').value=0;$('minr').value=1;$('thk').value=0.09;$('den').value=2.81;$('rot').value='1';
  setRows('rms',[{name:'RM1',w:64,h:47.4,qty:1},{name:'RM2',w:19,h:3.5,qty:1},{name:'RM3',w:28,h:4,qty:1}]);
  setRows('parts',[{name:'Part A 4x4',w:4,h:4,qty:15},{name:'Part B 3.5x1.8',w:3.5,h:1.8,qty:60}]);
}
function save(){
  store('nest.state',JSON.stringify({unit:unit(),gap:$('gap').value,minr:$('minr').value,thk:$('thk').value,den:$('den').value,rot:$('rot').value,rms:rows('rms'),parts:rows('parts')}));
}
function restore(){
  var s=load('nest.state');if(!s)return false;
  try{s=JSON.parse(s);$('unit').value=s.unit;$('gap').value=s.gap;$('minr').value=s.minr;$('thk').value=s.thk;$('den').value=s.den;$('rot').value=s.rot;setRows('rms',s.rms);setRows('parts',s.parts);return true}catch(e){return false}
}
var prevUnit='in';
$('unit').onchange=function(){
  var nu=unit(),k=nu==='mm'?25.4:1/25.4,self=this;
  if(nu===prevUnit)return;
  function cv(list){return list.map(function(o){return {name:o.name,w:+(o.w*k).toFixed(3),h:+(o.h*k).toFixed(3),qty:o.qty}})}
  var rm=rows('rms'),pt=rows('parts');
  ['gap','minr','thk'].forEach(function(id){var v=parseFloat($(id).value);if(v)$(id).value=+(v*k).toFixed(4)});
  // rows() reads current numbers (still old unit): convert
  setRows('rms',cv(rm));setRows('parts',cv(pt));prevUnit=nu;
};
function svgFor(s,u){
  var pad=Math.max(s.w,s.h)*0.02,sw=Math.max(s.w,s.h)/700,fs=Math.max(s.w,s.h)/45;
  var W=s.w+pad*2,H=s.h+pad*2+fs*1.5;
  var g='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'"><defs><pattern id="h'+s.idx+'" width="'+fs*0.5+'" height="'+fs*0.5+'" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="'+fs*0.5+'" stroke="#9aa5b1" stroke-width="'+sw*1.2+'"/></pattern></defs>';
  g+='<g transform="translate('+pad+','+pad+')">';
  // y axis: origin at bottom-left, so flip
  var Y=function(y,h){return s.h-y-h};
  g+='<rect width="'+s.w+'" height="'+s.h+'" fill="#fff" stroke="#222" stroke-width="'+sw*2+'"/>';
  s.free.forEach(function(r){g+='<rect x="'+r.x+'" y="'+Y(r.y,r.h)+'" width="'+r.w+'" height="'+r.h+'" fill="url(#h'+s.idx+')" stroke="#9aa5b1" stroke-width="'+sw+'"/>'});
  s.blocks.forEach(function(b){
    var c=COLORS[b.pid%COLORS.length];
    b.cells.forEach(function(q){g+='<rect x="'+q.x+'" y="'+Y(q.y,q.h)+'" width="'+q.w+'" height="'+q.h+'" fill="'+c+'" stroke="#123" stroke-width="'+sw+'"/>'});
    var q=b.cells[0];if(q.w>fs*1.6&&q.h>fs*1.2)g+='<text x="'+(b.x+b.w/2)+'" y="'+(Y(b.y,b.h)+b.h/2+fs*0.35)+'" font-size="'+fs+'" text-anchor="middle" fill="#fff" stroke="#0007" stroke-width="'+sw*0.5+'">'+b.cols*b.rows+' x '+esc(b.part.split(' ')[0]+(b.part.split(' ')[1]?' '+b.part.split(' ')[1]:''))+'</text>';
  });
  s.cuts.forEach(function(c){
    var x1,y1,x2,y2;
    if(c.dir==='V'){x1=x2=c.pos;y1=Y(c.from,0);y2=Y(c.to,0)}else{y1=y2=Y(c.pos,0);x1=c.from;x2=c.to}
    g+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#d62828" stroke-width="'+sw*1.3+'" stroke-dasharray="'+fs*0.4+' '+fs*0.25+'"/>';
    if(s.cuts.length<=25){g+='<circle cx="'+x1+'" cy="'+y1+'" r="'+fs*0.55+'" fill="#d62828"/><text x="'+x1+'" y="'+(y1+fs*0.22)+'" font-size="'+fs*0.6+'" text-anchor="middle" fill="#fff">'+c.n+'</text>'}
  });
  g+='<text x="0" y="'+(s.h+fs*1.3)+'" font-size="'+fs+'" fill="#222">'+esc(s.name)+': '+f2(s.w)+' x '+f2(s.h)+' '+u+'</text></g></svg>';
  return g;
}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function run(){
  save();
  var rm=rows('rms'),pt=rows('parts');
  if(!rm.length||!pt.length){$('out').innerHTML='<div class="card warn">Add at least one RM piece and one part.</div>';return}
  var r=Nest.nest({rms:rm,parts:pt,gap:parseFloat($('gap').value)||0,allowRotate:$('rot').value==='1',minReuse:parseFloat($('minr').value)||0});
  r.sheets.forEach(function(s,i){s.idx=i});
  last=r;var u=unit();var T=r.totals;
  var thkmm=toMM(parseFloat($('thk').value)||0),den=parseFloat($('den').value)||0;
  function kg(a){var mm2=unit()==='in'?a*645.16:a;return mm2*thkmm/1000*den/1000}
  var h='<div class="card"><h2>Summary</h2><div class="kpi"><div><b>'+area2(T.rm)+'</b><span>RM total</span></div><div><b>'+area2(T.parts)+'</b><span>Parts</span></div><div><b>'+area2(T.waste)+'</b><span>Waste ('+f2(100-T.util)+'%)</span></div><div><b>'+f2(T.util)+'%</b><span>Utilisation</span></div><div><b>'+area2(T.reusable)+'</b><span>Reusable offcuts</span></div><div><b>'+area2(T.scrap)+'</b><span>True scrap</span></div></div>';
  if(thkmm&&den)h+='<p><small>Weight: RM '+f2(kg(T.rm))+' kg, parts '+f2(kg(T.parts))+' kg, waste '+f2(kg(T.waste))+' kg. Shear cuts: '+T.cuts+'.</small></p>';
  if(r.unplaced.length)h+='<p class="warn">Could not place: '+r.unplaced.map(function(x){return x.qty+' x '+esc(x.name)}).join(', ')+'</p>';else h+='<p class="ok">All parts placed.</p>';
  h+='<table><tr><th>Part</th><th>Size</th><th>Need</th><th>Placed</th></tr>'+r.parts.map(function(p){return '<tr><td>'+esc(p.name)+'</td><td>'+f2(p.w)+' x '+f2(p.h)+'</td><td>'+p.qty+'</td><td>'+p.placed+'</td></tr>'}).join('')+'</table></div>';
  r.sheets.forEach(function(s){
    h+='<div class="card"><h2>'+esc(s.name)+' <small>'+f2(s.w)+' x '+f2(s.h)+' '+u+' ('+other(s.w)+' x '+other(s.h)+')</small></h2><div class="svgw">'+svgFor(s,u)+'</div>';
    h+='<p><small>Layout: '+s.blocks.map(function(b){return b.cols*b.rows+' x '+esc(b.part)+' ('+b.cols+' x '+b.rows+(b.rot?', rotated':'')+')'}).join('; ')+'<br>Parts '+area2(s.partsArea)+', waste '+area2(s.waste)+' (reusable '+area2(s.reusable)+', scrap '+area2(s.scrap)+'), '+s.cuts.length+' cuts.</small></p>';
    h+='<details><summary>Cut sequence ('+s.cuts.length+')</summary><ol class="cuts">'+s.cuts.map(function(c){return '<li>'+(c.dir==='V'?'Vertical':'Horizontal')+' cut at '+f2(c.pos)+' '+u+' ('+f2(c.from)+' to '+f2(c.to)+'): '+esc(c.why)+'</li>'}).join('')+'</ol></details></div>';
  });
  $('out').innerHTML=h;
}
function pdf(){
  if(!last){run();if(!last)return}
  var J=window.jspdf.jsPDF;var d=new J({unit:'mm',format:'a4',orientation:'portrait'});var u=unit();var T=last.totals;
  d.setFontSize(15);d.text('Shear Nesting Report',12,14);d.setFontSize(9);
  var y=21;function ln(t){d.text(t,12,y);y+=5}
  ln('Unit: '+u+'   Gap: '+$('gap').value+'   Rotation: '+($('rot').value==='1'?'allowed':'off'));
  ln('RM total '+area2(T.rm)+'  |  Parts '+area2(T.parts)+'  |  Waste '+area2(T.waste)+' ('+f2(100-T.util)+'%)');
  ln('Reusable offcuts '+area2(T.reusable)+'  |  True scrap '+area2(T.scrap)+'  |  Cuts '+T.cuts);
  last.parts.forEach(function(p){ln('  '+p.name+' '+f2(p.w)+' x '+f2(p.h)+': need '+p.qty+', placed '+p.placed)});
  if(last.unplaced.length)ln('NOT PLACED: '+last.unplaced.map(function(x){return x.qty+' x '+x.name}).join(', '));
  last.sheets.forEach(function(s){
    d.addPage();d.setFontSize(12);d.text(s.name+'  '+f2(s.w)+' x '+f2(s.h)+' '+u+'  ('+other(s.w)+' x '+other(s.h)+')',12,14);
    var maxW=186,maxH=170,k=Math.min(maxW/s.w,maxH/s.h),ox=12,oy=22;
    var Y=function(yy,h){return oy+(s.h-yy-h)*k};
    d.setLineWidth(0.3);d.setDrawColor(40);d.rect(ox,oy,s.w*k,s.h*k);
    s.free.forEach(function(r){d.setFillColor(225,229,234);d.setDrawColor(150);d.rect(ox+r.x*k,Y(r.y,r.h),r.w*k,r.h*k,'FD')});
    s.blocks.forEach(function(b){var c=COLORS[b.pid%COLORS.length];var rgb=[1,3,5].map(function(i){return parseInt(c.substr(i,2),16)});d.setFillColor(rgb[0],rgb[1],rgb[2]);d.setDrawColor(20);d.setLineWidth(0.1);
      b.cells.forEach(function(q){d.rect(ox+q.x*k,Y(q.y,q.h),q.w*k,q.h*k,'FD')})});
    d.setDrawColor(214,40,40);d.setLineWidth(0.25);d.setLineDashPattern([1.2,0.8],0);
    s.cuts.forEach(function(c){var x1,y1,x2,y2;if(c.dir==='V'){x1=x2=ox+c.pos*k;y1=Y(c.from,0);y2=Y(c.to,0)}else{y1=y2=Y(c.pos,0);x1=ox+c.from*k;x2=ox+c.to*k}d.line(x1,y1,x2,y2)});
    d.setLineDashPattern([],0);
    var yy=oy+s.h*k+8;d.setFontSize(9);d.text('Parts '+area2(s.partsArea)+', waste '+area2(s.waste)+' (reusable '+area2(s.reusable)+', scrap '+area2(s.scrap)+'), '+s.cuts.length+' cuts',12,yy);yy+=5;
    s.blocks.forEach(function(b){if(yy<285){d.text(b.cols*b.rows+' x '+b.part+' ('+b.cols+' x '+b.rows+(b.rot?', rotated':'')+') at x='+f2(b.x)+', y='+f2(b.y),12,yy);yy+=4.5}});
    d.addPage();d.setFontSize(12);d.text(s.name+' cut sequence',12,14);d.setFontSize(8);var cy=21;
    s.cuts.forEach(function(c){if(cy>285){d.addPage();cy=14}d.text(c.n+'. '+(c.dir==='V'?'Vertical':'Horizontal')+' at '+f2(c.pos)+' ('+f2(c.from)+' to '+f2(c.to)+') '+c.why,12,cy);cy+=4})
  });
  var name='Nesting_'+new Date().toISOString().slice(0,10)+'.pdf';
  var C=window.Capacitor;
  if(C&&C.Plugins&&C.Plugins.Filesystem&&C.isNativePlatform&&C.isNativePlatform()){
    var b64=d.output('datauristring').split(',')[1];
    C.Plugins.Filesystem.writeFile({path:name,data:b64,directory:'CACHE'}).then(function(r){return C.Plugins.Share.share({title:name,url:r.uri})}).catch(function(e){alert('PDF share failed: '+(e&&e.message||e))});
  }else d.save(name);
}
$('addrm').onclick=function(){addRow('rms','rms')};$('addpart').onclick=function(){addRow('parts','parts')};
$('run').onclick=run;$('ex').onclick=function(){example();prevUnit='in';run()};$('pdf').onclick=pdf;
['gap','minr','thk','den','rot'].forEach(function(i){$(i).onchange=save});
if(!restore())example();
prevUnit=unit();
if(/demo=1/.test(location.search))run();
window.__run=run;
})();
