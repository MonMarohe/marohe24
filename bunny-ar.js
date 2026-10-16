'use strict';
(() => {
  const $ar=id=>document.getElementById(id);
  const api=window.BunnyAR;
  if(!api||!$ar('ar-map'))return;
  const key='mate-ar-passport-v1';
  const content=window.BunnyCityContent,store=new content.Store(localStorage),planBounds=content.bounds;
  let picking=false;
  let passport={};try{passport=api.cleanPassport(JSON.parse(localStorage.getItem(key)));}catch{}
  let position=null,map=null,userMarker=null,userRadius=null,activePlace=null,stream=null,cameraGeneration=0,mapLoading=false,locating=false,mapGeneration=0;
  const markers=new Map();
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const distanceLabel=value=>value===null?'Ubicación pendiente':value<1000?`${Math.round(value)} m de ti`:`${(value/1000).toFixed(1)} km de ti`;
  const eventDate=place=>new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',year:'numeric',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).formatRange(new Date(place.start),new Date(place.end));
  function cardFor(place,index){
    const check=api.gate(position,place),collected=!!passport[place.id],event=place.type==='event',status=content.eventState(place);
    const card=el('article',`ar-landmark${event?' ar-event-card':''}`);const top=el('div','ar-landmark-top'),img=el('img');img.src='assets/rabbit.png';img.alt='Bunny blanco de Welcome Mate';
    const label=event?({upcoming:'EN AGENDA ✧',live:'ENCUENTRO ACTIVO ✧',ended:'FINALIZADO'})[status]:`LANDMARK 0${index+1}`;
    top.append(img,el('span','',collected?'ENCONTRADO ♡':label));
    const button=el('button','',check.ok?(collected?'Volver a ver':'Abrir cámara ↗'):check.meters===null?'Activar ubicación':'Actualizar ubicación');button.type='button';button.dataset.arPlace=place.id;button.dataset.arReady=String(check.ok);button.addEventListener('click',()=>{if(api.gate(position,place).ok)openCamera(place);else locate();});
    if(event&&status!=='live'){button.textContent=status==='upcoming'?'Sello disponible durante el evento':'Evento finalizado';button.disabled=true;}
    const preview=el('button','ar-preview-button','Ver a Bunny · vista previa');preview.type='button';preview.dataset.arPreview=place.id;preview.addEventListener('click',()=>openCamera(place,true));
    if(place.cover){const photo=el('img','ar-event-cover');photo.src=place.cover;photo.alt=place.name;photo.loading='lazy';card.append(photo);}
    const showMap=el('button','ar-preview-button','Ver en mapa ◎');showMap.type='button';showMap.addEventListener('click',()=>{navigateTab('mapa');streets.focus(place);$ar('ar-map-wrap').scrollIntoView({behavior:'smooth',block:'center'});});
    card.append(top,el('h3','',place.name),el('p','',place.area));if(event)card.append(el('p','ar-event-date',`${eventDate(place)} · hora de Lima`));
    card.append(el('strong','',distanceLabel(check.meters)),button,el('small','',check.reason),preview,showMap);return card;
  }
  function render(){
    const places=store.public(),landmarks=places.filter(p=>p.type==='landmark'),events=places.filter(p=>p.type==='event');
    const count=landmarks.filter(p=>passport[p.id]).length,eventCount=Object.values(passport).filter(stamp=>stamp.place?.type==='event').length;
    $ar('ar-tab-count').textContent=`${count}/${landmarks.length}`;
    $ar('ar-passport-count').textContent=`Lima · ${count}/${landmarks.length} landmarks${eventCount?` · ${eventCount} encuentros`:''}${landmarks.length&&count===landmarks.length?' · ¡Capítulo completo!':''}`;
    $ar('ar-passport-progress').max=Math.max(1,landmarks.length);$ar('ar-passport-progress').value=count;
    $ar('ar-map-heading-title').textContent=`Landmarks y eventos. Una ciudad por descubrir.`;
    $ar('ar-event-count').textContent=events.filter(p=>content.eventState(p)!=='ended').length;
    const cards=$ar('ar-landmarks'),stamps=$ar('ar-passport-grid'),blocks=$ar('ar-blocks');cards.replaceChildren();stamps.replaceChildren();blocks.replaceChildren();
    const sortedEvents=events.sort((a,b)=>(content.eventState(a)==='ended')-(content.eventState(b)==='ended')||Date.parse(a.start)-Date.parse(b.start));
    $ar('ar-event-list').replaceChildren();$ar('ar-map-event-list')?.replaceChildren();
    sortedEvents.forEach((place,index)=>{$ar('ar-event-list').append(cardFor(place,index));$ar('ar-map-event-list')?.append(cardFor(place,index));});
    // Keep landmark details available to the same preview/camera actions while
    // the map panel stays focused on the map and its event agenda. The parent
    // container is hidden in the page; map pins are the visible entry point.
    landmarks.forEach((place,index)=>cards.append(cardFor(place,index)));
    if($ar('ar-map-events-empty'))$ar('ar-map-events-empty').hidden=sortedEvents.length>0;
    $ar('ar-events-empty').hidden=events.length>0;
    const stampPlaces=[...landmarks,...events.filter(p=>passport[p.id])];
    for(const [id,stamp]of Object.entries(passport))if(!stampPlaces.some(p=>p.id===id)){const place=stamp.place||api.landmarks.find(p=>p.id===id);if(place)stampPlaces.push({...place,id});}
    stampPlaces.forEach(place=>{
      const collected=!!passport[place.id];if(collected&&passport[place.id].place)place={...place,...passport[place.id].place};
      const stamp=el('article',`ar-stamp${collected?'':' locked'}`);const bunny=el('img');bunny.src='assets/rabbit.png';bunny.alt=collected?'Bunny encontrado':'Silueta de Bunny por encontrar';
      const date=collected?new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'long'}).format(new Date(passport[place.id].date)):'Aún por descubrir';
      stamp.append(el('span','',collected?'🇵🇪 SELLO DE LIMA':'🇵🇪 LIMA'),bunny,el('h3','',place.name),el('p','',collected?`Bloque ${place.block} desbloqueado`:'Acércate al lugar y encuentra a Bunny.'),el('small','',date));stamps.append(stamp);
      const block=el('span',`ar-block${collected?'':' dim'}`,`${place.symbol} ${place.block}${collected?' ✓':' · por encontrar'}`);block.style.background=place.color;blocks.append(block);
    });
    refreshMarkers();
  }
  const streets=new window.BunnyStreetMap({loading(){ $ar('ar-map-retry').disabled=true;$ar('ar-map-retry').textContent='Cargando mapa…';$ar('ar-map-status').textContent='Cargando las calles de Lima…';},ready(){ $ar('ar-map-retry').disabled=false;$ar('ar-map-retry').textContent='Cargar mapa ↗';$ar('ar-map-fallback').hidden=true;$ar('ar-map-status').textContent='Explora Lima: arrastra el mapa y usa el zoom. Rosa: landmarks · morado: eventos.';},warning(){ $ar('ar-map-status').textContent='Algunas calles aún están cargando. Puedes mover el mapa y consultar los puntos.';},error(error){ $ar('ar-map-retry').disabled=false;$ar('ar-map-retry').textContent='Reintentar mapa ↗';$ar('ar-map-fallback').hidden=false;const reason=error?.message==='offline'?'Estás sin conexión.':error?.message==='timeout'?'El servidor del mapa está tardando en responder.':/webgl|gpu/i.test(error?.message||'')?'El navegador no pudo activar los gráficos del mapa.':'No se pudo iniciar el mapa.';$ar('ar-map-fallback').querySelector('p').textContent=reason+' Puedes reintentar; los lugares, eventos y el pasaporte están disponibles debajo.';$ar('ar-map-status').textContent=reason;},pick:choosePoint,preview(place){if(picking)choosePoint(place.lat,place.lng);else openCamera(place,true);}});
  function tab(name){document.querySelectorAll('.ar-tabs [data-ar-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.arTab===name)));for(const panel of ['mapa','eventos','pasaporte','mundo'])$ar('ar-'+panel+'-panel').hidden=panel!==name;if(name!=='mapa')expandMap(false);if(name==='mapa'){loadMap();requestAnimationFrame(()=>streets.resize());}}
  function routeTab(){if(location.hash.split('/')[0]==='#events')return 'eventos';const name=location.hash.split('/')[1];return ['pasaporte','mundo'].includes(name)?name:'mapa';}
  function navigateTab(name){location.hash=name==='eventos'?'#events':'#explorar'+(name==='mapa'?'':'/'+name);route();tab(name);}
  function refreshMarkers(){streets.setPlaces(store.public(),passport);}
  function loadMap(){streets.start();}
  function updateUserMarker(){streets.setPosition(position);}
  function locate(){
    if(locating)return;
    if(!navigator.geolocation){$ar('ar-location-status').textContent='Este navegador no ofrece ubicación. Puedes explorar los lugares y tu pasaporte.';return;}
    locating=true;$ar('ar-locate').disabled=true;$ar('ar-location-status').textContent='Buscando tu ubicación…';
    navigator.geolocation.getCurrentPosition(result=>{
      locating=false;$ar('ar-locate').disabled=false;
      position={lat:result.coords.latitude,lng:result.coords.longitude,accuracy:result.coords.accuracy,time:Date.now()};
      if(!api.validPosition(position)){position=null;$ar('ar-location-status').textContent='No se pudo leer tu ubicación. Inténtalo de nuevo.';render();return;}
      const nearest=[...store.public()].sort((a,b)=>api.distance(position,a)-api.distance(position,b))[0];
      if(!nearest){$ar('ar-location-status').textContent=`GPS ±${Math.round(position.accuracy)} m. Aún no hay puntos publicados.`;render();return;}
      const check=api.gate(position,nearest);
      $ar('ar-location-status').textContent=`GPS ±${Math.round(position.accuracy)} m · ${nearest.name}: ${distanceLabel(check.meters)}. ${check.reason}`;
      render();updateUserMarker();
    },error=>{
      locating=false;position=null;$ar('ar-locate').disabled=false;render();
      $ar('ar-location-status').textContent=error.code===1?'No diste acceso a la ubicación. Puedes habilitarlo en los permisos de tu navegador y tocar “Estoy aquí”.':error.code===3?'La ubicación tardó demasiado. Inténtalo de nuevo en un espacio abierto.':'No pudimos encontrar tu ubicación. Comprueba el GPS y vuelve a intentarlo.';
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }
  function stopCamera(){cameraGeneration++;if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;$ar('ar-video').srcObject=null;activePlace=null;$ar('ar-collect').disabled=true;$ar('ar-collect').dataset.collected='false';$ar('ar-camera-dialog').classList.remove('ar-preview-mode');if($ar('ar-camera-dialog').open)$ar('ar-camera-dialog').close();}
  async function openCamera(place,preview=false){
    if(preview){stopCamera();$ar('ar-camera-dialog').classList.add('ar-preview-mode');document.querySelector('.ar-camera-bottom small').textContent='Vista previa sin cámara ni ubicación. Los sellos se ganan al visitar el lugar.';$ar('ar-camera-title').textContent=`${place.name} · vista previa`;$ar('ar-camera-fact').textContent=place.fact;$ar('ar-camera-source').href=place.source;$ar('ar-camera-source').hidden=!place.source;$ar('ar-camera-status').textContent='Conoce a Bunny desde casa. Para ganar el sello, visita este lugar y activa tu ubicación.';$ar('ar-collect').textContent='Vista previa · sin sello';$ar('ar-camera-dialog').showModal();return;}
    const check=api.gate(position,place);if(!check.ok){$ar('ar-location-status').textContent=check.reason;render();return;}
    stopCamera();activePlace=place;const generation=++cameraGeneration;
    document.querySelector('.ar-camera-bottom small').textContent='Bunny 3D aparece sobre tu cámara. No se graban fotos ni videos.';
    $ar('ar-camera-title').textContent=place.name;$ar('ar-camera-fact').textContent=place.fact;$ar('ar-camera-source').href=place.source;
    $ar('ar-camera-source').hidden=!place.source;
    $ar('ar-camera-status').textContent='Abriendo tu cámara…';$ar('ar-collect').textContent=passport[place.id]?'Bunny ya está en tu pasaporte ✓':'Encontré a Bunny ♡';$ar('ar-collect').disabled=true;
    $ar('ar-camera-dialog').showModal();
    if(!navigator.mediaDevices?.getUserMedia){$ar('ar-camera-status').textContent='La cámara requiere HTTPS y un navegador compatible. En computadora también puedes usar localhost.';return;}
    try{
      const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});
      if(generation!==cameraGeneration||document.hidden||document.body.dataset.page!=='explorar'){media.getTracks().forEach(track=>track.stop());return;}
      stream=media;$ar('ar-video').srcObject=media;
      try{await $ar('ar-video').play();}catch{stopCamera();$ar('ar-location-status').textContent='No se pudo mostrar la cámara. Vuelve a abrirla.';return;}
      if(generation!==cameraGeneration)return;
      $ar('ar-camera-status').textContent='¡Bunny está aquí! Mira a tu alrededor y descubre su mensaje.';$ar('ar-collect').disabled=!!passport[place.id];
    }catch(error){if(generation!==cameraGeneration)return;$ar('ar-camera-status').textContent=error.name==='NotAllowedError'?'No se concedió acceso a la cámara. Actívalo en los permisos del navegador para encontrar a Bunny.':'No se pudo abrir la cámara. Comprueba que otra app no la esté usando.';}
  }
  function collect(){
    if(!activePlace||!stream)return;
    const result=api.collect(passport,activePlace.id,position,Date.now(),store.public());
    if(!result.ok){$ar('ar-camera-status').textContent=result.reason;$ar('ar-collect').disabled=true;return;}
    try{localStorage.setItem(key,JSON.stringify(result.passport));}catch{$ar('ar-camera-status').textContent='No se pudo guardar tu sello. Libera espacio o prueba fuera del modo privado.';return;}
    passport=result.passport;render();$ar('ar-camera-status').textContent=`¡Bunny encontrado! Ganaste el bloque ${result.block}.`;$ar('ar-collect').textContent='Ver mi Pasaporte ♡';
    $ar('ar-collect').disabled=false;$ar('ar-collect').dataset.collected='true';
  }
  function buildBunny(){
    // White stepped silhouette, tall ears and black Y: the Welcome Mate character.
    const shapes=[[-76,104,152,65,38,'#171318'],[-60,84,120,90,42,'#171318'],[-44,69,88,105,42,'#171318'],[-45,0,29,92,32,'#171318'],[17,0,29,92,32,'#171318'],[-68,110,136,49,40,'#fffdfb'],[-52,93,104,66,44,'#fffdfb'],[-36,78,72,77,44,'#fffdfb'],[-37,8,13,88,34,'#fffdfb'],[25,8,13,88,34,'#fffdfb'],[-50,151,28,20,38,'#fffdfb'],[-15,151,30,23,38,'#fffdfb'],[23,151,28,20,38,'#fffdfb'],[-12,123,8,8,4,'#171318'],[5,123,8,8,4,'#171318'],[-5,130,12,7,4,'#171318'],[-1,136,5,12,4,'#171318']];
    shapes.forEach(([x,y,w,h,d,fill],index)=>{const cube=el('div','ar-cuboid');for(const [prop,val] of Object.entries({x,y,w,h,d,z:index>=13?27:0}))cube.style.setProperty(`--${prop}`,`${val}px`);cube.style.setProperty('--fill',fill);for(const side of ['front','back','left','right','top','bottom'])cube.append(el('i',`ar-face ${side}`));$ar('ar-voxel-bunny').append(cube);});
  }
  function expandMap(expand){$ar('explorar').classList.toggle('ar-map-expanded',expand);$ar('ar-map-wide').setAttribute('aria-pressed',String(expand));$ar('ar-map-wide').textContent=expand?'Cerrar ampliación ✕':'⤢ Ampliar mapa';requestAnimationFrame(()=>streets.resize());}
  function choosePoint(lat,lng){if(!picking||!window.mateAdmin?.isUnlocked())return;window.cityAdmin?.setCoordinates(lat,lng);picking=false;$ar('city-pick-map').setAttribute('aria-pressed','false');$ar('ar-map-wrap').classList.remove('picking');expandMap(false);}
  function startPicking(){if(!window.mateAdmin?.isUnlocked())return;picking=true;navigateTab('mapa');$ar('ar-map-wrap').classList.add('picking');$ar('ar-map-wrap').scrollIntoView({behavior:'smooth',block:'center'});}
  $ar('ar-map-overview').addEventListener('click',()=>streets.reset());
  $ar('ar-map-wide').addEventListener('click',()=>expandMap(!$ar('explorar').classList.contains('ar-map-expanded')));
  addEventListener('resize',()=>streets.resize());
  addEventListener('keydown',event=>{if(event.key==='Escape')expandMap(false);});
  if(typeof ResizeObserver==='function')new ResizeObserver(()=>streets.resize()).observe($ar('ar-map-wrap'));
  document.querySelectorAll('[data-ar-tab]').forEach(button=>button.addEventListener('click',()=>navigateTab(button.dataset.arTab)));
  $ar('ar-locate').addEventListener('click',locate);$ar('ar-map-retry').addEventListener('click',loadMap);
  $ar('ar-camera-close').addEventListener('click',stopCamera);
  $ar('ar-camera-dialog').addEventListener('cancel',event=>{event.preventDefault();stopCamera();});
  $ar('ar-camera-dialog').addEventListener('close',()=>{if(!$ar('ar-camera-dialog').open&&(stream||activePlace))stopCamera();});
  $ar('ar-collect').addEventListener('click',()=>{if($ar('ar-collect').dataset.collected==='true'){stopCamera();navigateTab('pasaporte');}else collect();});
  addEventListener('hashchange',()=>{stopCamera();if(document.body.dataset.page==='explorar'){render();tab(routeTab());}else expandMap(false);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopCamera();position=null;render();}});
  addEventListener('pagehide',stopCamera);
  window.bunnyCity={store,refresh:render,startPicking,cancelPicking(){picking=false;$ar('ar-map-wrap').classList.remove('picking');},showMap:()=>navigateTab('mapa')};
  setInterval(()=>{if(document.body.dataset.page==='explorar'&&!document.hidden)render();},60000);
  buildBunny();render();if(document.body.dataset.page==='explorar')tab(routeTab());
})();
