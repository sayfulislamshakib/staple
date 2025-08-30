// Staple — Component Management Plugin for Figma (Strict match only)
// Toast now says: “All N objects attached to "Component" successfully!”
// when everything attaches; otherwise shows a partial summary.

// ---------------------------------- constants ----------------------------------
var TARGET_KEY = 'staple/target';

// Small, fixed alias sets to help strict name matching pass in common cases.
var NAME_ALIASES = [
  ["title","label","heading"],
  ["desc","subtitle","description"]
];

// What properties we copy when strict match succeeds.
var COPY_SURFACE = {
  text: true,
  fills: true,
  strokes: true,
  effects: true,
  corners: true,
  layout: true,          // only Frame->Frame
  constraints: true,
  visibilityOpacity: true
};

// ---------------------------------- storage ------------------------------------
async function saveTarget(obj) { try { await figma.clientStorage.setAsync(TARGET_KEY, obj ? obj : null); } catch (e) {} }
async function getTarget() { try { var v = await figma.clientStorage.getAsync(TARGET_KEY); return v ? v : null; } catch (e) { return null; } }

// ---------------------------------- utils --------------------------------------
function notifyError(e){ var m=(e && e.message)?e.message:String(e); figma.notify('Error: '+m,{error:true}); }
function note(msg){ figma.notify(msg); }

function absoluteXY(n){ var m=n.absoluteTransform; return {x:m[0][2], y:m[1][2]}; }
function resizeNode(n,w,h){ try{ if(typeof n.resize==='function') n.resize(w,h); else if(typeof n.resizeWithoutConstraints==='function') n.resizeWithoutConstraints(w,h);}catch(e){} }
function hasAncestorInstance(n){ var p=n.parent; while(p){ if(p.type==='INSTANCE') return true; p=p.parent; } return false; }
function isAttachable(n){ return !['COMPONENT','COMPONENT_SET','INSTANCE','SLICE','STICKY','SHAPE_WITH_TEXT','PAGE','SECTION'].includes(n.type); }
function deepClone(v){ try{ return JSON.parse(JSON.stringify(v)); }catch(e){ return v; } }

function norm(s){ return (s||'').toLowerCase().replace(/\s+/g,' ').trim(); }
function namesEquivalent(a,b){
  a = norm(a); b = norm(b);
  if (a===b) return true;
  for (var i=0;i<NAME_ALIASES.length;i++){
    var g = NAME_ALIASES[i], A=false, B=false;
    for (var j=0;j<g.length;j++){
      var v = norm(g[j]);
      if (v===a) A=true;
      if (v===b) B=true;
    }
    if (A && B) return true;
  }
  return false;
}

// Strict children (no wrapper skipping)
function childList(n){
  if (!('children' in n) || !n.children) return [];
  return n.children;
}

// Exact structure check (ignore root type, compare children)
function structuresStrict(aRoot, bRoot){
  function walk(a,b){
    var ac = childList(a), bc = childList(b);
    if (ac.length !== bc.length) return false;
    for (var i=0;i<ac.length;i++){
      var an=ac[i], bn=bc[i];
      if (an.type !== bn.type) return false;
      if (!namesEquivalent(an.name||'', bn.name||'')) return false;
      if (!walk(an,bn)) return false;
    }
    return true;
  }
  return walk(aRoot,bRoot);
}

// ---------------------------------- overrides ----------------------------------
async function loadFontsForText(n){
  try{
    var len=n.characters ? n.characters.length : 0;
    var fns=n.getRangeAllFontNames(0,len);
    for (var i=0;i<fns.length;i++){ try{ await figma.loadFontAsync(fns[i]); }catch(e){} }
  }catch(e){}
}

async function copyOverrides(fromNode, toNode){
  var touched=0;

  // TEXT
  if (COPY_SURFACE.text && fromNode.type==='TEXT' && toNode.type==='TEXT'){
    try{ await loadFontsForText(toNode); toNode.characters=fromNode.characters; touched++; }catch(e){}
  }

  if (COPY_SURFACE.visibilityOpacity){
    try{ if('visible'in toNode && 'visible'in fromNode){ toNode.visible=fromNode.visible; touched++; } }catch(e){}
    try{ if('opacity'in toNode && 'opacity'in fromNode){ toNode.opacity=fromNode.opacity; touched++; } }catch(e){}
  }

  if (COPY_SURFACE.fills){ try{ if('fills'in toNode && 'fills'in fromNode){ toNode.fills=deepClone(fromNode.fills); touched++; } }catch(e){} }
  if (COPY_SURFACE.strokes){
    try{ if('strokes'in toNode && 'strokes'in fromNode){ toNode.strokes=deepClone(fromNode.strokes); touched++; } }catch(e){}
    try{ if('strokeWeight'in toNode && 'strokeWeight'in fromNode){ toNode.strokeWeight=fromNode.strokeWeight; touched++; } }catch(e){}
  }
  if (COPY_SURFACE.effects){ try{ if('effects'in toNode && 'effects'in fromNode){ toNode.effects=deepClone(fromNode.effects); touched++; } }catch(e){} }

  if (COPY_SURFACE.corners){
    try{ if('cornerRadius'in toNode && 'cornerRadius'in fromNode){ toNode.cornerRadius=fromNode.cornerRadius; touched++; } }catch(e){}
    try{ if('cornerSmoothing'in toNode && 'cornerSmoothing'in fromNode){ toNode.cornerSmoothing=fromNode.cornerSmoothing; touched++; } }catch(e){}
  }

  if (COPY_SURFACE.constraints){ try{ if('constraints'in toNode && 'constraints'in fromNode){ toNode.constraints=deepClone(fromNode.constraints); touched++; } }catch(e){} }

  if (COPY_SURFACE.layout && toNode.type==='FRAME' && fromNode.type==='FRAME'){
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

// Return total number of overrides applied across the strict-matched subtree.
async function copyTreeStrict(fromRoot, toRoot){
  async function walk(a,b){
    var changed = 0;
    var ac=childList(a), bc=childList(b);
    for (var i=0;i<ac.length;i++){
      changed += await copyOverrides(ac[i], bc[i]);
      changed += await walk(ac[i], bc[i]);
    }
    return changed;
  }
  return await walk(fromRoot,toRoot);
}

// --------------------------- create component from selection --------------------
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

// -------------------------------- pick target ----------------------------------
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

// ------------------------------ variant choice ---------------------------------
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

// ------------------------------- link to target --------------------------------
async function linkToTarget(){
  var sel=figma.currentPage.selection;
  var target=null;
  var saved=await getTarget(); if(saved){ try{ target=await figma.getNodeByIdAsync(saved.nodeId); }catch(e){} }
  if(!target){ target=await pickTargetFromSelection(sel); }
  if(!target){ note('Pick target first (Pick Target Component), then run Link.'); return; }

  var attached=0, preserved=0, swapped=0, skipped=0;

  var nodes=[], instances=[];
  for (var i=0;i<sel.length;i++){
    var n=sel[i];
    if (n.locked){ skipped++; continue; }
    if (n.type==='INSTANCE' && n.parent && !hasAncestorInstance(n)) instances.push(n);
    else if (n.parent && isAttachable(n) && !hasAncestorInstance(n)) nodes.push(n);
    else skipped++;
  }

  var totalToProcess = nodes.length + instances.length;

  // Convert regular nodes into instances (strict only)
  for (var a=0;a<nodes.length;a++){
    var node=nodes[a];
    var parent=node.parent, idx=parent.children.indexOf(node);
    var pos=absoluteXY(node); var w=node.width, h=node.height;

    var chosen=pickClosestVariant(target,w,h); if(!chosen){ skipped++; continue; }

    // Strict structure check against the COMPONENT (not the instance)
    var compatible = structuresStrict(node, chosen);

    var inst = chosen.createInstance();
    try{
      parent.insertChild(idx, inst);
      inst.x=pos.x; inst.y=pos.y; resizeNode(inst,w,h);

      if (compatible){
        var changed = await copyTreeStrict(node, inst);
        if (changed > 0) preserved++;
      }

      node.remove(); attached++;
    }catch(e){
      try{ if(!inst.removed) inst.remove(); }catch(e2){}
      notifyError(e); return;
    }
  }

  // Swap selected instances to target variant (Figma preserves overrides)
  for (var b=0;b<instances.length;b++){
    var it=instances[b];
    var chosen2=pickClosestVariant(target,it.width,it.height); if(!chosen2){ skipped++; continue; }
    try{ await it.swapComponent(chosen2); swapped++; }catch(e){}
  }

  var attachedTotal = attached + swapped;

  if (totalToProcess === 0) {
    note('No attachable objects in the selection.');
  } else if (attachedTotal === totalToProcess) {
    note('All ' + attachedTotal + ' objects attached to "' + (target.name || 'Component') + '" successfully!');
  } else {
    note(attachedTotal + ' of ' + totalToProcess + ' objects attached to "' + (target.name || 'Component') + '". ' +
         (preserved ? (preserved + ' preserved, ') : '') + skipped + ' skipped.');
  }
}

// ---------------------------------- router -------------------------------------
figma.on('run', async function(ev){
  try{
    var cmd = (ev && ev.command) ? ev.command : '';
    if (cmd==='create-component')      await createComponentFromSelection();
    else if (cmd==='pick-target')      await pickTarget();
    else if (cmd==='link-to-target')   await linkToTarget();
    else note('Nothing to do.');
  } catch (e) { notifyError(e); }
  finally { setTimeout(function(){ try{ figma.closePlugin(); }catch(e){} }, 0); }
});
