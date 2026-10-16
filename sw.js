const CACHE='welcome-mate-v5-77';
// Cache the interface and the home view only. Gallery and game media are cached after a visitor opens them.
const FILES=['./','./index.html','./manifest.webmanifest','./app.js','./projects.js','./projects.css','./style.css','./refresh.css','./marohe.css','./play.js','./play.css','./play-marohe.css','./arcade.css','./arcade-polish.css','./arcade-input.js','./universe.css','./universe.js','./boba-animation.css','./boba-ui.js','./puzzle-engines.js','./puzzle-ui.js','./mobile-games.css','./mobile-games.js','./platform.css','./platform-engine.js','./platform-ui.js','./community-blog.css','./blog-dashboard.css','./blog-media.js','./blog.js','./about-map.css','./about-map.js','./bunny-ar.css','./bunny-ar.js','./ar-engine.js','./city.js','./city-admin.js','./city-content.js','./city-dashboard.css','./city-map.js','./map-config.js','./usa-engine.js','./usa-ui.js','./usa.css','./peru-engine.js','./peru-ui.js','./peru.css','./combat-ui.js','./australia-engine.js','./australia-ui.js','./australia.css','./assets/marohe-logo.png','./assets/mate-lima-alpaca-hero.png','./assets/rabbit.png','./assets/projects/scene-01.jpg','./assets/projects/food-boba-taro.jpg','./assets/projects/tuks-polo-cusco.jpg','./assets/projects/dr-happy-cover.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('welcome-mate-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||e.request.headers.has('range')||/\.mp4$/i.test(url.pathname))return;
  const isCode=e.request.mode==='navigate'||/\.(js|css|html|webmanifest)$/.test(url.pathname);
  async function network(){const response=await fetch(e.request);if(response.ok&&response.status!==206){const cache=await caches.open(CACHE);await cache.put(e.request,response.clone());}return response;}
  async function fallback(){return(await caches.match(e.request))||(e.request.mode==='navigate'?await caches.match('./index.html'):Response.error());}
  e.respondWith(isCode?network().catch(fallback):caches.match(e.request).then(hit=>hit||network().catch(fallback)));
});
