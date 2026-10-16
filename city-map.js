'use strict';
window.BunnyStreetMap=class {
  constructor(options){this.options=options;this.markers=[];this.places=[];this.passport={};this.generation=0;}
  async start(){
    if(this.map){this.resize();return;}if(this.loading)return;
    const generation=++this.generation;this.loading=true;this.options.loading?.();
    try{
      if(navigator.onLine===false)throw new Error('offline');
      const lib=window.L,key=window.BunnyMapConfig?.tomTomKey;if(!lib||!key)throw new Error('configuration');
      this.map=lib.map('ar-map',{minZoom:3,maxZoom:19,scrollWheelZoom:true}).setView([-12.06,-77.035],11);
      this.map.on('click',event=>this.options.pick(event.latlng.lat,event.latlng.lng));
      this.setPlaces(this.places,this.passport);this.setPosition(this.position);
      let successes=0,failures=0;
      this.tiles=lib.tileLayer('https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key='+encodeURIComponent(key)+'&tileSize=256&language=es-ES',{tileSize:256,maxZoom:19,attribution:'© <a href="https://www.tomtom.com/" target="_blank" rel="noopener">TomTom</a>'});
      this.tiles.on('tileload',()=>{if(generation!==this.generation)return;successes++;clearTimeout(this.timeout);this.ready=true;this.loading=false;this.options.ready();this.resize();});
      this.tiles.on('tileerror',()=>{if(generation!==this.generation)return;failures++;if(successes)this.options.warning?.();});
      this.tiles.on('load',()=>{if(generation===this.generation&&!successes&&failures){
        // Leaflet still reads its map after emitting load; remove it after that callback finishes.
        queueMicrotask(()=>{if(generation===this.generation&&!successes)this.fail(new Error('tiles'));});
      }});
      this.timeout=setTimeout(()=>{if(generation===this.generation&&!this.ready)this.fail(new Error('timeout'));},25000);
      this.tiles.addTo(this.map);this.resize();
    }catch(error){if(generation===this.generation)this.fail(error);}
  }
  fail(error){this.generation++;clearTimeout(this.timeout);this.loading=false;this.ready=false;this.markers=[];this.user=null;this.map?.remove();this.map=null;this.options.error(error);}
  resize(){this.map?.invalidateSize();}
  reset(){this.map?.setView([-12.06,-77.035],11);}
  focus(place){this.map?.setView([place.lat,place.lng],15);}
  setPlaces(places,passport){this.places=places;this.passport=passport;if(!this.map)return;this.markers.forEach(m=>m.remove());this.markers=places.map(place=>{const icon=window.L.divIcon({className:'city-leaflet-pin',html:'<span class="city-street-pin'+(place.type==='event'?' event':'')+(passport[place.id]?' collected':'')+'"><img src="assets/rabbit.png" alt=""></span>',iconSize:[46,46],iconAnchor:[23,23]});return window.L.marker([place.lat,place.lng],{icon,title:place.name,keyboard:true}).addTo(this.map).on('click',()=>this.options.preview(place));});}
  setPosition(position){this.position=position;if(!this.map||!position)return;this.user?.remove();this.user=window.L.circleMarker([position.lat,position.lng],{radius:8,color:'#fff',weight:3,fillColor:'#6545af',fillOpacity:1}).addTo(this.map);}
};
