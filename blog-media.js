'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BunnyBlogMedia=api;})(typeof window==='object'?window:globalThis,()=>{
  const types=new Set(['image/jpeg','image/png','image/webp']);
  function safeCover(value){return typeof value==='string'&&value.length<=900000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);}
  function validate(file){if(!file||!types.has(file.type))throw new Error('Elige una foto JPG, PNG o WebP.');if(file.size>8*1024*1024)throw new Error('La foto debe pesar como máximo 8 MB.');if(!file.size)throw new Error('La foto está vacía.');}
  async function prepare(file){
    validate(file);
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('No se pudo leer la foto.'));reader.readAsDataURL(file);});
    const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('No se pudo abrir la imagen.'));img.src=data;});
    if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>40000000)throw new Error('La imagen es demasiado grande. Prueba una versión más pequeña.');
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
    if(!context)throw new Error('No se pudo preparar la foto en este navegador.');
    let max=1280,result='';
    for(let attempt=0;attempt<4;attempt++){
      const scale=Math.min(1,max/image.naturalWidth,max/image.naturalHeight);
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      context.fillStyle='#FFFAF3';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
      result=canvas.toDataURL('image/jpeg',.78-attempt*.08);
      if(result.length<=600000&&safeCover(result))return result;
      max=Math.round(max*.8);
    }
    throw new Error('La foto sigue ocupando mucho espacio. Elige una más pequeña.');
  }
  return {safeCover,validate,prepare};
});
