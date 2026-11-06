/*! Reader Conversation View for DeepSeek Harness. */
window.__ModuleLoader__.load({
  id: "@local/dsh-conversation-view",
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
var L=Object.create;var m=Object.defineProperty;var q=Object.getOwnPropertyDescriptor;var E=Object.getOwnPropertyNames;var B=Object.getPrototypeOf,V=Object.prototype.hasOwnProperty;var D=(e,n)=>{for(var t in n)m(e,t,{get:n[t],enumerable:!0})},N=(e,n,t,l)=>{if(n&&typeof n=="object"||typeof n=="function")for(let r of E(n))!V.call(e,r)&&r!==t&&m(e,r,{get:()=>n[r],enumerable:!(l=q(n,r))||l.enumerable});return e};var _=(e,n,t)=>(t=e!=null?L(B(e)):{},N(n||!e||!e.__esModule?m(t,"default",{value:e,enumerable:!0}):t,e)),P=e=>N(m({},"__esModule",{value:!0}),e);var ne={};D(ne,{ReaderView:()=>M,apply:()=>ee,inject:()=>R});module.exports=P(ne);var o=_(require("react"),1),g="conversationView",W="reader",Y=4,z=[],$={en:{"tab.label":"Reader","empty.title":"Nothing to read yet","empty.body":"Ask something below and the conversation appears here, one turn at a time.","load.earlier":"Load earlier turns","load.loading":"Loading earlier turns...","label.you":"You","label.steer":"Message added mid-turn","tools.count":"{n} tool calls","tools.more":"+{n} more","tools.failed":"{n} failed","tools.running":"Calling tools...",streaming:"Writing...","error.turn":"This turn failed: {message}","error.turn.fallback":"This turn ended with an error.","compaction.label":"Older history summarized here","compaction.count":"{n} items replaced","error.render":"The Reader could not display this transcript."},zh:{"tab.label":"\u9605\u8BFB","empty.title":"\u8FD9\u91CC\u8FD8\u6CA1\u6709\u5185\u5BB9","empty.body":"\u5728\u4E0B\u65B9\u63D0\u95EE\uFF0C\u5BF9\u8BDD\u4F1A\u6309\u8F6E\u6B21\u663E\u793A\u5728\u8FD9\u91CC\u3002","load.earlier":"\u52A0\u8F7D\u66F4\u65E9\u7684\u8F6E\u6B21","load.loading":"\u6B63\u5728\u52A0\u8F7D\u66F4\u65E9\u7684\u8F6E\u6B21...","label.you":"\u4F60","label.steer":"\u672C\u8F6E\u8FFD\u52A0\u7684\u6D88\u606F","tools.count":"{n} \u6B21\u5DE5\u5177\u8C03\u7528","tools.more":"\u53E6\u6709 {n} \u4E2A","tools.failed":"{n} \u6B21\u5931\u8D25","tools.running":"\u6B63\u5728\u8C03\u7528\u5DE5\u5177...",streaming:"\u6B63\u5728\u751F\u6210...","error.turn":"\u672C\u8F6E\u51FA\u9519\uFF1A{message}","error.turn.fallback":"\u672C\u8F6E\u56E0\u9519\u8BEF\u7ED3\u675F\u3002","compaction.label":"\u6B64\u5904\u5DF2\u538B\u7F29\u66F4\u65E9\u7684\u5386\u53F2","compaction.count":"\u5DF2\u66FF\u6362 {n} \u9879","error.render":"\u9605\u8BFB\u89C6\u56FE\u65E0\u6CD5\u663E\u793A\u8FD9\u6BB5\u5BF9\u8BDD\u3002"}};function j(e){if(!Array.isArray(e))return"";let n=[];for(let t of e)t===null||typeof t!="object"||t.type!=="text"||typeof t.text!="string"||t.text.trim()!==""&&n.push(t.text);return n.join(`

`).trim()}function A(e){if(!Array.isArray(e))return"";let n=[];for(let t of e)t===null||typeof t!="object"||t.kind!=="text"||typeof t.text!="string"||t.text.trim()!==""&&n.push(t.text);return n.join(`

`).trim()}function C(e,n){e.count+=1;let t=n.call!==null&&n.call!==void 0&&typeof n.call.name=="string"?n.call.name:"";t!==""&&e.names.indexOf(t)===-1&&e.names.push(t),n.isError===!0&&(e.failed+=1)}function F(e,n,t){let l=[],r=null,c=null,f=()=>(r={key:`turn-${l.length}`,items:[]},l.push(r),r),v=()=>r===null?f():r,u=s=>{v().items.push(s)};try{for(let s of e){if(s===null||typeof s!="object")continue;let d=s.kind;if(d==="tool-result"){let a=r===null?void 0:r.items[r.items.length-1];c!==null&&a===c?C(c,s):(c={key:`tools-${s.seq}`,kind:"tools",names:[],count:0,failed:0,running:!1},C(c,s),u(c));continue}if(c=null,d==="user"){let a=j(s.content);if(a==="")continue;(r===null||r.items.length>0)&&f(),u({key:`prompt-${s.seq}`,kind:"prompt",text:a,steer:!1});continue}if(d==="steering"){let a=j(s.content);if(a==="")continue;u({key:`steer-${s.seq}`,kind:"prompt",text:a,steer:!0});continue}if(d==="assistant"){let a=A(s.blocks);if(a==="")continue;u({key:`answer-${s.seq}`,kind:"answer",text:a,streaming:!1});continue}if(d==="turn-error"){u({key:`error-${s.seq}`,kind:"error",text:typeof s.message=="string"?s.message.trim():"",code:typeof s.code=="string"?s.code.trim():""});continue}if(d==="compaction"){u({key:`compaction-${s.seq}`,kind:"compaction",count:typeof s.shadowedItemCount=="number"&&s.shadowedItemCount>0?s.shadowedItemCount:0});continue}}if(n!==null&&typeof n=="object"){let s=A(n.blocks);s!==""&&u({key:"partial",kind:"answer",text:s,streaming:!0})}if(Array.isArray(t)&&t.length>0){let s={key:"running",kind:"tools",names:[],count:t.length,failed:0,running:!0};for(let d of t){let a=d!==null&&typeof d=="object"&&typeof d.name=="string"?d.name:"";a!==""&&s.names.indexOf(a)===-1&&s.names.push(a)}u(s)}}catch{}return l.filter(s=>s.items.length>0)}function T(e){return(n,t)=>{let l=n;try{if(typeof e=="function"){let r=e(n);typeof r=="string"&&r!==""&&(l=r)}}catch{l=n}if(t!=null)for(let r of Object.keys(t))l=l.split(`{${r}}`).join(String(t[r]));return l}}function G(e,n){if(e.names.length===0)return"";let t=e.names.slice(0,Y),l=e.names.length-t.length,r=t.join(", ");return l>0?`${r} ${n("tools.more",{n:l})}`:r}var X=`
.dsv-root {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font-size: 13px;
  line-height: 1.65;
}
.dsv-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 20px 40px;
}
.dsv-column {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}
.dsv-older {
  align-self: center;
  margin: 0 0 20px;
  padding: 3px 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.dsv-older:hover:not(:disabled) { color: var(--dsw-alias-label-primary); }
.dsv-older:disabled { cursor: default; opacity: 0.6; }
.dsv-older:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.dsv-turn {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dsv-turn:first-of-type { padding-top: 4px; }
.dsv-turn:last-of-type { padding-bottom: 0; border-bottom: none; }
.dsv-prompt {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-left: 12px;
  border-left: 2px solid var(--dsw-alias-brand-primary);
}
.dsv-label {
  font-size: 11px;
  line-height: 1.4;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-secondary);
}
.dsv-text {
  margin: 0;
  font-size: 13px;
  color: var(--dsw-alias-label-primary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dsv-tools {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  padding-left: 2px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
.dsv-tools-count { flex: 0 0 auto; }
.dsv-tools-names {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-tools-failed { flex: 0 0 auto; opacity: 0.9; }
.dsv-error {
  padding-left: 12px;
  border-left: 2px solid var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-state-error-primary);
  font-size: 12.5px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dsv-error-code {
  display: block;
  font-size: 11px;
  opacity: 0.8;
}
.dsv-compaction {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 0;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
}
.dsv-rule {
  flex: 1 1 auto;
  height: 1px;
  background: var(--dsw-alias-border-l1);
}
.dsv-compaction-text {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-caret {
  display: inline-block;
  width: 5px;
  height: 12px;
  margin-left: 2px;
  vertical-align: -1px;
  background: var(--dsw-alias-brand-primary);
  animation: dsv-pulse 1.1s ease-in-out infinite;
}
@keyframes dsv-pulse {
  0%, 45% { opacity: 0.7; }
  55%, 100% { opacity: 0.15; }
}
.dsv-streaming {
  margin-top: 12px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
.dsv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 24px;
  text-align: center;
  color: var(--dsw-alias-label-secondary);
}
.dsv-empty-glyph { color: var(--dsw-alias-label-secondary); opacity: 0.75; }
.dsv-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}
.dsv-empty-body { max-width: 320px; font-size: 12.5px; line-height: 1.6; }
.dsv-fallback {
  padding: 24px 0;
  font-size: 12.5px;
  color: var(--dsw-alias-label-secondary);
}
@media (prefers-reduced-motion: reduce) {
  .dsv-caret { animation: none; opacity: 0.6; }
}
`;function H(){return o.default.createElement("svg",{className:"dsv-empty-glyph",width:"40",height:"40",viewBox:"0 0 40 40",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round","aria-hidden":"true"},o.default.createElement("rect",{x:"9",y:"5",width:"22",height:"30",rx:"3"}),o.default.createElement("path",{d:"M15 5v30",strokeOpacity:"0.55"}),o.default.createElement("path",{d:"M19 13h7"}),o.default.createElement("path",{d:"M19 18h5"}),o.default.createElement("path",{d:"M19 23h7"}),o.default.createElement("path",{d:"M19 28h4"}))}function J({item:e,tr:n}){let t=G(e,n),l=e.running?n("tools.running"):n("tools.count",{n:e.count});return o.default.createElement("div",{className:"dsv-tools",title:t===""?l:`${l} \xB7 ${t}`},o.default.createElement("span",{className:"dsv-tools-count"},l),t===""?null:o.default.createElement("span",{className:"dsv-tools-names"},t),e.failed>0?o.default.createElement("span",{className:"dsv-tools-failed"},n("tools.failed",{n:e.failed})):null)}function K({item:e,tr:n}){return e.kind==="prompt"?o.default.createElement("div",{className:"dsv-prompt"},o.default.createElement("div",{className:"dsv-label"},e.steer?n("label.steer"):n("label.you")),o.default.createElement("div",{className:"dsv-text"},e.text)):e.kind==="answer"?o.default.createElement("div",{className:"dsv-text"},e.text,e.streaming?o.default.createElement("span",{className:"dsv-caret","aria-hidden":"true"}):null):e.kind==="tools"?o.default.createElement(J,{item:e,tr:n}):e.kind==="error"?o.default.createElement("div",{className:"dsv-error",role:"note"},e.text===""?n("error.turn.fallback"):n("error.turn",{message:e.text}),e.code===""?null:o.default.createElement("span",{className:"dsv-error-code"},e.code)):e.kind==="compaction"?o.default.createElement("div",{className:"dsv-compaction",role:"separator"},o.default.createElement("span",{className:"dsv-rule"}),o.default.createElement("span",{className:"dsv-compaction-text"},e.count>0?`${n("compaction.label")} \xB7 ${n("compaction.count",{n:e.count})}`:n("compaction.label")),o.default.createElement("span",{className:"dsv-rule"})):null}function Q({turn:e,tr:n}){return o.default.createElement("section",{className:"dsv-turn"},e.items.map(t=>o.default.createElement(K,{key:t.key,item:t,tr:n})))}function U({tr:e}){return o.default.createElement("div",{className:"dsv-empty"},o.default.createElement(H,null),o.default.createElement("div",{className:"dsv-empty-title"},e("empty.title")),o.default.createElement("div",{className:"dsv-empty-body"},e("empty.body")))}var x=class extends o.default.Component{constructor(n){super(n),this.state={failed:!1}}static getDerivedStateFromError(){return{failed:!0}}componentDidCatch(){}render(){return this.state.failed?this.props.fallback:this.props.children}};function Z({useConversation:e,useSession:n,loadOlder:t,t:l}){let r=T(l),c=e(i=>{try{let p=i?.views;return p==null||typeof p.get!="function"?null:p.get("chat")||null}catch{return null}}),f=n(i=>!!(i!=null&&i.hasMore)),v=n(i=>!!(i!=null&&i.loadingOlder)),u=n(i=>!!(i!=null&&i.running)),s=c!=null&&c.legacy!==null&&c.legacy!==void 0?c.legacy:null,d=s!==null&&Array.isArray(s.nodes)?s.nodes:z,a=s!==null&&s.partial!==null&&s.partial!==void 0?s.partial:null,h=s!==null&&Array.isArray(s.runningCalls)?s.runningCalls:z,y=o.default.useMemo(()=>F(d,a,h),[d,a,h]),[O,b]=o.default.useState(!1),S=o.default.useCallback(()=>{b(!0),Promise.resolve().then(()=>typeof t=="function"?t():!1).catch(()=>!1).then(()=>{b(!1)})},[t]),w=O||v,I=a!==null&&y.some(i=>i.items.some(p=>p.streaming)),k=y.length===0;return o.default.createElement("div",{className:"dsv-scroll"},o.default.createElement("div",{className:"dsv-column"},f?o.default.createElement("button",{type:"button",className:"dsv-older",disabled:w,onClick:S},r(w?"load.loading":"load.earlier")):null,k?o.default.createElement(U,{tr:r}):y.map(i=>o.default.createElement(Q,{key:i.key,turn:i,tr:r})),u&&!k&&!I?o.default.createElement("div",{className:"dsv-streaming","aria-hidden":"true"},r("streaming")):null))}function M({useConversation:e,useSession:n,loadOlder:t,t:l}){let r=T(l);return o.default.createElement("div",{className:"dsv-root"},o.default.createElement("style",null,X),o.default.createElement(x,{fallback:o.default.createElement("div",{className:"dsv-scroll"},o.default.createElement("div",{className:"dsv-column"},o.default.createElement("div",{className:"dsv-fallback"},r("error.render"))))},o.default.createElement(Z,{useConversation:e,useSession:n,loadOlder:t,t:l})))}var R=["slots","locale","uiConversation","uiSession","sessions"];function ee(e){e.effect(()=>e.locale.register(g,{en:$.en,zh:$.zh}),"conversation-view: dictionaries");let n=e.locale.bind(g);e.slots.inject("conversation.view",()=>e.slots.register({name:"conversation.view",id:W,order:20,locale:g,label:()=>n("tab.label"),inject:t=>({loadOlder:async()=>{try{let l=e.sessions.binding(t),r=l?.session;return r==null||typeof r.loadOlder!="function"?!1:(await r.loadOlder(),!0)}catch{return!1}}})},M))}

    return module.exports;
  },
});
