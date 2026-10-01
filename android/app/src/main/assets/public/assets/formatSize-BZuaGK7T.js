/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */function n(o){if(o===0)return"0 B";const t=1024,r=["B","KB","MB","GB"],a=Math.floor(Math.log(o)/Math.log(t));return parseFloat((o/Math.pow(t,a)).toFixed(1))+" "+r[a]}export{n as f};
