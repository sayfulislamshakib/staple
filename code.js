// Staple — Component Management Plugin for Figma
// State-preserving linking (no Settings UI). Conservative JS for Figma's VM.

// ----------------- config -----------------
var CFG_KEY = 'staple/config';
var TARGET_KEY = 'staple/target';

var DEFAULT_CFG = {
  strict: false,        // strict = exact structure (type+order+names); loose = wrapper-agnostic + partial copy
  dryRun: false,        // no changes; summary only
  excludeRegex: '',
  unlockTemporarily: false,
  copy: {
    text: true, fills: true, strokes: true, effects: true,
    corners: true, layout: true, constraints: true, visibilityOpacity: true
  },
  // Fixed aliases. Edit here if needed.
  nameAliases: [
    ["title","label","heading"],
    ["desc","subtitle","description"]
  ]
};

async function loadCfg() {
  try {
    var c = await figma.clientStorage.getAsync(CFG_KEY);
    if (!c) return DEFAULT_CFG;
    var cfg = JSON.parse(JSON.stringify(DEFAULT_CFG));
    for (var k in c) cfg[k] = c[k];
    if (!cfg.copy) cfg.copy = JSON.parse(JSON.stringify(DEFAULT_CFG.copy));
    if (!cfg.nameAliases) cfg.nameAliases = DEFAULT_CFG.nameAliases;
    return cfg;
  } catch (e) { return DEFAULT_CFG; }
}
async function saveCfg(cfg) { try { await figma.clientStorage.setAsync(CFG_KEY, cfg || DEFAULT_CFG); } catch (e) {} }

async function saveTarget(obj) { try { await figma.clientStorage.setAsync(TARGET_KEY, obj ? obj : null); } catch (e) {} }
async function getTarget() { try { var v = await figma.clientStorage.getAsync(TARGET_KEY); return v ? v : null; } catch (e) { return null; } }

// ----------------- utils -----------------
function notifyError(e){ var m=(e && e.message)?e.message:String(e); figma.notify('Error: '+m,{error:true}); }
function note(msg){ figma.notify(msg); }

function absoluteXY(n){ var m=n.absoluteTransform; return {x:m[0][2], y:m[1][2]}; }
function resizeNode(n,w,h){ try{ if(typeof n.resize==='function') n.resize(w,h); else if(typeof n.resizeWithoutConstraints==='function') n.resizeWithoutConstraints(w,h);}catch(e){} }
function hasAncestorInstance(n){ var p=n.parent; while(p){ if(p.type==='INSTANCE') return true; p=p.parent; } return false; }
function isAttachable(n){ return !['COMPONENT','COMPONENT_SET','INSTANCE','SLICE','STICKY','SHAPE_WITH_TEXT','PAGE','SECTION'].includes(n.type); }
function deepClone(v){ try{ return JSON.parse(JSON.stringify(v)); }catch(e){ return v; } }

// ----------------- name aliasing -----------------
function norm(s){ return (s||'').toLowerCase().replace(/\s+/g,' ').trim(); }
function namesEquivalent(a,b,cfg){
  a = norm(a); b = norm(b);
  if (a===b) return true;
  var groups = cfg.nameAliases || [];
  for (var i=0;i<groups.length;i++){
    var g = groups[i], A=false, B=false;
    for (var j=0;j<g.length;j++){
      var v = norm(g[j]);
      if (v===a) A=true;
      if (v===b) B=true;
    }
    if (A && B) return true;
  }
  return false;
}

// ----------------- wrappers -----------------
function isWrapper(n){ return (n && (n.type==='FRAME' || n.type==='GROUP') && 'children' in n && n.children && n.children.length===1); }
function unwrap(n){ var cur=n; while(isWrapper(cur)) cur=cur.children[0]; return cur; }
function childList(n, loose){
  if (!('children' in n) || !n.children) return [];
  var out=[]; for (var i=0;i<n.children.length;i++){ var ch=n.children[i]; out.push(loose ? unwrap(ch) : ch); }
  return out;
}

// ----------------- structure checks -----------------
function structuresStrict(aRoot, bRoot, cfg){
  function walk(a,b){
    var ac = childList(a, false), bc = childList(b, false);
    if (ac.length !== bc.length) return false;
    for (var i=0;i<ac.length;i++){
      var an=ac[i], bn=bc[i];
      if (an.type !== bn.type) return false;
      if (!namesEquivalent(an.name||'', bn.name||'', cfg)) return false;
      if (!walk(an,bn)) return false;
    }
    return true;
  }
  return walk(aRoot,bRoot);
}
function structuresLoose(aRoot, bRoot){
  function walk(a,b){
    var ac = childList(a, true), bc = childList(b, true);
    if (ac.length !== bc.length) return false;
    for (var i=0;i<ac.length;i++){
      var an=ac[i], bn=bc[i];
      if (an.type !== bn.type) return false;
      if (!walk(an,bn)) return false;
    }
    return true;
  }
  return walk(aRoot,bRoot);
}

// For partial copy we align by order+type (loose), ignoring names and wrappers
function alignedPairs(aRoot, bRoot){
  var pairs=[];
  function walk(a,b){
    var ac=childList(a,true), bc=childList(b,true);
    var len=Math.min(ac.length, bc.length);
    for (var i=0;i<len;i++){
      var an=ac[i], bn=bc[i];
      if (an.type===bn.type){ pairs.push([an,bn]); walk(an,bn); }
    }
  }
  walk(aRoot,bRoot);
  return pairs;
}


// ----------------- overrides -----------------
async function loadFontsForText(n){
  try{
    var len=n.characters ? n.characters.length : 0;
    var fns=n.getRangeAllFontNames(0,len);
    for (var i=0;i<fns.length;i++){ try{ await figma.loadFontAsync(fns[i]); }catch(e){} }
  }catch(e){}
}

async function copyOverrides(fromNode, toNode, cfg){
  var touched=0, c=cfg.copy;

  if (c.text && fromNode.type==='TEXT' && toNode.type==='TEXT'){
    try{ await loadFontsForText(toNode); toNode.characters=fromNode.characters; touched++; }catch(e){}
  }

  if (c.visibilityOpacity){
    try{ if('visible'in toNode && 'visible'in fromNode){ toNode.visible=fromNode.visible; touched++; } }catch(e){}
    try{ if('opacity'in toNode && 'opacity'in fromNode){ toNode.opacity=fromNode.opacity; touched++; } }catch(e){}
  }

  if (c.fills){ try{ if('fills'in toNode && 'fills'in fromNode){ toNode.fills=deepClone(fromNode.fills); touched++; } }catch(e){} }
  if (c.strokes){
    try{ if('strokes'in toNode && 'strokes'in fromNode){ toNode.strokes=deepClone(fromNode.strokes); touched++; } }catch(e){}
    try{ if('strokeWeight'in toNode && 'strokeWeight'in fromNode){ toNode.strokeWeight=fromNode.strokeWeight; touched++; } }catch(e){}
  }
  if (c.effects){ try{ if('effects'in toNode && 'effects'in fromNode){ toNode.effects=deepClone(fromNode.effects); touched++; } }catch(e){} }

  if (c.corners){
    try{ if('cornerRadius'in toNode && 'cornerRadius'in fromNode){ toNode.cornerRadius=fromNode.cornerRadius; touched++; } }catch(e){}
    try{ if('cornerSmoothing'in toNode && 'cornerSmoothing'in fromNode){ toNode.cornerSmoothing=fromNode.cornerSmoothing; touched++; } }catch(e){}
  }

  if (c.constraints){ try{ if('constraints'in toNode && 'constraints'in fromNode){ toNode.constraints=deepClone(fromNode.constraints); touched++; } }catch(e){} }

  if (c.layout && toNode.type==='FRAME' && fromNode.type==='FRAME'){
    try{ toNode.layoutMode = fromNode.layoutMode; touched++; }catch(e){}
    try{ toNode.itemSpacing = fromNode.itemSpacing; touched++; }catch(e){}
    try{ toNode.paddingLeft = fromNode.paddingLeft; touched++; }catch(e){}
    try{ toNode.paddingRight = fromNode.paddingRight; touched++; }catch(e){}
    try{ toNode.paddingTop = fromNode.paddingTop; touched++; }catch(e){}
    try{ toNode.paddingBottom = fromNode.paddingBottom; touched++; }catch(e){}
    try{ toNode.primaryAxisAlignItems = fromNode.primaryAxisAlignItems; touched++; }catch(e){}
    try{ toNode.counterAxisAlignItems = fromNode.counterAxisAlignItems; touched++; }catch(e){}
  }

  return touched;
}

async function copyTreeStrict(fromRoot, toRoot, cfg){
  async function walk(a,b){
    var ac=childList(a,false), bc=childList(b,false);
    for (var i=0;i<ac.length;i++){
      await copyOverrides(ac[i], bc[i], cfg);
      await walk(ac[i], bc[i]);
    }
  }
  await walk(fromRoot,toRoot);
}
async function copyTreeLoosePartial(fromRoot, toRoot, cfg){
  var pairs=alignedPairs(fromRoot,toRoot);
  var changed=0;
  for (var i=0;i<pairs.length;i++){
    changed += await copyOverrides(pairs[i][0], pairs[i][1], cfg);
  }
  return changed;
}

// ----------------- create component (unchanged) -----------------
async function createComponentFromSelection(){
  var sel=figma.currentPage.selection;
  if(!sel.length){ note('Select one or more layers first.'); return; }

  if (sel.length===1 && sel[0].type==='FRAME'){
    var frame=sel[0], parent=frame.parent||figma.currentPage, idx=parent.children.indexOf(frame);
    var fAbs=absoluteXY(frame);
    var comp=figma.createComponent(); comp.name=frame.name||'Component';

    var props=['fills','strokes','strokeWeight','strokeAlign','strokeCap','strokeJoin','strokeDashes','strokeGeometry','strokeMiterLimit','effects','backgrounds','cornerRadius','cornerSmoothing','paddingLeft','paddingRight','paddingTop','paddingBottom','itemSpacing','layoutMode','clipsContent','primaryAxisSizingMode','counterAxisSizingMode','primaryAxisAlignItems','counterAxisAlignItems','layoutGrids','gridStyleId'];
    for (var i=0;i<props.length;i++){ var p=props[i]; if(p in frame){ try{ var v=frame[p]; comp[p]=(Array.isArray(v)||(typeof v==='object'&&v!==null))?JSON.parse(JSON.stringify(v)):v; }catch(e){} } }

    parent.insertChild(Math.max(0,idx),comp); resizeNode(comp,frame.width,frame.height); comp.x=fAbs.x; comp.y=fAbs.y;
    var kids=frame.children.slice();
    for (var k=0;k<kids.length;k++){ var ch=kids[k]; var a=absoluteXY(ch); comp.appendChild(ch); ch.x=a.x-fAbs.x; ch.y=a.y-fAbs.y; }
    frame.remove();

    var inst=comp.createInstance(); parent.insertChild(Math.max(0,idx),inst);
    inst.x=fAbs.x; inst.y=fAbs.y; resizeNode(inst,comp.width,comp.height);
    comp.x+=40; comp.y+=40;
    figma.currentPage.selection=[inst];
    note('Created component + replaced selection with instance.');
    return;
  }

  var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (var j=0;j<sel.length;j++){ var n=sel[j]; var p2=absoluteXY(n); if(p2.x<minX)minX=p2.x; if(p2.y<minY)minY=p2.y; if(p2.x+n.width>maxX)maxX=p2.x+n.width; if(p2.y+n.height>maxY)maxY=p2.y+n.height; }
  var w=Math.max(1,maxX-minX), h=Math.max(1,maxY-minY);
  var first=sel[0], parent2=first.parent||figma.currentPage, idx2=parent2.children.indexOf(first);

  var comp2=figma.createComponent(); comp2.name='Component';
  parent2.insertChild(Math.max(0,idx2+1),comp2); comp2.x=minX+40; comp2.y=minY+40; resizeNode(comp2,w,h);
  for (var t=0;t<sel.length;t++){ var n2=sel[t]; try{ var c=n2.clone(); var a2=absoluteXY(n2); comp2.appendChild(c); c.x=a2.x-minX; c.y=a2.y-minY; }catch(e){} }
  var inst2=comp2.createInstance(); parent2.insertChild(Math.max(0,idx2),inst2);
  inst2.x=minX; inst2.y=minY; resizeNode(inst2,w,h);
  for (var r=0;r<sel.length;r++){ try{ sel[r].remove(); }catch(e){} }
  figma.currentPage.selection=[inst2];
  note('Created component + replaced selection with instance.');
}

// ----------------- pick target -----------------
async function pickTargetFromSelection(sel){
  for (var i=0;i<sel.length;i++) if (sel[i].type==='COMPONENT') return sel[i];
  for (var j=0;j<sel.length;j++){ var n=sel[j]; if(n.type==='INSTANCE'){ try{ var mc=await n.getMainComponentAsync(); if(mc) return mc; }catch(e){} } }
  for (var k=0;k<sel.length;k++){ var n2=sel[k]; if(n2.type==='COMPONENT_SET'){ for (var m=0;m<n2.children.length;m++){ var c=n2.children[m]; if(c.type==='COMPONENT') return c; } } }
  return null;
}
async function pickTarget(){
  var sel=figma.currentPage.selection;
  if(!sel.length){ note('Select a component / instance to pick.'); return; }
  var comp=await pickTargetFromSelection(sel);
  if(!comp){ note('Pick a Component/Variant or an Instance of it.'); return; }
  await saveTarget({ nodeId: comp.id, key: comp.key || null, name: comp.name });
  note('Picked target: ' + comp.name);
}

// ----------------- variant choice -----------------
function pickClosestVariant(componentNode, w, h){
  if (componentNode.type==='COMPONENT') return componentNode;
  var set = componentNode, best=null, score=1e15;
  for (var i=0;i<set.children.length;i++){
    var v=set.children[i]; if(v.type!=='COMPONENT') continue;
    var s=Math.abs(v.width-w)+Math.abs(v.height-h);
    if (s<score){ score=s; best=v; }
  }
  if (best) return best;
  for (var j=0;j<set.children.length;j++){ if (set.children[j].type==='COMPONENT') return set.children[j]; }
  return null;
}

// ----------------- link (dry-run + strict/loose + partial) -----------------
async function linkToTarget(){
  var cfg = await loadCfg();

  var sel=figma.currentPage.selection;
  var target=null;
  var saved=await getTarget(); if(saved){ try{ target=await figma.getNodeByIdAsync(saved.nodeId); }catch(e){} }
  if(!target){ target=await pickTargetFromSelection(sel); }
  if(!target){ note('Pick target first (Pick Target Component), then run Link.'); return; }

  var rx=null;
  if (cfg.excludeRegex){ try{ rx=new RegExp(cfg.excludeRegex, 'i'); }catch(e){ rx=null; } }

  var attached=0, preserved=0, partial=0, swapped=0, skipped=0;

  var nodes=[], instances=[];
  for (var i=0;i<sel.length;i++){
    var n=sel[i];
    if (rx && rx.test(n.name||'')){ skipped++; continue; }
    if (n.locked){ if(cfg.unlockTemporarily){ try{ n.locked=false; }catch(e){} } else { skipped++; continue; } }
    if (n.type==='INSTANCE' && n.parent && !hasAncestorInstance(n)) instances.push(n);
    else if (n.parent && isAttachable(n) && !hasAncestorInstance(n)) nodes.push(n);
    else skipped++;
  }

  // Convert nodes into instances
  for (var a=0;a<nodes.length;a++){
    var node=nodes[a];
    var parent=node.parent, idx=parent.children.indexOf(node);
    var pos=absoluteXY(node); var w=node.width, h=node.height;

    var chosen=pickClosestVariant(target,w,h); if(!chosen){ skipped++; continue; }
    var compatible = cfg.strict ? structuresStrict(node, chosen, cfg) : structuresLoose(node, chosen);

    if (cfg.dryRun){
      if (compatible) preserved++; else partial++;
      attached++;
      continue;
    }

    var inst = chosen.createInstance();
    try{
      parent.insertChild(idx, inst);
      inst.x=pos.x; inst.y=pos.y; resizeNode(inst,w,h);

      if (compatible){
        await copyTreeStrict(node, inst, cfg); preserved++;
      } else {
        var changed = await copyTreeLoosePartial(node, inst, cfg);
        if (changed>0){ partial++; }
      }

      node.remove(); attached++;
    }catch(e){
      try{ if(!inst.removed) inst.remove(); }catch(e2){}
      notifyError(e); return;
    }
  }

  // Swap instances (Figma preserves overrides on swap)
  for (var b=0;b<instances.length;b++){
    var it=instances[b];
    var chosen2=pickClosestVariant(target,it.width,it.height); if(!chosen2){ skipped++; continue; }
    if (cfg.dryRun){ swapped++; continue; }
    try{ await it.swapComponent(chosen2); swapped++; }catch(e){}
  }

  var msg=[];
  if (attached) msg.push('linked '+attached);
  if (preserved) msg.push('preserved '+preserved);
  if (partial) msg.push('partial '+partial);
  if (swapped) msg.push('swapped '+swapped+' selected');
  if (skipped) msg.push(skipped+' skipped');
  if (cfg.dryRun) msg.push('DRY-RUN');
  note(msg.length? msg.join(' · ') : 'No changes.');
}

// ----------------- command router -----------------
figma.on('run', async function(ev){
  try{
    var cmd = (ev && ev.command) ? ev.command : '';
    if (cmd==='create-component')      await createComponentFromSelection();
    else if (cmd==='pick-target')      await pickTarget();
    else if (cmd==='link-to-target')   await linkToTarget();
    else if (cmd==='toggle-strict')    { var c=await loadCfg(); c.strict=!c.strict; await saveCfg(c); note('Strict matching: '+(c.strict?'ON':'OFF')); }
    else if (cmd==='toggle-dry')       { var d=await loadCfg(); d.dryRun=!d.dryRun; await saveCfg(d); note('Dry run: '+(d.dryRun?'ON':'OFF')); }
    else note('Nothing to do.');
  } catch (e) { notifyError(e); }
  finally { setTimeout(function(){ try{ figma.closePlugin(); }catch(e){} }, 0); }
});
