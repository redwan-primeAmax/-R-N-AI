import{D as o}from"./index-DYhbZ1k9.js";import{h as c}from"./crypto-B-PVbkIl.js";/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */const n={getMasterPassword:async()=>(await o.getUser())?.masterPassword||null,verifyPassword:async s=>{const a=await n.getMasterPassword();if(!a)return!1;const r=await c(s);if(a===r)return!0;if(a.includes("$")){const[w,d]=a.split("$"),i=s+w;let t=0;for(let e=0;e<i.length;e++){const u=i.charCodeAt(e);t=(t<<5)-t+u,t|=0}if(Math.abs(t).toString(16)===d)return await n.setMasterPassword(s),!0}return!1},setMasterPassword:async s=>{const a=await o.getUser();if(a){const r=await c(s);await o.updateUser({...a,masterPassword:r})}},hasMasterPassword:async()=>!!await n.getMasterPassword()};export{n as P};
