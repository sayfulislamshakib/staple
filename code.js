// ---------------------------------- constants ----------------------------------
var TARGET_KEY = 'staple/target';

// Name alias helpers to tolerate tiny naming differences in strict checks
var NAME_ALIASES = [
  ["title","label","heading"],
  ["desc","subtitle","description"]
];

// Properties we copy when strict match succeeds
var COPY_SURFACE = {
  text: true,
  fills: true,
  strokes: true,
  effects: true,
  corners: true,
  layout: true,
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

// allow INSTANCE as source; only exclude types Figma can’t convert
function isConvertible(n){
  return !['COMPONENT_SET','PAGE','SECTION','SLICE','STICKY','COMPONENT'].includes(n.type);
}

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

// Signature for strict, order-sensitive grouping (type + normalized name + children)
function signature(root){
  function walk(n){
    var self = { t:n.type, n:(n.name||'').toLowerCase().trim() };
    var kids = childList(n);
    self.k = kids.map(walk);
    return self;
  }
  return JSON.stringify(walk(root));
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

  // TEXT content + style
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

// Copy overrides across matched subtree
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

// --------------------- CREATE HELPERS (no flatten, no detach) -------------------
// Convert a FRAME into a Component by moving kids; replace original with instance
async function createSingleComponentFromFrame(frame){
  var parent=frame.parent||figma.currentPage, idx=parent.children.indexOf(frame);
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
  return {component: comp, instance: inst};
}

// Create a Component from any single node (Frame/Group/Instance/Primitive) by CLONING it
// into the component; then replace original with an instance in place.
async function createComponentFromSingleNodeAndReplace(node, name){
  var parent=node.parent||figma.currentPage, idx=parent.children.indexOf(node);
  var abs=absoluteXY(node);
  var comp=figma.createComponent(); comp.name=name||'Component';
  parent.insertChild(Math.max(0,idx+1),comp);
  comp.x=abs.x+40; comp.y=abs.y+40; resizeNode(comp,node.width,node.height);

  try{
    var clone=node.clone(); comp.appendChild(clone);
    clone.x=0; clone.y=0;
  }catch(e){}

  var inst=comp.createInstance();
  parent.insertChild(Math.max(0,idx),inst);
  inst.x=abs.x; inst.y=abs.y; resizeNode(inst,comp.width,comp.height);
  try{ node.remove(); }catch(e){}
  figma.currentPage.selection=[inst];
  return {component: comp, instance: inst};
}

// Create an instance of given component in place of a node, copying overrides if structure matches
async function attachNodeToComponent(node, component){
  var parent=node.parent, idx=parent.children.indexOf(node);
  var pos=absoluteXY(node); var w=node.width, h=node.height;

  // If component is a set, choose a sensible variant by size; otherwise use component itself
  var chosen = (function pickClosestVariant(c,w,h){
    if (c.type==='COMPONENT') return c;
    var set=c, best=null, score=1e15;
    for (var i=0;i<set.children.length;i++){
      var v=set.children[i]; if(v.type!=='COMPONENT') continue;
      var s=Math.abs(v.width-w)+Math.abs(v.height-h);
      if (s<score){ score=s; best=v; }
    }
    if (best) return best;
    for (var j=0;j<set.children.length;j++){ if (set.children[j].type==='COMPONENT') return set.children[j]; }
    return null;
  })(component,w,h) || component;

  var inst = chosen.createInstance();
  parent.insertChild(idx, inst);
  inst.x=pos.x; inst.y=pos.y; resizeNode(inst,w,h);

  if (structuresStrict(node, chosen)){
    try{ await copyTreeStrict(node, inst); }catch(e){}
  }
  try{ node.remove(); }catch(e){}
  return inst;
}

// --------------------------- MERGE TO SINGLE COMPONENT --------------------------
async function mergeToSingleFromSelection(){
  var sel=figma.currentPage.selection;
  if(!sel.length){ note('Select one or more layers first.'); return; }

  // Allow Frames, Groups, Instances, primitives; ignore nested-in-instance selections
  var items=[];
  for (var i=0;i<sel.length;i++){
    var n=sel[i];
    if (n.locked) continue;
    if (n.parent && isConvertible(n) && !hasAncestorInstance(n)) items.push(n);
  }
  if (!items.length){ note('No convertible objects in the selection.'); return; }

  // Group by strict structure (type + names + ordered children)
  var groups=new Map();
  for (var j=0;j<items.length;j++){
    var sig=signature(items[j]);
    if (!groups.has(sig)) groups.set(sig, []);
    groups.get(sig).push(items[j]);
  }

  var mergedGroups=0, singles=0, totalInstances=0;

  for (const [sig, nodes] of groups){
    var first=nodes[0];
    var baseName=(first.name||'Component').replace(/\s+/g,' ').trim() || 'Component';
    var comp, instFirst;

    // Create the ONE component from the first node
    if (first.type==='FRAME'){
      var r=await createSingleComponentFromFrame(first);
      comp=r.component; instFirst=r.instance;
    } else {
      var r2=await createComponentFromSingleNodeAndReplace(first, baseName);
      comp=r2.component; instFirst=r2.instance;
    }
    totalInstances++;

    // Attach all other nodes to that same component
    for (var k=1;k<nodes.length;k++){
      var inst=await attachNodeToComponent(nodes[k], comp);
      if (inst) totalInstances++;
    }

    if (nodes.length>1) mergedGroups++; else singles++;
    figma.currentPage.selection=[instFirst];
  }

  // Summary toast
  if (mergedGroups>0 && singles===0){
    note('Merged '+mergedGroups+' similar group'+(mergedGroups>1?'s':'')+' into '+mergedGroups+' single component'+(mergedGroups>1?'s':'')+' ('+totalInstances+' instance'+(totalInstances>1?'s':'')+').');
  } else if (mergedGroups>0 && singles>0){
    note('Merged '+mergedGroups+' group'+(mergedGroups>1?'s':'')+' and created '+singles+' single component'+(singles>1?'s':'')+' ('+totalInstances+' instance'+(totalInstances>1?'s':'')+').');
  } else {
    note('Created '+singles+' single component'+(singles>1?'s':'')+' ('+totalInstances+' instance'+(totalInstances>1?'s':'')+').');
  }
}

// ------------------------------ pick target ------------------------------------
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

// ------------------------------- link to target --------------------------------
function pickClosestVariantForLink(componentNode, w, h){
  // re-use in case target is a set
  if (componentNode.type==='COMPONENT') return componentNode;
  var set=componentNode, best=null, score=1e15;
  for (var i=0;i<set.children.length;i++){
    var v=set.children[i]; if(v.type!=='COMPONENT') continue;
    var s=Math.abs(v.width-w)+Math.abs(v.height-h);
    if (s<score){ score=s; best=v; }
  }
  if (best) return best;
  for (var j=0;j<set.children.length;j++){ if (set.children[j].type==='COMPONENT') return set.children[j]; }
  return null;
}

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
    else if (n.parent && isConvertible(n) && !hasAncestorInstance(n)) nodes.push(n);
    else skipped++;
  }

  var totalToProcess = nodes.length + instances.length;

  // Convert regular nodes into instances (strict only)
  for (var a=0;a<nodes.length;a++){
    var node=nodes[a];
    var parent=node.parent, idx=parent.children.indexOf(node);
    var pos=absoluteXY(node); var w=node.width, h=node.height;

    var chosen=pickClosestVariantForLink(target,w,h); if(!chosen){ skipped++; continue; }
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
    var chosen2=pickClosestVariantForLink(target,it.width,it.height); if(!chosen2){ skipped++; continue; }
    try{ await it.swapComponent(chosen2); swapped++; }catch(e){}
  }

  var attachedTotal = attached + swapped;

  if (totalToProcess === 0) {
    note('No convertible objects in the selection.');
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
    if (cmd==='create-component')      await mergeToSingleFromSelection();
    else if (cmd==='pick-target')      await pickTarget();
    else if (cmd==='link-to-target')   await linkToTarget();
    else note('Nothing to do.');
  } catch (e) { notifyError(e); }
  finally { setTimeout(function(){ try{ figma.closePlugin(); }catch(e){} }, 0); }
});
