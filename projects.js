(() => {
  'use strict';
  const root = document.querySelector('#studio-portfolio');
  if (!root) return;
  const seed = [
    ['escenografias', 'Escenografías', 'Escenas, vestuario y luz para contar historias.', 'scene-01.jpg'],
    ['comida', 'Comida', 'Experiencias para beber y comer con color.', 'food-boba-taro.jpg'],
    ['ropa', 'Ropa', 'Diseño, ilustración y color para llevar contigo.', 'tuks-polo-cusco.jpg'],
    ['animaciones', 'Animaciones', 'Diversión y buenas noticias para elevar tu espíritu.', 'dr-happy-cover.png']
  ].map(([id, title, description, cover]) => ({id, title, description, cover, category: id, items: []}));
  const media = {
    escenografias: Array.from({length: 12}, (_, i) => 'scene-' + String(i + 1).padStart(2, '0') + '.jpg'),
    comida: [
      'assets/boba-marohe-taro.jpg', 'assets/boba-marohe-matcha.jpg', 'assets/boba-marohe-matcha-coca.jpg', 'assets/boba-marohe-taro-chicha.jpg',
      'assets/kit-marohe-matcha-coca.jpg', 'assets/kit-marohe-matcha.jpg', 'assets/kit-marohe-pintura.jpg', 'assets/kit-marohe-taro-chicha.jpg', 'assets/kit-marohe-taro.jpg', 'assets/kit-marohe-velas.jpg',
      'food-boba-purple.jpg', 'food-boba-taro.jpg',
      'food-kit-cement-paint.jpg', 'food-kit-candle.jpg', 'food-kit-matcha.jpg', 'food-kit-chicha.jpg'
    ],
    ropa: ['tuks-polo-cusco.jpg', 'tuks-polo-peru.jpg', 'tuks-pair.png', 'tuks-front.png', 'tuks-street.png'],
    animaciones: ['dr-happy-cover.png', 'dr-happy-animation.mp4']
  };
  const names = Object.fromEntries(seed.map(p => [p.id, p.title]));
  const storeKey = 'marohe-portfolio-projects-v1';
  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || '{}');
      return {
        custom: Array.isArray(saved.custom) ? saved.custom.filter(p => p.id !== 'welcome-mate' && p.id !== 'la-tuks' && p.id !== 'dr-happy') : [],
        edits: saved.edits && typeof saved.edits === 'object' ? saved.edits : {}
      };
    } catch { return {custom: [], edits: {}}; }
  }
  function all() {
    const saved = read();
    return [...seed, ...saved.custom].map(p => ({...p, ...saved.edits[p.id]}));
  }
  const cats = root.querySelector('#projects-categories');
  const gallery = root.querySelector('#projects-gallery');
  const top = root.querySelector('.projects-top');
  const dialog = root.querySelector('#projects-admin-dialog');
  const form = root.querySelector('#projects-form');
  const message = root.querySelector('#projects-form-message');
  const list = root.querySelector('#projects-admin-list');
  const field = id => form.querySelector('#' + id);
  const unlocked = () => window.mateAdmin?.isUnlocked() === true;
  function asset(value) {
    if (typeof value !== 'string') return '';
    if (/^data:(image\/(jpeg|png|webp)|video\/mp4);base64,/i.test(value)) return value;
    if (/^assets\/[a-z0-9/_-]+\.(jpg|jpeg|png|webp|mp4)$/i.test(value)) return value;
    return /^[a-z0-9._-]+\.(jpg|jpeg|png|webp|mp4)$/i.test(value) ? 'assets/projects/' + value : '';
  }
  const isVideo = file => /^data:video\/mp4;/i.test(file) || /\.mp4$/i.test(file);
  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function filesOf(p) { return p.items?.length ? p.items : media[p.id] || [p.cover]; }
  function render() {
    const projects = all();
    cats.replaceChildren();
    for (const p of projects) {
      const link = make('a', 'project-category');
      link.href = '#agency/' + encodeURIComponent(p.id);
      const preview = isVideo(p.cover) ? make('div', 'project-video-cover', '▶') : make('img');
      if (preview.tagName === 'IMG') { preview.src = asset(p.cover); preview.alt = p.title; preview.loading = 'lazy'; }
      link.append(preview, make('span', '', p.title));
      cats.append(link);
    }
    let id = '';
    try { id = decodeURIComponent(location.hash.split('/')[1] || ''); } catch {}
    const inStudio = /^#(?:agency|about|proyectos)(?:\/|$)/.test(location.hash);
    const p = inStudio ? projects.find(x => x.id === id) : null;
    cats.hidden = !!p;
    top.hidden = !!p;
    gallery.hidden = !p;
    gallery.querySelectorAll('video').forEach(video => video.pause());
    gallery.replaceChildren();
    if (!p) {
      if (inStudio && (id === 'portfolio' || location.hash === '#proyectos')) requestAnimationFrame(() => root.scrollIntoView({block: 'start'}));
      return;
    }
    const intro = make('div', 'projects-gallery-heading');
    const back = make('a', 'projects-back', '← Todos los proyectos');
    back.href = '#agency/portfolio';
    const heading = make('h2', '', p.title);
    heading.tabIndex = -1;
    intro.append(back, heading, make('p', '', p.description));
    gallery.append(intro);
    const grid = make('div', 'project-photo-grid');
    filesOf(p).forEach((file, i) => {
      const figure = make('figure', 'project-media');
      const item = make(isVideo(file) ? 'video' : 'img');
      item.src = asset(file);
      if (item.tagName === 'VIDEO') { item.controls = true; item.preload = 'none'; item.setAttribute('playsinline', ''); item.setAttribute('aria-label', p.title + ', video'); }
      else { item.loading = 'lazy'; item.alt = p.title + ', imagen ' + (i + 1); }
      figure.append(item);
      grid.append(figure);
    });
    gallery.append(grid);
    requestAnimationFrame(() => root.scrollIntoView({block: 'start'}));
  }
  function renderAdmin() {
    list.replaceChildren();
    if (!unlocked()) return;
    for (const p of all()) {
      const row = make('div', 'project-admin-row');
      const label = make('span');
      label.append(make('strong', '', p.title), make('small', '', names[p.category] || p.category));
      const button = make('button', '', 'Editar');
      button.type = 'button';
      button.onclick = () => edit(p.id);
      row.append(label, button);
      list.append(row);
    }
  }
  function edit(id) {
    if (!unlocked()) return;
    const p = all().find(x => x.id === id);
    if (!p) return;
    form.reset();
    field('project-id').value = p.id;
    field('project-category').value = p.category;
    field('project-title').value = p.title;
    field('project-description').value = p.description;
    message.textContent = 'Editando ' + p.title + '.';
    field('project-title').focus();
  }
  function close() { dialog.close(); form.reset(); list.replaceChildren(); message.textContent = ''; }
  window.projectsAdmin = {
    open() { if (!unlocked()) return; renderAdmin(); if (!dialog.open) dialog.showModal(); },
    close
  };
  document.querySelector('#projects-admin-open').onclick = () => window.mateAdmin?.open('projects');
  root.querySelector('#projects-admin-close').onclick = close;
  root.querySelector('#projects-admin-logout').onclick = () => window.mateAdmin?.logout();
  root.querySelector('#project-new').onclick = () => {
    if (!unlocked()) return;
    form.reset(); field('project-id').value = ''; message.textContent = 'Crear un proyecto nuevo.';
  };
  const readFile = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
  form.onsubmit = async event => {
    event.preventDefault();
    if (!unlocked()) return;
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    try {
      const saved = read();
      const id = field('project-id').value || 'custom-' + Date.now();
      const old = all().find(p => p.id === id);
      const title = field('project-title').value.trim();
      const description = field('project-description').value.trim();
      if (!title || !description) throw new Error('Completa el título y la descripción.');
      const file = field('project-media').files[0];
      let cover = old?.cover || 'dr-happy-cover.png';
      let items = old?.items || [];
      if (file) {
        if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(file.type)) throw new Error('Elige una imagen JPG, PNG o WebP, o un video MP4.');
        if (file.size > 3 * 1024 * 1024) throw new Error('El archivo debe pesar menos de 3 MB para guardarlo en este navegador.');
        const uploaded = await readFile(file);
        items = old ? [...filesOf(old), uploaded] : [uploaded];
        if (!old || !isVideo(uploaded)) cover = uploaded;
      }
      if (!unlocked()) return;
      const entry = {id, category: field('project-category').value, title, description, cover, items};
      if (seed.some(p => p.id === id)) saved.edits[id] = entry;
      else { const pos = saved.custom.findIndex(p => p.id === id); if (pos < 0) saved.custom.push(entry); else saved.custom[pos] = entry; }
      localStorage.setItem(storeKey, JSON.stringify(saved));
      form.reset(); field('project-id').value = '';
      message.textContent = 'Proyecto guardado en este navegador.';
      render(); renderAdmin();
    } catch (error) {
      message.textContent = error.name === 'QuotaExceededError' ? 'El navegador no tiene espacio suficiente. Usa un archivo más pequeño; tus cambios anteriores se conservaron.' : error.message;
    } finally { button.disabled = false; }
  };
  addEventListener('hashchange', render);
  render();
})();
