'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BunnyAR=api;})(typeof window==='object'?window:globalThis,()=>{
  const landmarks = [
    {id:'kennedy',name:'Parque Kennedy',area:'Miraflores · encuentro y espacio público',lat:-12.12179,lng:-77.03045,block:'Sombra',symbol:'♧',color:'#b7e5d8',fact:'Este parque es un lugar para encontrarnos. Observa sus caminos, bancos y árboles: diseñar también es cuidar.',source:'https://www.gob.pe/institucion/munimiraflores-lima/noticias/604223-miraflores-brinda-turismo-cultura-y-espacios-publicos-para-toda-la-familia-en-semana-santa'},
    {id:'pucllana',name:'Huaca Pucllana',area:'Miraflores · borde de General Borgoño',lat:-12.11141,lng:-77.03384,block:'Quincha',symbol:'▧',color:'#eac7a1',fact:'Aquí pusieron pequeños adobes en vertical, como libros en un estante. Una técnica de la cultura Lima para levantar grandes muros. ¡Ingeniería con tierra!',source:'https://museos.cultura.pe/node/349'},
    {id:'mali',name:'MALI · Parque de la Exposición',area:'Lima · entorno del Palacio de la Exposición',lat:-12.06044,lng:-77.03701,block:'Luz',symbol:'✦',color:'#f8de9f',fact:'El Palacio de la Exposición es de estilo neorrenacentista y usó columnas de hierro. Mira su patio: ¿cómo cambiaría este espacio sin luz natural?',source:'https://mali.pe/es/museo/nosotros/palacio-de-la-exposicion/'}
  ];
  function distance(a,b){const rad=x=>x*Math.PI/180;const dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
  function validPosition(p){return !!p&&Number.isFinite(p.lat)&&p.lat>=-90&&p.lat<=90&&Number.isFinite(p.lng)&&p.lng>=-180&&p.lng<=180&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&Number.isFinite(p.time);}
  function gate(p,place,now=Date.now()){
    if(place.published===false)return {ok:false,reason:'Este punto aún no está publicado.',meters:null};
    if(place.type==='event'&&(now<Date.parse(place.start)||now>Date.parse(place.end)))return {ok:false,reason:now<Date.parse(place.start)?'El sello se activa cuando comienza el evento.':'Este evento ya terminó. Puedes ver su mensaje en vista previa.',meters:validPosition(p)?distance(p,place):null};
    if(!validPosition(p))return {ok:false,reason:'Activa tu ubicación con “Estoy aquí”.',meters:null};
    const meters=distance(p,place);
    if(now-p.time>90000||p.time>now+10000)return {ok:false,reason:'Actualiza tu ubicación con “Estoy aquí”.',meters};
    if(p.accuracy>100)return {ok:false,reason:'El GPS aún es impreciso. Vuelve a tocar “Estoy aquí”.',meters};
    if(meters>100)return {ok:false,reason:'Acércate a menos de 100 m del punto para abrir la cámara.',meters};
    return {ok:true,reason:'Bunny está cerca. Puedes abrir la cámara.',meters};
  }
  function cleanPassport(value){const found={};if(value&&typeof value==='object')for(const [id,stamp]of Object.entries(value)){if(!landmarks.some(p=>p.id===id)&&!/^city-[a-z0-9-]+$/.test(id))continue;if(stamp&&typeof stamp.date==='string'&&Number.isFinite(Date.parse(stamp.date))){found[id]={date:stamp.date};if(stamp.place&&typeof stamp.place.name==='string')found[id].place={name:stamp.place.name.slice(0,100),area:String(stamp.place.area||'Lima').slice(0,160),block:String(stamp.place.block||'Ideas').slice(0,30),symbol:String(stamp.place.symbol||'◇').slice(0,3),color:/^#[a-f0-9]{6}$/i.test(stamp.place.color)?stamp.place.color:'#dfc7f2',type:stamp.place.type==='event'?'event':'landmark'};}}return found;}
  function collect(passport,id,p,now=Date.now(),places=landmarks){const place=places.find(item=>item.id===id);if(!place) return {ok:false,reason:'No se encontró ese lugar.'};const check=gate(p,place,now);if(!check.ok)return check;const next=cleanPassport(passport);const duplicate=!!next[id];if(!duplicate){next[id]={date:new Date(now).toISOString()};if(places!==landmarks||id.startsWith('city-'))next[id].place={name:place.name,area:place.area,block:place.block,symbol:place.symbol,color:place.color,type:place.type};}return {ok:true,passport:next,duplicate,block:place.block};}
  return {landmarks,distance,validPosition,gate,cleanPassport,collect};
});
