// Converte um mapa SVG bruto (Wikimedia editado no Inkscape) no mapa da
// ferramenta: um elemento com id = código ISO por país (grupo quando o país
// tem ilhas/partes), lagos no grupo #lakes, cinza padrão, sem metadados.
//
// Roda no navegador porque precisa de geometria (getBBox, CTM,
// isPointInFill): converter_mapa.py monta a página, executa em Chrome
// headless e recolhe o resultado (#saida) e o relatório (#relatorio).
// A configuração do continente vem em window.CONFIG (fontes/<id>/mapa.config.js):
//   viewBox      viewBox do arquivo de saída
//   paises       códigos ISO dos países da tabela (o que será pintado)
//   renomear     { idBruto: idNovo } — ids trocados ou perdidos no Inkscape
//   desnomear    ids que não são o país que dizem ser (viram caminho sem nome)
//   agrupar      { iso: [ids...] } — partes separadas do mesmo país
//   correcoes    { idBruto: iso } — ilha atribuída a outro país que o mais próximo
//   micro        { iso: [x, y] } — países sem forma (ou só pontinhos),
//                desenhados como círculos; pontinhos perto do círculo são
//                atribuídos ao país como ilhas
//   raioMicro    raio desses círculos (padrão 1.8, nas unidades do viewBox)
//   desagrupar   ids de grupos a desfazer (as partes sobem, mantendo posição)
//   limparIds    (padrão false) remove todo id que não seja de país
//   tracoFino    ids cujos caminhos internos ganham traço mais fino (divisas
//                internas, como os estados da Austrália)
//   lagos        ids de lagos (quando não estão dentro de um país, ex.: Cáspio)
//   remover      ids a apagar (ex.: cópias pretas dos lagos por baixo deles)
//   neutros      ids que ficam cinza sem país (áreas disputadas); um id de
//                grupo neutraliza todos os caminhos dentro dele
//   distanciaMaxima  ilha mais longe que isso de qualquer país fica sem país
//   irmaosDoGrupo    (padrão true) caminho sem nome no mesmo grupo de um país
//                    é desse país — serve para os grupinhos do Inkscape
//                    (Europa); desligar quando os grupos são camadas inteiras
const CONFIG = window.CONFIG;
const svg = document.querySelector('svg');
const NS = 'http://www.w3.org/2000/svg';
const rel = [];
const log = (...a) => rel.push(a.join(' '));

// ---- 1. limpeza de Inkscape/metadata ----
for (const el of [...svg.children]) {
  // (style: folhas de estilo internas, como a do BlankMap da Wikimedia,
  // venceriam os atributos fill/stroke que o app usa)
  if (['namedview', 'sodipodi:namedview', 'metadata', 'defs', 'title', 'desc', 'style'].includes(el.localName)) el.remove();
}
for (const el of svg.querySelectorAll('*')) {
  for (const a of [...el.attributes]) {
    if (a.name.startsWith('inkscape:') || a.name.startsWith('sodipodi:') || a.name === 'clip-path') el.removeAttribute(a.name);
  }
}
for (const a of [...svg.attributes]) {
  if (a.name.startsWith('xmlns:') && a.name !== 'xmlns:svg') svg.removeAttribute(a.name);
  if (['id', 'version', 'width', 'height'].includes(a.name)) svg.removeAttribute(a.name);
}
svg.setAttribute('viewBox', CONFIG.viewBox);

// ---- 2. ids: tirar sufixos do Inkscape; correções conhecidas ----
for (const el of svg.querySelectorAll('[id]')) {
  el.id = el.id.replace(/(-\d+)+$/, '');
}
for (const id of CONFIG.remover || []) {
  const el = svg.querySelector('#' + CSS.escape(id));
  if (el) el.remove(); else log('AVISO remover: não achei', id);
}
const LAGOS_FIXOS = new Set(CONFIG.lagos || []);
const NEUTROS = new Set(CONFIG.neutros || []);
for (const id of CONFIG.neutros || []) {
  const el = svg.querySelector('#' + CSS.escape(id));
  if (el && el.tagName === 'g') for (const p of el.querySelectorAll('path')) NEUTROS.add(p.id);
}
for (const id of CONFIG.desnomear || []) {
  const el = svg.querySelector('#' + CSS.escape(id));
  if (el) el.id = 'path-' + id; else log('AVISO desnomear: não achei', id);
}
for (const [de, para] of Object.entries(CONFIG.renomear || {})) {
  const el = svg.querySelector('#' + CSS.escape(de));
  if (el) el.id = para; else log('AVISO renomear: não achei', de);
}

// ---- 3. geometria auxiliar ----
const raiz = svg.getScreenCTM();
const paraRaiz = raiz.inverse();
function ponto(x, y) { const p = svg.createSVGPoint(); p.x = x; p.y = y; return p; }
function centroRaiz(el) {
  const b = el.getBBox();
  return ponto(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(paraRaiz.multiply(el.getScreenCTM()));
}
function dentroDe(el, pRaiz) { // pRaiz no espaço da raiz -> testa no espaço local de el
  const local = pRaiz.matrixTransform(el.getScreenCTM().inverse().multiply(raiz));
  return el.isPointInFill(local);
}
function amostras(el, n = 200) {
  const m = paraRaiz.multiply(el.getScreenCTM());
  const L = el.getTotalLength(); const pts = [];
  for (let i = 0; i < n; i++) { const p = el.getPointAtLength(L * i / n); pts.push(p.matrixTransform(m)); }
  return pts;
}
function matrizPara(el, novoPai) { // transform que mantém el no lugar ao virar filho de novoPai
  const m = novoPai.getScreenCTM().inverse().multiply(el.getScreenCTM());
  return `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map(v => +v.toFixed(6)).join(',')})`;
}
function mover(el, novoPai) { el.setAttribute('transform', matrizPara(el, novoPai)); novoPai.appendChild(el); }

// ---- 4. países: geometria de cada um (para testes de lago/ilha e distância) ----
const PAISES = CONFIG.paises;
const AGRUPAR = CONFIG.agrupar || {};
const MICRO = CONFIG.micro || {};
// Microestados: círculos criados já aqui para entrarem na geometria (os
// pontinhos de ilhas em volta são atribuídos a eles por proximidade)
const RAIO = CONFIG.raioMicro ?? 1.8;
for (const [iso, [x, y]] of Object.entries(MICRO)) {
  const c = document.createElementNS(NS, 'circle');
  c.id = iso; c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', RAIO);
  c.setAttribute('fill', '#787878'); c.setAttribute('stroke', '#ffffff'); c.setAttribute('stroke-width', RAIO / 4.5);
  svg.appendChild(c);
}
const geometria = {};
for (const iso of PAISES) {
  const ids = AGRUPAR[iso] || [iso];
  const els = ids.map(id => svg.querySelector('#' + CSS.escape(id))).filter(Boolean);
  if (!els.length) { log('FALTA', iso); continue; }
  geometria[iso] = els.flatMap(el => el.tagName === 'g' ? [...el.querySelectorAll('path, circle')] : [el]);
}
const amostrasPais = Object.fromEntries(Object.entries(geometria).map(([iso, els]) => [iso, els.flatMap(e => amostras(e))]));

// ---- 5. classificar caminhos sem nome: lago (dentro de um país) ou ilha ----
const lagos = [], ilhas = {};
const CORRECOES = CONFIG.correcoes || {};
function paisDoGrupo(el) { // grupo que contém um país nomeado: os irmãos sem nome são dele
  const g = el.parentElement; if (g === svg) return null;
  for (const iso of PAISES) { const p = g.querySelector(':scope > #' + CSS.escape(iso)); if (p) return iso; }
  return null;
}
const DIST_MAX = CONFIG.distanciaMaxima ?? Infinity;
const semPais = [];
// Partes já atribuídas a um país em `agrupar` não passam pela classificação
// (testariam como "dentro" de si mesmas e virariam lago)
const PARTES = new Set(Object.values(AGRUPAR).flat());
const ehPais = (el) => el && el !== svg && PAISES.includes(el.id);
for (const el of [...svg.querySelectorAll('path')]) {
  if (!/^path/.test(el.id) || PARTES.has(el.id)) continue;
  if (LAGOS_FIXOS.has(el.id)) { lagos.push(el); log('lago (config)', el.id); continue; }
  if (NEUTROS.has(el.id)) { semPais.push(el); log('neutro', el.id); continue; }
  if (CORRECOES[el.id]) { (ilhas[CORRECOES[el.id]] ||= []).push(el); log('correção', el.id, '->', CORRECOES[el.id]); continue; }
  // Já está dentro do grupo de um país (ilhas do BlankMap): fica onde está
  if ([...svg.querySelectorAll('g')].some(g => ehPais(g) && g.contains(el))) continue;
  const c = centroRaiz(el);
  const irmao = (CONFIG.irmaosDoGrupo ?? true) ? paisDoGrupo(el) : null;
  if (irmao) { (ilhas[irmao] ||= []).push(el); log('grupo', el.id, '->', irmao); continue; }
  const dono = PAISES.find(iso => geometria[iso] && geometria[iso].some(g => dentroDe(g, c)));
  if (dono) { lagos.push(el); log('lago', el.id, 'em', dono); continue; }
  let melhor = null, dist = Infinity;
  for (const [iso, pts] of Object.entries(amostrasPais)) {
    for (const p of pts) { const d = Math.hypot(p.x - c.x, p.y - c.y); if (d < dist) { dist = d; melhor = iso; } }
  }
  if (dist > DIST_MAX) { semPais.push(el); log('ilha sem país', el.id, '(mais perto:', melhor, dist.toFixed(1) + ')'); continue; }
  (ilhas[melhor] ||= []).push(el); log('ilha', el.id, '->', melhor, 'dist', dist.toFixed(1));
}

// ---- 6. agrupar: g#iso com o caminho principal + ilhas + partes extras ----
function grupoDoPais(iso) {
  let el = svg.querySelector('#' + CSS.escape(iso));
  if (el && el.tagName === 'g') return el;
  const g = document.createElementNS(NS, 'g');
  g.id = iso;
  if (el) { el.parentElement.insertBefore(g, el); el.removeAttribute('id'); mover(el, g); }
  else { svg.appendChild(g); }
  return g;
}
for (const [iso, ids] of Object.entries(AGRUPAR)) {
  const els = ids.map(id => svg.querySelector('#' + CSS.escape(id))).filter(Boolean);
  if (!els.length) { log('AVISO agrupar: nenhuma parte de', iso); continue; }
  const g = document.createElementNS(NS, 'g'); g.id = iso;
  els[0].parentElement.insertBefore(g, els[0]);
  for (const el of els) { el.removeAttribute('id'); mover(el, g); }
}
for (const [iso, els] of Object.entries(ilhas)) {
  const g = grupoDoPais(iso);
  for (const el of els) { el.removeAttribute('id'); mover(el, g); }
}
// grupos de edição do Inkscape que sobraram: desfaz mantendo a posição
const DESAGRUPAR = new Set(CONFIG.desagrupar || []);
for (const g of [...svg.querySelectorAll('g')]) {
  if (!g.id || /^(g|layer)\d+$/.test(g.id) || DESAGRUPAR.has(g.id)) {
    if (g.children.length === 0) { g.remove(); continue; }
    for (const f of [...g.children]) mover(f, g.parentElement);
    g.remove();
  }
}

// ---- 7. lagos: grupo #lakes por cima (CSS do app pinta de azul) ----
const gl = document.createElementNS(NS, 'g'); gl.id = 'lakes'; svg.appendChild(gl);
for (const el of lagos) { el.removeAttribute('id'); mover(el, gl); }

// ---- 8. estilos: cinza padrão, sem opacidades; traço branco mantido ----
for (const el of svg.querySelectorAll('path, circle, polygon, ellipse')) {
  const st = el.getAttribute('style') || '';
  const sw = (st.match(/stroke-width:([\d.]+)/) || [])[1];
  el.removeAttribute('style'); el.removeAttribute('opacity'); el.removeAttribute('fill-opacity');
  el.setAttribute('fill', '#787878');
  if (el.closest('#lakes')) { el.setAttribute('stroke', 'none'); continue; }
  el.setAttribute('stroke', '#ffffff');
  el.setAttribute('stroke-width', sw || '0.3');
}
for (const g of svg.querySelectorAll('g')) { g.removeAttribute('style'); g.removeAttribute('opacity'); }
// Divisas internas mais finas (inline vence o stroke-width do CSS do app)
for (const id of CONFIG.tracoFino || []) {
  const el = svg.querySelector('#' + CSS.escape(id));
  if (el) for (const p of el.querySelectorAll('path')) p.setAttribute('style', 'stroke-width:calc(var(--traco, 1) * 0.35)');
}
// ids "path123" que sobraram ficam sem id
for (const el of svg.querySelectorAll('[id^="path"]')) el.removeAttribute('id');

// ---- 9. círculos dos microestados por cima de tudo (menos dos lagos) ----
for (const iso of Object.keys(MICRO)) {
  const el = svg.querySelector('#' + CSS.escape(iso));
  if (el) svg.insertBefore(el, gl);
}
if (CONFIG.limparIds) {
  const manter = new Set([...PAISES, 'lakes', ...Object.values(CONFIG.renomear || {})]);
  for (const el of svg.querySelectorAll('[id]')) if (!manter.has(el.id)) el.removeAttribute('id');
}

// ---- conferência final ----
for (const iso of PAISES) if (!svg.querySelector('#' + CSS.escape(iso))) log('FALTA NO RESULTADO', iso);

const xml = new XMLSerializer().serializeToString(svg);
document.getElementById('saida').textContent = xml;
document.getElementById('relatorio').textContent = rel.join('\n');
