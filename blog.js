'use strict';
(() => {
  const byId = id => document.getElementById(id);
  if (!byId('blog-posts')) return;
  const POSTS_KEY = 'welcome-mate-blog-posts-v1';
  const ADMIN_KEY = 'welcome-mate-blog-admin-v1';
const allowedCovers = new Set(['assets/about-block-bunny.jpg','assets/build-world-kit.jpg','assets/boba-taro-classic.jpg','assets/parfait.jpg','assets/episodio-lima.png','assets/club-polimata-banner.jpg','assets/clothing-peru.jpg']);
  const seeds = [
    {id:'welcome-many-passions',title:'No tienes que elegir una sola pasión',category:'Creatividad',excerpt:'Tu curiosidad no es falta de enfoque. Puede ser el mapa que conecta todo lo que sabes hacer.',body:'A veces una mente curiosa parece estar cambiando de rumbo, cuando en realidad está reuniendo piezas. Una receta puede enseñarte color; un videojuego puede enseñarte ritmo; construir algo puede ayudarte a contar una historia.\n\nElige dos intereses que parezcan lejanos y crea una prueba pequeña que los una. No tiene que convertirse en un negocio ni definirte para siempre. Solo tiene que darte información sobre lo que disfrutas.',cover:'assets/about-block-bunny.jpg',published:true,created:'2026-10-10T12:00:00.000Z',updated:'2026-10-10T12:00:00.000Z'},
    {id:'small-creative-experiment',title:'El experimento creativo de veinte minutos',category:'Diseño',excerpt:'Una forma amable de empezar cuando una idea parece demasiado grande.',body:'Pon un límite de veinte minutos y construye la versión más pequeña de tu idea. Puede ser un dibujo, tres bloques, una etiqueta o el nombre de una bebida imaginaria.\n\nCuando termine el tiempo, no preguntes si quedó perfecto. Pregunta qué parte te dio energía y cuál quisieras repetir. Esa respuesta vale más que terminar algo enorme por presión.',cover:'assets/build-world-kit.jpg',published:true,created:'2026-10-09T15:30:00.000Z',updated:'2026-10-09T15:30:00.000Z'},
    {id:'ritual-return-spark',title:'Un ritual para volver a tu chispa',category:'Recetas',excerpt:'Preparar algo con las manos también puede ser una pausa para escuchar tus ideas.',body:'Elige una boba y piensa en ella como una paleta de colores. Mientras la preparas, observa las texturas, los contrastes y las decisiones pequeñas que tomas sin pedir permiso.\n\nDespués anota una idea que apareció durante el proceso. Crear no siempre comienza frente a una pantalla; a veces comienza mezclando sabores y dándole espacio a la mente.',cover:'assets/boba-taro-classic.jpg',published:true,created:'2026-10-08T18:15:00.000Z',updated:'2026-10-08T18:15:00.000Z'}
  ];
  let posts = readPosts();
  let localPosts = posts.map(post => ({...post}));
  let cloudReady = false, syncing = false, sharedOpened = false, syncWaiters = [];
  let adminUnlocked = false;
  let adminDestination = 'blog';
  let currentPost = null;
  let uploadedCover = null, uploadGeneration = 0, uploadBusy = false;
  const updatedCovers = new Map([['assets/parfait.jpg','assets/boba-marohe-taro.jpg'],['assets/boba-taro-classic.jpg','assets/boba-marohe-taro.jpg'],['assets/build-world-kit.jpg','assets/kit-marohe-pintura.jpg'],['assets/about-block-bunny.jpg','assets/block-bunny.png']]);
  const coverSource = cover => updatedCovers.get(cover) || (allowedCovers.has(cover) || window.BunnyBlogMedia.safeCover(cover) || /^\/api\/blog\?action=cover&id=[a-zA-Z0-9_-]+&v=/.test(cover || '') ? cover : 'assets/rabbit.png');

  function readPosts() {
    try {
      const saved = JSON.parse(localStorage.getItem(POSTS_KEY));
      return Array.isArray(saved) ? saved.filter(post => post && post.id && post.title) : seeds.map(post => ({...post}));
    } catch { return seeds.map(post => ({...post})); }
  }
  function savePosts() {
    try { localStorage.setItem(POSTS_KEY, JSON.stringify(cloudReady ? localPosts : posts)); return true; }
    catch { return false; }
  }
  async function api(query='',method='GET',payload) {
    const response = await fetch(`/api/blog${query}`,{method,cache:'no-store',credentials:'same-origin',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(15000)});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No se pudo conectar con el podcast compartido.');
    return data;
  }
  function cloudStatus(message) { byId('blog-sync-status').textContent = message; }
  function configureDashboard() {
    byId('blog-dashboard-note').textContent = cloudReady ? 'Podcast compartido: al publicar, tu entrada estará disponible en computadora y celular. Las fotos también se guardan en el servidor. Puedes importar las entradas anteriores de este navegador.' : 'Falta conectar Storage en Vercel. Por ahora guardas copias locales: no se publican en otros dispositivos. Descarga un respaldo o importa estas entradas después de conectar el servidor.';
    byId('blog-import-local').disabled = !cloudReady;
    byId('blog-post-form').querySelector('button[type="submit"]').textContent = cloudReady ? 'Guardar publicación' : 'Guardar copia local';
  }
  async function refreshShared(checkConfig=false) {
    if (syncing) { await new Promise(resolve=>syncWaiters.push(resolve)); return refreshShared(checkConfig); }
    if (!cloudReady && !checkConfig) return;
    syncing=true;
    try {
      if (checkConfig) { const status=await api('?action=status'); cloudReady=!!status.configured; configureDashboard(); }
      if (!cloudReady) { cloudStatus('Mostrando las entradas disponibles en este navegador.'); return; }
      const data=await api(adminUnlocked?'?action=admin':''); posts=data.posts; renderPublic(); renderAdmin();
      try { localStorage.setItem('welcome-mate-blog-public-cache-v1',JSON.stringify(posts.filter(post=>post.published))); } catch {}
      cloudStatus('Podcast actualizado.');
      const sharedId=new URLSearchParams(location.search).get('post');
      const shared=posts.find(post=>post.id===sharedId && post.published);
      if (shared && !sharedOpened) { sharedOpened=true; openReader(shared); }
      if (sharedId && !shared) cloudStatus('Este artículo ya no está publicado o el enlace no existe.');
    } catch (error) {
      cloudStatus(cloudReady ? 'No se pudo actualizar el podcast. Mostramos la última copia disponible; vuelve a intentarlo con conexión.' : 'Mostrando las entradas disponibles en este navegador.');
      if (cloudReady && !adminUnlocked) {
        try { posts=JSON.parse(localStorage.getItem('welcome-mate-blog-public-cache-v1')) || seeds; } catch { posts=seeds; }
        renderPublic();
      }
    } finally { syncing=false; configureDashboard(); const waiting=syncWaiters;syncWaiters=[];waiting.forEach(resolve=>resolve()); }
  }
  function rememberLocal(entry) {
    const i=localPosts.findIndex(post=>post.id===entry.id);
    if(i<0)localPosts.push({...entry}); else localPosts[i]={...entry};
    savePosts();
  }
  async function storeShared(entry) {
    rememberLocal(entry);
    return (await api('','POST',{post:entry})).post;
  }
  async function importLocal() {
    if (!adminUnlocked || !cloudReady) return;
    const button=byId('blog-import-local'); button.disabled=true;
    let imported=0;
    try {
      const existing=new Set(posts.map(post=>post.id));
      for(const entry of localPosts) {
        if(existing.has(entry.id))continue;
        await api('','POST',{post:entry}); imported++; existing.add(entry.id);
        byId('blog-admin-status').textContent=`Importando entradas… ${imported} guardadas en el servidor.`;
      }
      await refreshShared();
      byId('blog-admin-status').textContent=`${imported} entradas importadas. Las publicadas ya se pueden leer desde el celular. Las entradas existentes se conservaron.`;
    } catch(error) { byId('blog-admin-status').textContent=`Se importaron ${imported} entradas. ${error.message} Puedes reintentar sin duplicarlas.`; }
    finally { button.disabled=false; }
  }
  function exportLocal() {
    const blob=new Blob([JSON.stringify(localPosts,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
    const link=make('a'); link.href=url; link.download='welcome-mate-blog-respaldo.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importBackup() {
    const file=byId('blog-import-backup').files?.[0]; if(!file || !adminUnlocked || !cloudReady)return;
    try {
      if(file.size>20000000)throw new Error('El respaldo es demasiado grande. Usa un archivo de hasta 20 MB.');
      const entries=JSON.parse(await file.text());
      if(!Array.isArray(entries) || entries.length>200 || entries.some(post=>!post || typeof post.id!=='string' || typeof post.title!=='string' || typeof post.body!=='string'))throw new Error('Este archivo no es un respaldo válido del blog.');
      const combined=new Map(localPosts.map(post=>[post.id,post])); for(const post of entries)combined.set(post.id,post);
      localPosts=[...combined.values()];savePosts();await importLocal();
    } catch(error) { byId('blog-admin-status').textContent=error.message || 'No se pudo leer el respaldo.'; }
    finally { byId('blog-import-backup').value=''; }
  }
  function formatDate(value) {
    try { return new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value)); }
    catch { return ''; }
  }
  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function publicPosts() {
    const query = byId('blog-search').value.trim().toLocaleLowerCase('es');
    const category = byId('blog-category-filter').value;
    return posts.filter(post => post.published && (category === 'todos' || post.category === category) && (!query || `${post.title} ${post.excerpt} ${post.body}`.toLocaleLowerCase('es').includes(query))).sort((a,b) => new Date(b.created) - new Date(a.created));
  }
  function renderPublic() {
    renderHome();
    const list = publicPosts();
    const container = byId('blog-posts');
    container.replaceChildren();
    byId('blog-empty').hidden = list.length > 0;
    list.forEach(post => {
      const card = make('article','blog-post-card');
      const image = make('img'); image.src = coverSource(post.cover); image.alt = `Portada de ${post.title}`; image.loading = 'lazy';
      const copy = make('div','blog-post-copy');
      const meta = make('div','blog-post-meta'); meta.append(make('span','',post.category),make('time','',formatDate(post.created)));
      const title = make('h2','',post.title);
      const excerpt = make('p','',post.excerpt);
      const open = make('button','', 'Leer artículo ↗'); open.type = 'button'; open.addEventListener('click',() => openReader(post));
      copy.append(meta,title,excerpt,open); card.append(image,copy); container.append(card);
    });
  }
  function renderHome() {
    const container = byId('home-blog-posts');
    if (!container) return;
    container.replaceChildren();
    const latest = posts.filter(post => post.published).sort((a,b) => new Date(b.created)-new Date(a.created)).slice(0,3);
    if (!latest.length) { container.append(make('p','home-empty-note','Las próximas historias están en camino.')); return; }
    for (const post of latest) {
      const card = make('a'); card.href = '#podcast';
      const image = make('img'); image.src = coverSource(post.cover); image.alt = `Portada de ${post.title}`; image.loading='lazy';
      card.append(image,make('span','',post.category.toLocaleUpperCase('es')),make('h3','',post.title),make('p','',post.excerpt));
      card.addEventListener('click',event=>{event.preventDefault();openReader(post);}); container.append(card);
    }
  }
  function openReader(post) {
    currentPost = post;
    byId('blog-reader-category').textContent = post.category;
    byId('blog-reader-cover').src = coverSource(post.cover);
    byId('blog-reader-cover').alt = `Portada de ${post.title}`;
    byId('blog-reader-date').textContent = formatDate(post.created);
    byId('blog-reader-title').textContent = post.title;
    const body = byId('blog-reader-body'); body.replaceChildren();
    post.body.split(/\n\s*\n/).filter(Boolean).forEach(text => body.append(make('p','',text.trim())));
    const shareUrl = new URL(location.href); shareUrl.searchParams.set('post', post.id); shareUrl.hash = 'blog';
    const canonical = shareUrl.href;
    const shareText = `${post.title} — ${post.excerpt}`;
    byId('blog-share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}&quote=${encodeURIComponent(shareText)}`;
    byId('blog-share-whatsapp').href = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${canonical}`)}`;
    byId('blog-share-status').textContent = '';
    byId('blog-reader-dialog').showModal();
  }
  async function sharePost() {
    if (!currentPost) return;
    const shareUrl = new URL(location.href); shareUrl.searchParams.set('post', currentPost.id); shareUrl.hash = 'blog';
    const data = {title:currentPost.title,text:currentPost.excerpt,url:shareUrl.href};
    if (navigator.share) {
      try { await navigator.share(data); byId('blog-share-status').textContent = 'Listo, compartiste esta idea.'; }
      catch (error) { if (error.name !== 'AbortError') byId('blog-share-status').textContent = 'No se pudo abrir el menú para compartir.'; }
    } else {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url)}&quote=${encodeURIComponent(`${data.title} — ${data.text}`)}`,'_blank','noopener');
    }
  }
  async function copyPostLink() {
    if (!currentPost) return;
    const shareUrl = new URL(location.href); shareUrl.searchParams.set('post', currentPost.id); shareUrl.hash = 'blog';
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(shareUrl.href);
      else { const field = make('textarea'); field.value = shareUrl.href; field.style.position = 'fixed'; field.style.opacity = '0'; document.body.append(field); field.select(); const ok = document.execCommand('copy'); field.remove(); if (!ok) throw new Error('copy'); }
      byId('blog-share-status').textContent = 'Enlace copiado.';
    } catch { byId('blog-share-status').textContent = 'No se pudo copiar. Usa los botones de Facebook o WhatsApp.'; }
  }
  function getAdminConfig() {
    try { const value = JSON.parse(localStorage.getItem(ADMIN_KEY)); return value?.salt && value?.hash ? value : null; }
    catch { return null; }
  }
  function setAuthMode() {
    const setup = !cloudReady && !getAdminConfig();
    byId('blog-auth-title').textContent = setup ? 'Crear acceso de administradora' : 'Acceder al dashboard';
    byId('blog-auth-intro').textContent = cloudReady ? 'Ingresa la contraseña de administradora configurada en Vercel para publicar para todos tus lectores.' : setup ? 'Crea una contraseña de al menos 8 caracteres para acceder a tus copias locales en este dispositivo.' : 'Ingresa tu contraseña local. Para publicar a otros dispositivos, primero conecta Storage en Vercel.';
    byId('blog-password-confirm-wrap').hidden = !setup;
    byId('blog-admin-password-confirm').required = setup;
    byId('blog-admin-password').autocomplete = setup ? 'new-password' : 'current-password';
    byId('blog-auth-form').querySelector('button[type="submit"]').textContent = setup ? 'Crear acceso y entrar' : 'Entrar al dashboard';
    byId('blog-auth-status').textContent = '';
  }
  function bytesToHex(bytes) { return [...bytes].map(value => value.toString(16).padStart(2,'0')).join(''); }
  async function passwordHash(password,salt) {
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${salt}:${password}`));
    return bytesToHex(new Uint8Array(digest));
  }
  async function authenticate(event) {
    event.preventDefault();
    const password = byId('blog-admin-password').value;
    const current = getAdminConfig();
    try {
      if (cloudReady) { await api('?action=login','POST',{password}); }
      else if (!current) {
        if (password.length < 8) throw new Error('Usa al menos 8 caracteres.');
        if (password !== byId('blog-admin-password-confirm').value) throw new Error('Las contraseñas no coinciden.');
        const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
        localStorage.setItem(ADMIN_KEY,JSON.stringify({salt,hash:await passwordHash(password,salt)}));
      } else if (await passwordHash(password,current.salt) !== current.hash) throw new Error('La contraseña no es correcta.');
      adminUnlocked = true;
      if (cloudReady) await refreshShared();
      byId('blog-admin-auth').close();
      byId('blog-auth-form').reset();
      enterDashboard();
    } catch (error) { byId('blog-auth-status').textContent = error.message || 'No se pudo abrir el dashboard en este navegador.'; }
  }
  function resetEditor() {
    byId('blog-post-form').reset(); byId('blog-post-id').value = ''; byId('blog-post-published').checked = true;
    resetPhoto();
    byId('blog-admin-status').textContent = 'Editor listo para una nueva publicación.';
  }
  function enterDashboard(){
    if(!adminUnlocked)return;
    if(adminDestination==='city'){location.hash='#explorar';route();window.cityAdmin?.open();}
    else if(adminDestination==='projects'){location.hash='#agency/portfolio';route();window.projectsAdmin?.open();}
    else{location.hash='#podcast';route();byId('blog-dashboard').hidden=false;renderAdmin();byId('blog-dashboard').scrollIntoView({behavior:'smooth',block:'start'});}
  }
  async function openAdmin(destination='blog'){adminDestination=destination;await refreshShared(true);if(adminUnlocked)enterDashboard();else{setAuthMode();byId('blog-admin-auth').showModal();}}
  async function logoutAdmin(){if(cloudReady){try{await api('?action=logout','POST',{});}catch{byId('blog-admin-status').textContent='No se pudo cerrar la sesión del servidor. Reintenta con conexión.';return;}}adminUnlocked=false;byId('blog-dashboard').hidden=true;resetEditor();window.cityAdmin?.close();window.projectsAdmin?.close();await refreshShared();}
  function photoPreview() {
    byId('blog-photo-preview').src = uploadedCover || byId('blog-post-cover').value;
    byId('blog-photo-remove').hidden = !uploadedCover;
  }
  function resetPhoto() {
    uploadGeneration++; uploadedCover = null; uploadBusy = false;
    byId('blog-photo-upload').value = '';
    byId('blog-post-form').querySelector('button[type="submit"]').disabled = false;
    byId('blog-photo-status').textContent = 'JPG, PNG o WebP · máximo 8 MB. La foto se reduce automáticamente.';
    photoPreview();
  }
  async function uploadPhoto() {
    if (!adminUnlocked) return;
    const file = byId('blog-photo-upload').files?.[0]; if (!file) return;
    const generation = ++uploadGeneration; uploadBusy = true;
    byId('blog-post-form').querySelector('button[type="submit"]').disabled = true;
    byId('blog-photo-status').textContent = 'Preparando tu foto…';
    try {
      const cover = await window.BunnyBlogMedia.prepare(file);
      if (generation !== uploadGeneration || !adminUnlocked) return;
      uploadedCover = cover; photoPreview();
      byId('blog-photo-status').textContent = cloudReady ? 'Foto lista. Se publicará con el artículo en todos los dispositivos.' : 'Foto lista para tu copia local. Falta conectar Storage para publicarla.';
    } catch (error) { if (generation === uploadGeneration) byId('blog-photo-status').textContent = error.message || 'No se pudo preparar la foto.'; }
    finally { if (generation === uploadGeneration) { uploadBusy = false; byId('blog-post-form').querySelector('button[type="submit"]').disabled = false; } }
  }
  function renderAdmin() {
    if (!adminUnlocked) return;
    const list = byId('blog-admin-list'); list.replaceChildren();
    const ordered = [...posts].sort((a,b) => new Date(b.updated || b.created) - new Date(a.updated || a.created));
    byId('blog-admin-count').textContent = `${ordered.length} ${ordered.length === 1 ? 'entrada' : 'entradas'}`;
    ordered.forEach(post => {
      const row = make('article','admin-post-row');
      const state = make('span',`admin-post-state${post.published?'':' draft'}`,post.published?'PUBLICADA':'BORRADOR');
      const title = make('h4','',post.title);
      const meta = make('p','',`${post.category} · ${formatDate(post.updated || post.created)}`);
      const actions = make('div','admin-post-actions');
      const edit = make('button','','Editar'); edit.type='button'; edit.addEventListener('click',() => editPost(post.id));
      const toggle = make('button','',post.published?'Ocultar':'Publicar'); toggle.type='button'; toggle.addEventListener('click',() => togglePost(post.id));
      const remove = make('button','delete','Eliminar'); remove.type='button'; remove.addEventListener('click',() => deletePost(post.id));
      actions.append(edit,toggle,remove); row.append(state,title,meta,actions); list.append(row);
    });
  }
  async function editPost(id) {
    if (!adminUnlocked) return;
    let post = posts.find(item => item.id === id); if (!post) return;
    if(cloudReady){try{post=(await api(`?action=edit&id=${encodeURIComponent(id)}`)).post;}catch(error){byId('blog-admin-status').textContent=error.message;return;}}
    resetPhoto();
    byId('blog-post-id').value = post.id; byId('blog-post-title').value = post.title; byId('blog-post-category').value = post.category;
    byId('blog-post-cover').value = allowedCovers.has(post.cover) ? post.cover : 'assets/about-block-bunny.jpg';
    uploadedCover = window.BunnyBlogMedia.safeCover(post.cover) ? post.cover : null; photoPreview();
    byId('blog-post-excerpt').value = post.excerpt; byId('blog-post-body').value = post.body; byId('blog-post-published').checked = !!post.published;
    byId('blog-admin-status').textContent = `Editando “${post.title}”.`; byId('blog-post-title').focus();
  }
  async function togglePost(id) {
    if (!adminUnlocked) return;
    const post = posts.find(item => item.id === id); if (!post) return;
    if(cloudReady){try{const entry=(await api(`?action=edit&id=${encodeURIComponent(id)}`)).post;entry.published=!entry.published;await storeShared(entry);await refreshShared();}catch(error){byId('blog-admin-status').textContent=error.message;}return;}
    const before = posts.map(item => ({...item}));
    post.published = !post.published; post.updated = new Date().toISOString();
    if (savePosts()) { renderAdmin(); renderPublic(); }
    else { posts = before; byId('blog-admin-status').textContent = 'No se pudo guardar el cambio. Revisa el espacio disponible del navegador.'; }
  }
  async function deletePost(id) {
    if (!adminUnlocked) return;
    const post = posts.find(item => item.id === id); if (!post || !confirm(`¿Eliminar “${post.title}”? Esta acción no se puede deshacer.`)) return;
    if(cloudReady){try{await api(`?id=${encodeURIComponent(id)}`,'DELETE',{});localPosts=localPosts.filter(item=>item.id!==id);savePosts();resetEditor();await refreshShared();}catch(error){byId('blog-admin-status').textContent=error.message;}return;}
    const before = posts;
    posts = posts.filter(item => item.id !== id);
    if (savePosts()) { resetEditor(); renderAdmin(); renderPublic(); }
    else { posts = before; byId('blog-admin-status').textContent = 'No se pudo guardar el cambio. Inténtalo de nuevo.'; }
  }
  async function savePost(event) {
    event.preventDefault(); if (!adminUnlocked || uploadBusy) return;
    const id = byId('blog-post-id').value;
    const now = new Date().toISOString();
    const entry = {id:id || `post-${Date.now().toString(36)}`,title:byId('blog-post-title').value.trim(),category:byId('blog-post-category').value,cover:uploadedCover || byId('blog-post-cover').value,excerpt:byId('blog-post-excerpt').value.trim(),body:byId('blog-post-body').value.trim(),published:byId('blog-post-published').checked,created:now,updated:now};
    if (!entry.title || !entry.excerpt || !entry.body) { byId('blog-admin-status').textContent = 'Completa el título, el resumen y el artículo.'; return; }
    const existing = posts.findIndex(post => post.id === id);
    if (cloudReady) {
      if(existing>=0)entry.created=posts[existing].created;
      byId('blog-post-id').value=entry.id;
      const button=byId('blog-post-form').querySelector('button[type="submit"]');button.disabled=true;
      try {
        await storeShared(entry); resetEditor(); await refreshShared();
        byId('blog-admin-status').textContent=entry.published?'Publicación guardada en el servidor. Ya puede verse desde otros dispositivos, sin un nuevo deployment.':'Borrador guardado en el servidor; solo lo ve la administradora.';
      } catch(error) { byId('blog-admin-status').textContent=`${error.message} El texto sigue en el editor. El artículo aún no se publicó; vuelve a guardar cuando tengas conexión.`; }
      finally { button.disabled=false; }
      return;
    }
    const before = posts.map(post => ({...post}));
    if (existing >= 0) { entry.created = posts[existing].created; posts[existing] = entry; } else posts.push(entry);
    if (!savePosts()) { posts = before; byId('blog-admin-status').textContent = 'No se pudo guardar. Revisa el espacio disponible del navegador.'; return; }
    localPosts=posts.map(post=>({...post}));
    resetEditor(); byId('blog-admin-status').textContent = 'Copia local guardada. Aún no se publicó en otros dispositivos: conecta Storage e importa tus entradas.';
    renderAdmin(); renderPublic();
  }

  byId('blog-search').addEventListener('input',renderPublic);
  byId('blog-category-filter').addEventListener('change',renderPublic);
  byId('blog-reader-close').addEventListener('click',() => byId('blog-reader-dialog').close());
  byId('blog-share-native').addEventListener('click',sharePost);
  byId('blog-share-copy').addEventListener('click',copyPostLink);
  byId('blog-admin-open')?.addEventListener('click',() => openAdmin('blog'));
  byId('city-admin-open').addEventListener('click',() => openAdmin('city'));
  byId('blog-city-dashboard').addEventListener('click',() => openAdmin('city'));
  byId('blog-auth-close').addEventListener('click',() => byId('blog-admin-auth').close());
  byId('blog-auth-form').addEventListener('submit',authenticate);
  byId('blog-admin-logout').addEventListener('click',logoutAdmin);
  byId('blog-post-form').addEventListener('submit',savePost);
  byId('blog-post-cancel').addEventListener('click',resetEditor);
  byId('blog-import-local').addEventListener('click',importLocal);
  byId('blog-export-local').addEventListener('click',exportLocal);
  byId('blog-import-backup').addEventListener('change',importBackup);
  byId('blog-refresh').addEventListener('click',()=>refreshShared(true));
  byId('blog-photo-upload').addEventListener('change',uploadPhoto);
  byId('blog-photo-remove').addEventListener('click',resetPhoto);
  byId('blog-post-cover').addEventListener('change',resetPhoto);
  photoPreview();
  renderPublic();
  configureDashboard(); void refreshShared(true);
  addEventListener('online',()=>refreshShared(true));
  addEventListener('hashchange',()=>{if(['#blog','#podcast'].includes(location.hash))void refreshShared(true);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && ['','#inicio','#blog','#podcast'].includes(location.hash))void refreshShared(true);});
  setInterval(()=>{if(!document.hidden && ['','#inicio','#blog','#podcast'].includes(location.hash) && !adminUnlocked)void refreshShared();},30000);
  window.blogApp = {refresh:()=>refreshShared(true),count:() => posts.filter(post => post.published).length};
  window.mateAdmin = {isUnlocked:()=>adminUnlocked,open:openAdmin,logout:logoutAdmin};
})();
