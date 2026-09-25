const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/recorder/content.js'),'utf8');
const helper=source.slice(source.indexOf('  function rowTypeContext('),source.indexOf('  function descriptor('));
function capture(caption,value,extra=false) {
  const grid={querySelectorAll:()=>[]};
  const row={id:'row-2',closest:()=>grid,querySelectorAll:()=>extra?[cell,cell]:[cell]};
  const input={value,getAttribute:name=>name==='aria-label'?caption:null};
  const cell={closest:()=>row,getAttribute:()=>null,querySelector:selector=>selector.includes('data-private')?null:input};
  const target={closest:()=>row};
  return vm.runInNewContext(helper+';rowTypeContext(target)',{target,document:{getElementById:()=>null}});
}
for(const caption of ['Type','Typ','Type','Typ','Tipo','Type','Tyyppi','Type']) {
  assert.equal(capture(caption,'Item').value,'Item');
  assert.equal(capture(caption,'Resource').source,'same-row-type');
}
assert.equal(capture('Description','Item'),undefined);
assert.equal(capture('Type',''),undefined);
assert.equal(capture('Type','Item',true),undefined);
console.log('Same-row discriminator capture tests passed.');

const canonical=require('../src/engine/canonical-recording');
const normalization=require('../src/engine/event-normalization');
const grouping=require('../src/engine/event-step-grouping');
const semantic=require('../src/document/semantic-interaction-engine');
let recording=canonical.create({id:'row-context'});
const raw=[{sourceEventId:'r1',type:'click',label:'Choose a value for No.',role:'button',controlType:'button',rowTypeContext:{schemaVersion:1,source:'same-row-type',caption:'Type',value:'Item'}},
  {sourceEventId:'r2',type:'click',label:'No., sorted in Ascending order Select record "0015"',role:'gridcell',category:'selection'}];
for(const [index,event] of raw.entries()) recording=canonical.addEvent(recording,{...event,sourceSequence:index+1,timestamp:new Date(index*1000).toISOString()});
const normalized=normalization.normalizeRecording(recording);
assert.equal(normalized.events[0].rowTypeContext.value,'Item');
const groups=grouping.group(normalized).groups;
const actions=semantic.processStepGroups(groups);
assert.ok(actions.some(action=>action.displayText.includes('Item') && action.displayText.includes('0015')));
console.log('Raw recording to grouped semantic row type passed.');
