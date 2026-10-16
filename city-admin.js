'use strict';
(() => {
  const $=id=>document.getElementById(id),app=window.bunnyCity,content=window.BunnyCityContent;
  if(!app||!$('city-dashboard'))return;
  const unlocked=()=>window.mateAdmin?.isUnlocked()===true;
  const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const fields=['id','type','name','area','lat','lng','fact','block','source'];
  const localInput=value=>value?new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)).replace(' ','T'):'';
  const isoInput=value=>value?new Date(`${value}:00-05:00`).toISOString():'';
  let cover='',uploadGeneration=0,uploadBusy=false;
  function photo(){ $('city-photo-preview').src=cover;$('city-photo-preview').hidden=!cover;$('city-photo-remove').hidden=!cover;$('city-post-save').disabled=uploadBusy; }
  $('city-photo-upload').addEventListener('change',async()=>{if(!unlocked())return;const file=$('city-photo-upload').files[0];if(!file)return;const generation=++uploadGeneration;uploadBusy=true;photo();$('city-photo-status').textContent='Preparando foto…';try{const result=await window.BunnyBlogMedia.prepare(file);if(generation!==uploadGeneration||!unlocked())return;cover=result;$('city-photo-status').textContent='Foto lista. Guarda el punto para publicarla.';}catch(error){if(generation===uploadGeneration)$('city-photo-status').textContent=error.message;}finally{if(generation===uploadGeneration){uploadBusy=false;photo();}}});
  $('city-photo-remove').addEventListener('click',()=>{if(!unlocked())return;uploadGeneration++;uploadBusy=false;cover='';$('city-photo-upload').value='';photo();});
  function dates(){const event=$('city-post-type').value==='event';$('city-event-fields').hidden=!event;for(const id of ['city-post-start','city-post-end'])$(id).required=event;}
  function reset(){uploadGeneration++;uploadBusy=false;cover='';photo();$('city-photo-status').textContent='JPG, PNG o WebP · hasta 8 MB.';app.cancelPicking();$('city-post-form').reset();$('city-post-id').value='';$('city-post-published').checked=true;$('city-pick-map').setAttribute('aria-pressed','false');$('city-coordinate-status').textContent='Puedes tocar el plano para colocar el punto. Revisa la ubicación antes de publicar.';dates();$('city-admin-status').textContent='Listo para crear un nuevo punto.';}
  function refresh(){
    if(!unlocked())return;const all=app.store.all(),list=$('city-admin-list');list.replaceChildren();
    $('city-admin-count').textContent=`${all.length} puntos · ${all.filter(p=>p.published).length} publicados`;
    all.forEach(place=>{const row=make('article','city-admin-row');row.dataset.cityEntry=place.id;const top=make('div','city-admin-row-top');top.append(make('span','',place.type==='event'?'EVENTO':'LANDMARK'),make('small','',place.published?'PUBLICADO':'BORRADOR / OCULTO'));row.append(top,make('h4','',place.name),make('p','',place.area));if(place.type==='event')row.append(make('p','',`${localInput(place.start).replace('T',' · ')} · Lima`));const actions=make('div','city-row-actions');for(const [action,label]of [['edit','Editar'],['toggle',place.published?'Ocultar':'Publicar'],['remove',place.id.startsWith('city-')?'Eliminar':'Retirar']]){const button=make('button','',label);button.type='button';button.dataset.cityAction=action;button.addEventListener('click',()=>act(action,place.id));actions.append(button);}row.append(actions);list.append(row);});
  }
  function act(action,id){
    if(!unlocked())return;
    const place=app.store.all().find(p=>p.id===id);if(!place)return;
    try{
      if(action==='edit'){reset();cover=place.cover||'';photo();for(const field of fields)$(`city-post-${field}`).value=place[field]??'';$('city-post-published').checked=place.published;$('city-post-start').value=localInput(place.start);$('city-post-end').value=localInput(place.end);dates();$('city-admin-status').textContent=`Editando “${place.name}”.`;$('city-post-name').focus();return;}
      if(action==='remove'){if(!confirm(`¿Retirar “${place.name}” del tablero? Los sellos ya ganados se conservan.`))return;app.store.remove(id);reset();}
      else app.store.toggle(id);
      app.refresh();refresh();$('city-admin-status').textContent='Tablero actualizado en este dispositivo.';
    }catch(error){$('city-admin-status').textContent=error.message.includes('Quota')?'No se pudo guardar. Revisa el espacio disponible del navegador.':error.message||'No se pudo guardar el cambio.';}
  }
  function setCoordinates(lat,lng){if(!unlocked())return;$('city-post-lat').value=Number(lat).toFixed(6);$('city-post-lng').value=Number(lng).toFixed(6);$('city-coordinate-status').textContent='Punto colocado. Revisa el lugar y guarda para publicarlo.';$('city-dashboard').scrollIntoView({behavior:'smooth',block:'start'});}
  function open(){if(!unlocked())return;$('city-dashboard').hidden=false;app.showMap();refresh();$('city-dashboard').scrollIntoView({behavior:'smooth',block:'start'});}
  function close(){$('city-dashboard').hidden=true;reset();}
  $('city-post-form').addEventListener('submit',event=>{
    event.preventDefault();if(!unlocked()||uploadBusy)return;
    try{const raw={cover};for(const field of fields)raw[field]=$(`city-post-${field}`).value;raw.published=$('city-post-published').checked;raw.start=raw.type==='event'?isoInput($('city-post-start').value):'';raw.end=raw.type==='event'?isoInput($('city-post-end').value):'';const saved=app.store.save(raw);reset();app.refresh();refresh();$('city-admin-status').textContent=saved.published?'Punto publicado en el plano de este dispositivo.':'Borrador guardado. Aún no aparece en el plano.';}
    catch(error){$('city-admin-status').textContent=error.name==='RangeError'?'Revisa las fechas y horas del evento.':error.message.includes('Quota')?'No se pudo guardar. Revisa el espacio del navegador.':error.message||'No se pudo guardar el punto.';}
  });
  $('city-post-type').addEventListener('change',dates);$('city-post-cancel').addEventListener('click',reset);
  $('city-pick-map').addEventListener('click',()=>{if(!unlocked())return;$('city-pick-map').setAttribute('aria-pressed','true');$('city-coordinate-status').textContent='Toca el plano para elegir la ubicación. Este paso aún no publica el punto.';app.startPicking();});
  $('city-use-location').addEventListener('click',()=>{
    if(!unlocked())return;if(!navigator.geolocation){$('city-coordinate-status').textContent='Este navegador no ofrece ubicación. Elige el punto en el plano.';return;}
    $('city-coordinate-status').textContent='Buscando tu ubicación…';navigator.geolocation.getCurrentPosition(position=>{if(!unlocked())return;const {latitude:lat,longitude:lng,accuracy}=position.coords;if(accuracy>100){$('city-coordinate-status').textContent='El GPS es impreciso. Elige el punto en el plano o inténtalo de nuevo.';return;}setCoordinates(lat,lng);},()=>{$('city-coordinate-status').textContent='No se pudo leer la ubicación. Puedes colocar el punto tocando el plano.';},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
  });
  $('city-admin-blog').addEventListener('click',()=>window.mateAdmin?.open('blog'));
  $('city-admin-logout').addEventListener('click',()=>window.mateAdmin?.logout());
  window.cityAdmin={open,close,setCoordinates,refresh};dates();
})();
