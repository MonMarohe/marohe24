'use strict';
(()=>{
 const mount=document.getElementById('quiz-root');if(!mount)return;
 // Correct answers follow the user's supplied key, with two ambiguities
 // clarified in the question: La Paz is the seat of government; Botero was Colombian.
 const general=[
 ['¿Cuál es el único país que tiene frontera terrestre con Reino Unido?','Irlanda','Francia','Islandia','Noruega'],
 ['¿Cuál es el lago más profundo del mundo?','Lago Baikal','Lago Titicaca','Lago Victoria','Lago Superior'],
 ['¿Qué país africano mantuvo su independencia frente a la colonización europea, salvo una ocupación italiana?','Etiopía','Egipto','Kenia','Angola'],
 ['¿Cuál es el desierto más grande del mundo?','Antártida','Sahara','Gobi','Atacama'],
 ['¿Cuál es el hueso más pequeño del cuerpo humano?','Estribo','Yunque','Radio','Rótula'],
 ['¿Qué país tiene más islas en el mundo?','Suecia','Indonesia','Filipinas','Japón'],
 ['¿En qué año cayó el Muro de Berlín?','1989','1979','1991','1961'],
 ['¿Quién pintó «El Grito»?','Edvard Munch','Claude Monet','Pablo Picasso','Vincent van Gogh'],
 ['¿Qué ciudad es la sede de gobierno más alta del mundo?','La Paz','Quito','Bogotá','Katmandú'],
 ['¿Qué culturas desarrollaron el cero de manera independiente?','Mayas y matemáticos de la India','Incas y romanos','Egipcios y griegos','Fenicios y persas'],
 ['¿Cuál es la obra más larga de Shakespeare?','Hamlet','Macbeth','Otelo','Romeo y Julieta'],
 ['¿Qué órgano produce la insulina?','Páncreas','Hígado','Riñón','Bazo'],
 ['¿Qué metal tiene el punto de fusión más alto?','Tungsteno','Hierro','Oro','Aluminio'],
 ['¿Quién fue la primera mujer en ganar un Premio Nobel?','Marie Curie','Ada Lovelace','Rosalind Franklin','Jane Goodall'],
 ['¿Qué ciudad fue sepultada por el Vesubio en el año 79?','Pompeya','Atenas','Cartago','Roma'],
 ['¿Cuál es el país sin salida al mar más grande?','Kazajistán','Bolivia','Mongolia','Paraguay'],
 ['¿Qué filósofo dijo «Pienso, luego existo»?','René Descartes','Platón','Immanuel Kant','Aristóteles'],
 ['¿Cuál es la capital de Canadá?','Ottawa','Toronto','Montreal','Vancouver'],
 ['¿Qué gas hace que el pan suba?','Dióxido de carbono','Oxígeno','Helio','Nitrógeno'],
 ['¿Cuántos corazones tiene un pulpo?','Tres','Uno','Dos','Cuatro']
 ];
 const art=[
 ['¿Quién pintó «La noche estrellada»?','Vincent van Gogh','Claude Monet','Edvard Munch','Salvador Dalí'],
 ['¿En qué museo de París está la Mona Lisa?','El Louvre','Museo de Orsay','Centro Pompidou','Museo Rodin'],
 ['¿Qué artista mexicana es famosa por sus autorretratos con flores en la cabeza?','Frida Kahlo','Remedios Varo','Leonora Carrington','María Izquierdo'],
 ['¿Quién pintó «Guernica»?','Pablo Picasso','Joan Miró','Diego Rivera','Francisco de Goya'],
 ['¿Qué escultura griega famosa no tiene brazos?','Venus de Milo','Victoria de Samotracia','Discóbolo','Laocoonte'],
 ['¿Qué movimiento representa Dalí con sus relojes derretidos?','Surrealismo','Impresionismo','Cubismo','Barroco'],
 ['¿Quién esculpió «El David» y pintó la Capilla Sixtina?','Miguel Ángel','Donatello','Rafael','Bernini'],
 ['¿Qué artista pop es famoso por las latas de sopa Campbell?','Andy Warhol','Roy Lichtenstein','Keith Haring','Jean-Michel Basquiat'],
 ['¿Quién pintó «Las Meninas»?','Diego Velázquez','Francisco de Goya','El Greco','Caravaggio'],
 ['¿Qué técnica de Georges Seurat pinta con pequeños puntos?','Puntillismo','Fresco','Collage','Grabado'],
 ['¿Quién esculpió «El Pensador»?','Auguste Rodin','Henry Moore','Alberto Giacometti','Antonio Canova'],
 ['¿Qué estilo recargado de oro aparece en muchas iglesias de Cusco?','Barroco andino','Minimalismo','Art déco','Neoclasicismo'],
 ['¿Quién pintó «El nacimiento de Venus»?','Sandro Botticelli','Leonardo da Vinci','Tiziano','Rafael'],
 ['¿Cómo se llama el arte de doblar papel originario de Japón?','Origami','Ikebana','Batik','Caligrafía'],
 ['¿Qué artista callejero anónimo creó la niña con globo?','Banksy','Invader','JR','Shepard Fairey'],
 ['¿Qué museo de Bilbao tiene una fachada de titanio?','Guggenheim','Prado','Reina Sofía','Thyssen'],
 ['¿Qué artista colombiano pintó las célebres figuras voluminosas?','Fernando Botero','Fernando de Szyszlo','Joaquín Torres García','Oswaldo Guayasamín'],
 ['¿Qué describe el «sfumato» asociado con Leonardo da Vinci?','Difuminar los contornos suavemente','Pintar con puntos','Raspar la pintura','Usar solo pigmento dorado'],
 ['¿Qué obra de Leonardo alcanzó unos US$450 millones en subasta en 2017?','Salvator Mundi','La última cena','Mona Lisa','La dama del armiño'],
 ['¿Qué escuela mezcló tradiciones visuales europeas y andinas?','Escuela Cusqueña','Escuela de Barbizon','Bauhaus','Escuela veneciana']
 ];
 let set=null,index=0,score=0,choices=[];
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 function start(which){set=which==='arte'?art:general;index=0;score=0;draw();}
 function draw(){
  mount.replaceChildren();
  if(!set){
   const intro=document.createElement('div');intro.className='quiz-picker';
   intro.innerHTML='<div class="quiz-picker-copy"><h3>¿Qué quieres explorar?</h3><p>20 preguntas por reto. La respuesta correcta cambia de lugar en cada pregunta.</p></div>';
   for(const [name,label,kicker]of[['general','Cultura general','MUNDO · CIENCIA · HISTORIA'],['arte','Arte','OBRAS · ARTISTAS · IDEAS']]){
    const b=document.createElement('button');b.type='button';b.className=`quiz-cover quiz-cover-${name}`;
    b.setAttribute('aria-label',`Jugar reto de ${label.toLowerCase()}: 20 preguntas`);
    b.innerHTML=`<span class="quiz-cover-kicker">${kicker}</span><div class="quiz-cover-scene" aria-hidden="true"><span class="quiz-cover-symbol">${name==='general'?'🌎':'🎨'}</span><img src="assets/rabbit.png" alt=""><span class="quiz-cover-detail">${name==='general'?'◉ ◉':'✦ ● ✦'}</span></div><h3>${label}</h3><small>20 preguntas · Jugar →</small>`;
    b.onclick=()=>start(name);intro.append(b);
   }
   mount.append(intro);return;
  }
  const box=document.createElement('div');box.className='quiz-card';mount.append(box);
  if(index===set.length){
   box.innerHTML=`<span class="eyebrow">FINAL DEL RETO</span><h3 tabindex="-1">${score} de ${set.length} respuestas correctas</h3><p>Otra vuelta puede sorprenderte.</p>`;
   const b=document.createElement('button');b.type='button';b.textContent='Elegir otro reto';b.onclick=()=>{set=null;draw();mount.querySelector('.quiz-cover')?.focus();};box.append(b);box.querySelector('h3').focus({preventScroll:true});return;
  }
  const row=set[index];choices=shuffle(row.slice(1));
  const count=document.createElement('span');count.className='eyebrow';count.textContent=`PREGUNTA ${index+1} / ${set.length} · ${score} ACIERTOS`;
  const title=document.createElement('h3');title.textContent=row[0];title.tabIndex=-1;
  const opts=document.createElement('div');opts.className='quiz-options';
  const feedback=document.createElement('p');feedback.setAttribute('role','status');
  box.append(count,title,opts,feedback);
  choices.forEach(answer=>{
   const b=document.createElement('button');b.type='button';b.textContent=answer;
   b.onclick=()=>{
    const correct=answer===row[1];if(correct)score++;
    opts.querySelectorAll('button').forEach(el=>{el.disabled=true;el.classList.toggle('right',el.textContent===row[1]);el.classList.toggle('wrong',el===b&&!correct);});
    feedback.textContent=correct?'¡Correcto! ✦':`La respuesta es: ${row[1]}.`;
    const next=document.createElement('button');next.type='button';next.textContent=index===set.length-1?'Ver resultado':'Siguiente →';next.onclick=()=>{index++;draw();};box.append(next);next.focus({preventScroll:true});
   };
   opts.append(b);
  });
  title.focus({preventScroll:true});
 }
 draw();
})();
