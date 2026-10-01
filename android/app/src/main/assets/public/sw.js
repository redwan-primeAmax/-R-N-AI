/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-cbf3be78'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-512x512.png",
    "revision": "33aa3d1853829a34a636941e1ea2a426"
  }, {
    "url": "pwa-192x192.png",
    "revision": "17c65c72ae4327bec51705d4588dccd9"
  }, {
    "url": "index.html",
    "revision": "6c9de2d8739202ba34dba5c9b39c07a1"
  }, {
    "url": "prompts/title_generator.txt",
    "revision": "12a06639e0abd0100a03237678246cf5"
  }, {
    "url": "prompts/system.txt",
    "revision": "028a5bd3ea98bee3021b23e3e6ee51bf"
  }, {
    "url": "prompts/openrouter.txt",
    "revision": "956bf2651d5dc147c4a2f106cfbee06e"
  }, {
    "url": "assets/router-CffnUae-.js",
    "revision": null
  }, {
    "url": "assets/react-B9Hqs5Qw.js",
    "revision": null
  }, {
    "url": "assets/purify.es-DBIK8olT.js",
    "revision": null
  }, {
    "url": "assets/motion-DaOafcva.js",
    "revision": null
  }, {
    "url": "assets/jszip.min-DeexowUz.js",
    "revision": null
  }, {
    "url": "assets/index.es-s5n-0vV3.js",
    "revision": null
  }, {
    "url": "assets/index-DYhbZ1k9.js",
    "revision": null
  }, {
    "url": "assets/index-8vEdgImC.css",
    "revision": null
  }, {
    "url": "assets/icons-SXZEOW9i.js",
    "revision": null
  }, {
    "url": "assets/formatSize-BZuaGK7T.js",
    "revision": null
  }, {
    "url": "assets/crypto-B-PVbkIl.js",
    "revision": null
  }, {
    "url": "assets/bengali-CxL1E5jt.js",
    "revision": null
  }, {
    "url": "assets/YellowRuledTheme-CHk720e3.js",
    "revision": null
  }, {
    "url": "assets/WorkspacePage-Ckh-DFAA.js",
    "revision": null
  }, {
    "url": "assets/Vault-DXp_HlDE.js",
    "revision": null
  }, {
    "url": "assets/ToolsPage-DjJHdeDt.js",
    "revision": null
  }, {
    "url": "assets/StorageOptimizer-BeSzjXGb.js",
    "revision": null
  }, {
    "url": "assets/SoftLinenTheme-DCfKActn.js",
    "revision": null
  }, {
    "url": "assets/SnowWhiteTheme-BhOsbBew.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-Dnvevz5R.js",
    "revision": null
  }, {
    "url": "assets/SearchWorker-BRipOMw5.js",
    "revision": null
  }, {
    "url": "assets/SearchPage-BLIjnnsa.js",
    "revision": null
  }, {
    "url": "assets/RecycleBin-C8EuZ8IB.js",
    "revision": null
  }, {
    "url": "assets/RecentBackups-7NU2FIvN.js",
    "revision": null
  }, {
    "url": "assets/RSTSearch-DahaMnve.js",
    "revision": null
  }, {
    "url": "assets/PasswordTakeCare-CLr0on8T.js",
    "revision": null
  }, {
    "url": "assets/PageIcon-v-a9BGss.js",
    "revision": null
  }, {
    "url": "assets/OfflinePage-TrKd4hKv.js",
    "revision": null
  }, {
    "url": "assets/NetworkShield-B14Q0gjP.js",
    "revision": null
  }, {
    "url": "assets/MoveToBookmarkModal-DBm-F2JX.js",
    "revision": null
  }, {
    "url": "assets/HomePage-CGIpArIX.js",
    "revision": null
  }, {
    "url": "assets/GridPaperTheme-MKabeqmr.js",
    "revision": null
  }, {
    "url": "assets/EditorPage-CuIf5RYQ.js",
    "revision": null
  }, {
    "url": "assets/DefaultTheme-B1sdjtJx.js",
    "revision": null
  }, {
    "url": "assets/DarkGraphiteTheme-BNps76RN.js",
    "revision": null
  }, {
    "url": "assets/CustomDialogs-B8GEVsAo.js",
    "revision": null
  }, {
    "url": "assets/BrowseTemplates-BC0uEmEy.js",
    "revision": null
  }, {
    "url": "assets/BookmarkPage-BLDMHmOD.js",
    "revision": null
  }, {
    "url": "assets/AppCloudArchive-DFXZux80.js",
    "revision": null
  }, {
    "url": "assets/AIContentArchitect-BWR4h4Mj.js",
    "revision": null
  }, {
    "url": "assets/AIConfiguration-DeRZRI2g.js",
    "revision": null
  }, {
    "url": "assets/AIChat-BlW5pfFt.js",
    "revision": null
  }, {
    "url": "pwa-192x192.png",
    "revision": "17c65c72ae4327bec51705d4588dccd9"
  }, {
    "url": "pwa-512x512.png",
    "revision": "33aa3d1853829a34a636941e1ea2a426"
  }, {
    "url": "manifest.webmanifest",
    "revision": "61c60670ea2b399fe427b35ba6286e04"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(({
    request
  }) => request.destination === "document" || request.mode === "navigate", new workbox.NetworkFirst({
    "cacheName": "html-cache",
    plugins: []
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
