'use strict';
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./ar-engine.js'):root.BunnyAR,typeof module==='object'&&module.exports?require('./blog-media.js'):root.BunnyBlogMedia);if(typeof module==='object'&&module.exports)module.exports=api;else root.BunnyCityContent=api;})(typeof window==='object'?window:globalThis,(AR,media)=>{
  const KEY='mate-city-content-v1';
  const bounds=[[-12.6,-77.25],[-11.65,-76.65]];
  const rewards={Sombra:{symbol:'♧',color:'#b7e5d8'},Quincha:{symbol:'▧',color:'#eac7a1'},Luz:{symbol:'✦',color:'#f8de9f'},Ideas:{symbol:'◇',color:'#dfc7f2'},Encuentro:{symbol:'♡',color:'#ffd2df'}};
  const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
  function url(value){if(!value)return '';try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}}
  function validate(raw){
    const item={cover:media.safeCover(raw.cover)?raw.cover:'',id:text(raw.id,80),type:raw.type==='event'?'event':'landmark',name:text(raw.name,100),area:text(raw.area,160),fact:text(raw.fact,700),lat:Number(raw.lat),lng:Number(raw.lng),block:rewards[raw.block]?raw.block:'Ideas',source:url(raw.source),published:raw.published===true,start:raw.start||'',end:raw.end||''};
    if(!item.name||!item.area||!item.fact)throw new Error('Completa el nombre, el lugar y el mensaje de Bunny.');
    if(raw.lat===''||raw.lng===''||!Number.isFinite(item.lat)||!Number.isFinite(item.lng))throw new Error('Indica una latitud y longitud válidas.');
    if(item.lat<bounds[0][0]||item.lat>bounds[1][0]||item.lng<bounds[0][1]||item.lng>bounds[1][1])throw new Error('El punto debe estar dentro del área de Lima que muestra el plano.');
    if(raw.source&&!item.source)throw new Error('El enlace debe comenzar con https://.');
    if(item.type==='event'){
      if(!Number.isFinite(Date.parse(item.start))||!Number.isFinite(Date.parse(item.end)))throw new Error('Indica cuándo empieza y termina el evento.');
      if(Date.parse(item.end)<=Date.parse(item.start))throw new Error('El evento debe terminar después de comenzar.');
      item.start=new Date(item.start).toISOString();item.end=new Date(item.end).toISOString();
    }else{item.start='';item.end='';}
    return {...item,...rewards[item.block]};
  }
  function eventState(place,now=Date.now()){if(place.type!=='event')return 'landmark';if(now<Date.parse(place.start))return 'upcoming';if(now>Date.parse(place.end))return 'ended';return 'live';}
  class Store{
    constructor(storage){this.storage=storage;this.entries=[];try{const saved=JSON.parse(storage.getItem(KEY));if(Array.isArray(saved))for(const row of saved){try{if(AR.landmarks.some(p=>p.id===row.id)||/^city-[a-z0-9-]+$/.test(row.id)){const cleaned=validate(row);if(!this.entries.some(p=>p.id===row.id))this.entries.push(cleaned);}}catch{}}}catch{}}
    all(){const base=AR.landmarks.map(place=>({...place,type:'landmark',published:true,start:'',end:''}));for(const item of this.entries){const i=base.findIndex(p=>p.id===item.id);if(i>=0)base[i]={...item};else base.push({...item});}return base;}
    public(){return this.all().filter(place=>place.published);}
    commit(next){this.storage.setItem(KEY,JSON.stringify(next));this.entries=next;return this.all();}
    save(raw){const row=validate(raw);if(row.id&&!this.all().some(p=>p.id===row.id))throw new Error('Ese punto ya no existe. Limpia el formulario y crea uno nuevo.');if(!row.id)row.id=`city-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;this.commit([...this.entries.filter(p=>p.id!==row.id),row]);return row;}
    toggle(id){const row=this.all().find(p=>p.id===id);if(!row)throw new Error('No se encontró ese punto.');return this.save({...row,published:!row.published});}
    remove(id){const base=AR.landmarks.find(p=>p.id===id);if(base)return this.save({...this.all().find(p=>p.id===id),published:false});this.commit(this.entries.filter(p=>p.id!==id));}
  }
  return {Store,validate,eventState,bounds,rewards,KEY};
});
