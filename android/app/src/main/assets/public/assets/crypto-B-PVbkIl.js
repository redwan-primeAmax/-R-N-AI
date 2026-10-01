/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */const s="redwan_vault_salt_v1_#987!";async function h(e,o=s){if(!e)return"";try{const r=new TextEncoder().encode(e+"::"+o),t=await crypto.subtle.digest("SHA-256",r);return Array.from(new Uint8Array(t)).map(n=>n.toString(16).padStart(2,"0")).join("")}catch(c){console.error("Password hashing failed, falling back safely:",c);let r=0;const t=e+o;for(let a=0;a<t.length;a++){const n=t.charCodeAt(a);r=(r<<5)-r+n,r=r&r}return"salted-fallback-"+Math.abs(r).toString(16)}}export{h};
