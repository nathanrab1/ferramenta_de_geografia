#!/usr/bin/env python3
"""Gera as miniaturas dos mapas para os cartões da tela inicial.

    python3 ferramentas/gerar_miniaturas.py [id ...]

Para cada mapa (todos os que têm src/assets/data/<id>_iso.json, mais a sala
de aula; ou só os ids passados), abre src/assets/svg/<id>.svg em Chrome
headless, usa só os países/estados da tabela (o resto do desenho some),
recorta em volta deles e gera um SVG pequeno e simplificado: os contornos
vão para o tamanho da miniatura (280 x 200), com coordenadas arredondadas e
sem os pontos que não aparecem nessa escala (Douglas-Peucker).

O SVG vem regionalizado pela coluna que o mapa abre por padrão
(colunaInicial em src/continentes.js, na ordem de ordemValores): um grupo
<g class="r0">, <g class="r1">... por região, sem cor. A tela inicial pinta
cada grupo com uma cor sorteada a cada visita (variáveis --r0, --r1...).

Tudo vai para src/assets/miniaturas/miniaturas.js (um módulo com o texto de
cada SVG), que a tela inicial importa só quando aparece.

A sala de aula não tem países: as regiões são as carteiras de cada uma das
seis regiões (src/sala.js), e a lousa e a mesa do professor vão no grupo
"fixo", na cor da ferramenta.
"""
import json, re, subprocess, sys, tempfile, html as html_mod
from pathlib import Path

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / 'src' / 'assets' / 'miniaturas' / 'miniaturas.js'
LARGURA, ALTURA = 280, 200   # unidades do SVG da miniatura
TOLERANCIA = 0.35            # simplificação, nas mesmas unidades

# Geometria no navegador: converte cada elemento (path, rect, circle) em
# polígonos no espaço da miniatura, simplificados. Cada elemento da lista
# `itens` é {el, grupo}; o resultado sai em #saida como JSON {svg}
GEOMETRIA = f'''
const svg = document.querySelector('svg');
const LARG = {LARGURA}, ALT = {ALTURA}, TOL = {TOLERANCIA};
const raiz = svg.getScreenCTM().inverse();
const matriz = el => raiz.multiply(el.getScreenCTM());

// Pontos de um "d" (absolutos, por subcaminho). Curvas viram o ponto final:
// na miniatura a diferença não aparece
function subcaminhos(d) {{
  const toks = d.match(/[a-zA-Z]|-?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[-+]?\\d+)?/g) || [];
  const res = []; let atual = null, x = 0, y = 0, x0 = 0, y0 = 0, cmd = '', i = 0;
  const num = () => parseFloat(toks[i++]);
  const ponto = (nx, ny) => {{ x = nx; y = ny; atual.push([x, y]); }};
  while (i < toks.length) {{
    // Comando é uma letra sozinha (números como -10e-4 também têm letra)
    if (/^[a-zA-Z]$/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const bx = rel ? x : 0, by = rel ? y : 0;
    if (C === 'M') {{ atual = []; res.push(atual); ponto(bx + num(), by + num()); x0 = x; y0 = y; cmd = rel ? 'l' : 'L'; }}
    else if (C === 'L' || C === 'T') ponto(bx + num(), by + num());
    else if (C === 'H') ponto(bx + num(), y);
    else if (C === 'V') ponto(x, by + num());
    else if (C === 'C') {{ i += 4; ponto(bx + num(), by + num()); }}
    else if (C === 'S' || C === 'Q') {{ i += 2; ponto(bx + num(), by + num()); }}
    else if (C === 'A') {{ i += 5; ponto(bx + num(), by + num()); }}
    else if (C === 'Z') {{ x = x0; y = y0; }}
    else i++;
  }}
  return res.filter(s => s.length > 1);
}}
function poligonos(el) {{
  const t = el.tagName.toLowerCase();
  if (t === 'path') return subcaminhos(el.getAttribute('d') || '');
  if (t === 'rect') {{ const b = el.getBBox(); return [[[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]]]; }}
  if (t === 'circle' || t === 'ellipse') {{ const b = el.getBBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    return [Array.from({{ length: 16 }}, (_, k) => [cx + b.width / 2 * Math.cos(k * Math.PI / 8), cy + b.height / 2 * Math.sin(k * Math.PI / 8)])]; }}
  return [];
}}
// Douglas-Peucker
function simplificar(pts) {{
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let dmax = 0, idx = 0;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9;
  for (let k = 1; k < pts.length - 1; k++) {{
    const d = Math.abs(dy * pts[k][0] - dx * pts[k][1] + b[0] * a[1] - b[1] * a[0]) / L;
    if (d > dmax) {{ dmax = d; idx = k; }}
  }}
  if (dmax <= TOL) return [a, b];
  return [...simplificar(pts.slice(0, idx + 1)).slice(0, -1), ...simplificar(pts.slice(idx))];
}}
// Contorno fechado (último ponto = primeiro): para Douglas-Peucker o
// "segmento" entre as pontas teria comprimento zero e o contorno viraria 2
// pontos. Divide no ponto mais distante do início e simplifica as metades
function simplificarAnel(pts) {{
  let idx = 0, dmax = -1;
  for (let k = 1; k < pts.length; k++) {{
    const d = Math.hypot(pts[k][0] - pts[0][0], pts[k][1] - pts[0][1]);
    if (d > dmax) {{ dmax = d; idx = k; }}
  }}
  if (idx === 0 || idx === pts.length - 1) return simplificar(pts);
  return [...simplificar(pts.slice(0, idx + 1)).slice(0, -1), ...simplificar(pts.slice(idx))];
}}
function gerar(itens, grupos) {{
  // Polígonos de cada item no espaço da raiz
  const geo = itens.map(({{ el, grupo }}) => {{
    const m = matriz(el);
    return {{ grupo, polys: poligonos(el).map(p => p.map(([x, y]) => {{ const q = new DOMPoint(x, y).matrixTransform(m); return [q.x, q.y]; }})) }};
  }});
  // Caixa de tudo -> escala para a miniatura (centralizada, margem de 3%)
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const g of geo) for (const p of g.polys) for (const [x, y] of p) {{ x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }}
  const margem = 0.03, esc = Math.min(LARG / ((x1 - x0) * (1 + 2 * margem)), ALT / ((y1 - y0) * (1 + 2 * margem)));
  const ox = (LARG - (x1 - x0) * esc) / 2 - x0 * esc, oy = (ALT - (y1 - y0) * esc) / 2 - y0 * esc;
  const r = v => Math.round(v * 10) / 10;
  const porGrupo = Object.fromEntries(grupos.map(g => [g, '']));
  for (const g of geo) {{
    for (const p of g.polys) {{
      let pts = p.map(([x, y]) => [x * esc + ox, y * esc + oy]);
      // Ilhas e pedaços menores que meio ponto somem
      const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
      if (Math.max(...xs) - Math.min(...xs) < 0.5 && Math.max(...ys) - Math.min(...ys) < 0.5) continue;
      pts = simplificarAnel(pts).map(([x, y]) => [r(x), r(y)]);
      pts = pts.filter((q, k) => k === 0 || q[0] !== pts[k - 1][0] || q[1] !== pts[k - 1][1]);
      if (pts.length < 3) continue;
      porGrupo[g.grupo] += 'M' + pts.map(q => q.join(' ')).join('L') + 'Z';
    }}
  }}
  const corpo = grupos.filter(g => porGrupo[g]).map(g => `<path class="${{g}}" d="${{porGrupo[g]}}"/>`).join('');
  document.getElementById('saida').textContent =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${{LARG}} ${{ALT}}">${{corpo}}</svg>`;
}}'''

def pagina(cid, svg, paises, iso):
    """Mapa: só os países da tabela; região = valor da colunaInicial"""
    continentes = (RAIZ / 'src' / 'continentes.js').as_uri()
    return f'''<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>{svg}
<pre id="saida"></pre><script type="module">
import {{ CONTINENTES }} from '{continentes}';
{GEOMETRIA}
const continente = CONTINENTES[{json.dumps(cid)}];
const coluna = continente.colunaInicial;
const paises = {json.dumps(paises, ensure_ascii=False)};
const iso = {json.dumps(iso, ensure_ascii=False)};
// Ordem das regiões: a do catálogo; valores fora dela vão no fim, em ordem alfabética
const ordem = [...((continente.ordemValores || {{}})[coluna] || [])];
for (const v of [...new Set(paises.map(p => p[coluna]))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR')))
  if (v != null && !ordem.includes(v)) ordem.push(v);
const itens = [];
for (const p of paises) {{
  const pais = document.getElementById(iso[p['País']]); if (!pais) continue;
  const grupo = 'r' + ordem.indexOf(p[coluna]);
  const formas = /^(path|rect|circle|ellipse)$/i.test(pais.tagName) ? [pais] : [...pais.querySelectorAll('path, rect, circle, ellipse')];
  for (const el of formas) itens.push({{ el, grupo }});
}}
gerar(itens, ordem.map((_, i) => 'r' + i));
</script></body></html>'''

def pagina_sala(svg):
    """Sala: região de cada carteira pelos retângulos de src/sala.js (só
    para medir); lousa e mesa do professor no grupo "fixo" """
    sala_js = (RAIZ / 'src' / 'sala.js').as_uri()
    return f'''<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>{svg}
<pre id="saida"></pre><script type="module">
import {{ adicionarRegioesSala, REGIOES_SALA }} from '{sala_js}';
{GEOMETRIA}
const desenho = [...svg.querySelectorAll('rect, path, polygon, circle, ellipse')];
adicionarRegioesSala(svg);
const retangulos = REGIOES_SALA.map(r => svg.getElementById(r.id));
const caixa = el => el.getBoundingClientRect();
const itens = desenho.map(el => {{
  const c = caixa(el), x = (c.left + c.right) / 2, y = (c.top + c.bottom) / 2;
  const i = retangulos.findIndex(r => {{ const b = caixa(r); return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom; }});
  return {{ el, grupo: i < 0 ? 'fixo' : 'r' + i }};
}});
for (const r of retangulos) r.remove();
gerar(itens, ['fixo', ...REGIOES_SALA.map((_, i) => 'r' + i)]);
</script></body></html>'''

def gerar(cid):
    svg = (RAIZ / 'src/assets/svg' / f'{cid}.svg').read_text(encoding='utf-8')
    svg = svg[svg.find('<svg'):]
    if cid == 'sala':
        pag = pagina_sala(svg)
    else:
        dados = RAIZ / 'src/assets/data'
        paises = json.loads((dados / f'{cid}_paises.json').read_text(encoding='utf-8'))
        iso = json.loads((dados / f'{cid}_iso.json').read_text(encoding='utf-8'))
        pag = pagina(cid, svg, paises, iso)
    with tempfile.TemporaryDirectory() as tmp:
        arq = Path(tmp) / 'mini.html'
        arq.write_text(pag, encoding='utf-8')
        dom = subprocess.run([CHROME, '--headless', '--disable-gpu', '--allow-file-access-from-files',
                              '--virtual-time-budget=10000', '--dump-dom', arq.as_uri()],
                             capture_output=True, text=True, check=True).stdout
    m = re.search(r'<pre id="saida">(.*?)</pre>', dom, re.S)
    resultado = html_mod.unescape(m.group(1)) if m else ''
    if not resultado.startswith('<svg'):
        sys.exit(f'{cid}: a geração não produziu SVG')
    return resultado

def main():
    ids_mapas = sys.argv[1:] or ['sala'] + sorted(p.name[:-len('_iso.json')] for p in (RAIZ / 'src/assets/data').glob('*_iso.json'))
    # Mantém os mapas já gerados que não foram pedidos agora
    atuais = {}
    if DESTINO.exists():
        m = re.search(r'export const MINIATURAS = (\{.*\});', DESTINO.read_text(encoding='utf-8'), re.S)
        if m:
            atuais = json.loads(m.group(1))
    for cid in ids_mapas:
        atuais[cid] = gerar(cid)
        regioes = len(set(re.findall(r'class="(r\d+)"', atuais[cid])))
        print(f'{cid}: {regioes} regiões, {len(atuais[cid]) // 1024} KB')
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(
        '// Gerado por ferramentas/gerar_miniaturas.py: SVG simplificado de cada mapa,\n'
        '// com um <path class="r0">, "r1"... por região (sem cor: a tela inicial\n'
        '// pinta com as variáveis --r0, --r1...) e "fixo" para o que não muda.\n'
        f'export const MINIATURAS = {json.dumps(dict(sorted(atuais.items())), ensure_ascii=False, indent=4)};\n',
        encoding='utf-8')
    print(f'{DESTINO.relative_to(RAIZ)}: {DESTINO.stat().st_size // 1024} KB')

if __name__ == '__main__':
    main()
