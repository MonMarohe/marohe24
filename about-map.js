'use strict';
(() => {
  const find = id => document.getElementById(id);
  const labels = {videojuegos:'Videojuegos', pwa:'PWA', arquitectura:'Arquitectura creativa', juegos:'Juegos creativos', kits:'DIY kits', comida:'Comida creativa'};
  const recipes = {
    'arquitectura+videojuegos':['Mundos que se recorren','Imaginamos espacios y paisajes que se pueden explorar jugando: del boceto al recorrido interactivo.','#play/games','Explorar los juegos ↗'],
    'arquitectura+pwa':['Ideas que habitan la web','Un espacio puede comenzar con una historia, un plano y una experiencia digital para recorrerlo a tu manera.','#podcast','Escuchar el podcast ↗'],
    'arquitectura+juegos':['Espacios para jugar','Exploramos instalaciones, recorridos y pequeños escenarios donde la curiosidad abre nuevas formas de habitar.','#play/games','Descubrir ideas ↗'],
    'arquitectura+kits':['Pequeñas ideas, nuevos espacios','Maquetas, texturas y kits para experimentar con las manos y dar forma a tus ideas sobre el espacio.','#agency/portfolio','Explorar el portafolio ↗'],
    'arquitectura+comida':['Una mesa con historia','Una bebida, un objeto y el lugar que los reúne: imaginamos encuentros donde el espacio también cuenta una historia.','#play/ruletas','Explorar las ruletas ↗'],
    'juegos+videojuegos': ['Un juego con identidad', 'Diseñamos videojuegos y juegos creativos con personajes, misiones y una estética que conecta con tu comunidad.', '#episodios', 'Explorar los juegos ↗'],
    'pwa+videojuegos': ['Una experiencia que vive en la web', 'Combinamos una PWA y una mecánica de juego para que tu idea acompañe a las personas desde cualquier pantalla.', '#episodios', 'Ver episodios ↗'],
    'juegos+pwa': ['Jugar en cualquier lugar', 'Creamos experiencias ligeras, accesibles y memorables para web y móvil, con una historia que invita a volver.', '#episodios', 'Probar una experiencia ↗'],
    'kits+videojuegos': ['Del juego a las manos', 'Unimos un videojuego con un DIY kit para que la historia continúe fuera de la pantalla.', '#agency/portfolio', 'Ver el portafolio ↗'],
    'comida+videojuegos': ['Una aventura para saborear', 'Diseñamos juegos, bebidas y momentos de comida creativa que convierten una idea en una experiencia completa.', '#agency/comida', 'Conocer Comida ↗'],
    'juegos+kits': ['Crear, jugar y compartir', 'Un juego creativo y un kit pueden abrir una mesa de encuentro para eventos, marcas y comunidades.', '#agency/portfolio', 'Ver el portafolio ↗'],
    'comida+kits': ['Un kit que se puede probar', 'Combinamos DIY kits y comida creativa para diseñar talleres, activaciones y recuerdos con personalidad.', '#agency/comida', 'Explorar Comida ↗'],
    'kits+pwa': ['Una guía que se construye contigo', 'Una PWA acompaña el paso a paso de un kit para que cada persona pueda crear a su ritmo.', '#agency/portfolio', 'Ver el portafolio ↗'],
    'comida+pwa': ['Una experiencia para llevar', 'Conectamos comida creativa con una experiencia digital sencilla para acompañar eventos y lanzamientos.', '#agency/comida', 'Conocer Comida ↗'],
    'comida+juegos': ['Un encuentro para recordar', 'Juegos creativos y comida con identidad convierten cualquier evento en una historia compartida.', '#agency/comida', 'Explorar Comida ↗']
  };
  let selected = [];
  const interests = [...document.querySelectorAll('[data-interest]')];
  function updateMix() {
    interests.forEach(button => button.setAttribute('aria-pressed', String(selected.includes(button.dataset.interest))));
    find('mix-slot-one').textContent = labels[selected[0]] || 'Tu interés';
    find('mix-slot-two').textContent = labels[selected[1]] || 'Otra chispa';
    find('mix-create').disabled = selected.length !== 2;
    find('mix-status').textContent = selected.length === 2 ? 'Tu mezcla está lista. Puedes cambiarla quitando un interés.' : selected.length === 1 ? 'Ya tienes una chispa. Elige un segundo interés.' : 'Elige dos intereses para comenzar.';
    find('mix-result').hidden = true;
  }
  interests.forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.interest;
    if (selected.includes(key)) selected = selected.filter(value => value !== key);
    else if (selected.length < 2) selected.push(key);
    else { find('mix-status').textContent = 'Toca uno de los intereses elegidos para quitarlo y probar otro.'; return; }
    updateMix();
  }));
  find('mix-create').addEventListener('click', () => {
    if (selected.length !== 2) return;
    const recipe = recipes[[...selected].sort().join('+')] || ['Una idea con muchas posibilidades','Combinemos tus intereses para encontrar una nueva forma de crear.','#agency/portfolio','Ver el portafolio ↗'];
    find('mix-title').textContent = recipe[0];
    find('mix-copy').textContent = recipe[1];
    find('mix-link').href = recipe[2];
    find('mix-link').textContent = recipe[3];
    find('mix-result').hidden = false;
    find('mix-status').textContent = 'Una combinación para tu proyecto. Conversemos y hagámosla realidad.';
  });
  find('mix-reset').addEventListener('click', () => { selected = []; updateMix(); });
})();
