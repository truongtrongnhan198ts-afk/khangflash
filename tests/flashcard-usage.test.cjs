const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
function setup(){const {window,document}=parseHTML('<html><body><section data-td="front"><b data-td="term">advice</b><span data-word-pos>(n)</span><i data-td="ipa"></i></section><section data-td="back"></section></body></html>');const w={document,window:null,fetch:async()=>({ok:true,text:async()=>'',json:async()=>({})}),WeakMap,Map,Set,console,MutationObserver:class{observe(){}disconnect(){}},addEventListener(){}};w.window=w;vm.runInNewContext(fs.readFileSync(__dirname+'/../reference-ui.js','utf8'),w);return{w,document};}
test('front shows selected usage alongside countability and replaces it on card navigation',()=>{
 const {w,document}=setup(),front=document.querySelector('[data-td="front"]');
 w.TDUi.renderUsage(document,{term:'advice'},{usagePattern:'give advice on + N'});
 vm.runInNewContext(fs.readFileSync(__dirname+'/../noun-countability.js','utf8'),w);document.dispatchEvent(new (parseHTML('<html></html>').window.Event)('DOMContentLoaded'));
 assert.match(front.textContent,/Cách dùng: give advice on \+ N/);assert.match(front.textContent,/Uncountable/);
 w.TDUi.renderUsage(document,{term:'advice'},{usage:'ask somebody for advice'});assert.equal(front.querySelectorAll('[data-card-usage]').length,1);assert.doesNotMatch(front.textContent,/give advice/);assert.match(front.textContent,/Uncountable/);
 w.TDUi.renderUsage(document,{term:'unknown'},{});assert.equal(front.querySelectorAll('[data-card-usage]').length,0);
});
test('usage follows selected sense, preserves literal syntax and never invents missing patterns',()=>{
 const {w,document}=setup();assert.equal(w.TDUi.usageText({usagePattern:'general + N'},{usage:'selected + V-ing'}),'selected + V-ing');assert.equal(w.TDUi.usageText({},{}),'');
 w.TDUi.renderUsage(document,{}, {usagePattern:'S + take <something> into account'});assert.match(document.querySelector('[data-card-usage]').textContent,/<something>/);assert.equal(document.querySelector('[data-card-usage] something'),null);
});
