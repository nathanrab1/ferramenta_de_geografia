#!/usr/bin/env python3
"""Gera as miniaturas dos mapas para os cartões da tela inicial.

    python3 ferramentas/gerar_miniaturas.py [id ...]

Para cada mapa (todos os que têm src/assets/data/<id>_iso.json, mais a sala
de aula; ou só os ids passados), abre src/assets/svg/<id>.svg em Chrome
headless, mostra só os países/estados da tabela (o resto do desenho some),
recorta em volta deles e grava src/assets/miniaturas/<id>.png com fundo
transparente. O PNG tem poucos KB: a tela inicial não precisa carregar os
SVGs inteiros.

Cada miniatura vem regionalizada pela coluna que o mapa abre por padrão
(colunaInicial em src/continentes.js). As cores seguem a ordem das regiões
(ordemValores): a 1ª região de todo mapa tem a mesma cor, a 2ª também etc.

A sala de aula não tem países: a miniatura é o desenho da sala
(src/assets/svg/sala.svg), com cada carteira na cor da sua região (1 a 6,
src/sala.js) e a lousa e a mesa do professor na cor da ferramenta.
"""
import json, subprocess, sys, tempfile
from pathlib import Path

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
RAIZ = Path(__file__).resolve().parent.parent
# Tamanho da imagem (2x o tamanho no cartão, para telas de alta densidade)
LARGURA, ALTURA = 280, 200
COR = '#405B7C'     # --color-primary-blue (lousa e mesa do professor)
# Cores das regiões, na ordem: tons fortes da paleta do bloco "Pintar"
# (src/components/BlocklyPanel.js), bem diferentes entre si
CORES = ['#e83c2c', '#ef8c34', '#f7cc3e', '#2eaa1c', '#4cbaba', '#2c5cfb', '#7c32fb', '#da3cda']

ESTILO = f'''html, body {{ margin: 0; background: transparent; overflow: hidden; }}
svg {{ width: {LARGURA}px; height: {ALTURA}px; display: block; }}
svg text {{ display: none; }}'''

# Funções comuns às duas páginas: pintar um elemento (e o que tem dentro)
# e recortar o viewBox em volta de uma lista de elementos
COMUM = f'''
const svg = document.querySelector('svg');
svg.removeAttribute('width'); svg.removeAttribute('height');
svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
const CORES = {json.dumps(CORES)};
function pintar(el, cor, contorno) {{
  for (const f of [el, ...el.querySelectorAll('*')]) {{
    f.style.setProperty('fill', cor, 'important');
    f.style.setProperty('stroke', contorno, 'important');
  }}
}}
function recortar(els) {{
  const inv = svg.getScreenCTM().inverse();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const el of els) {{
    const r = el.getBoundingClientRect();
    for (const [x, y] of [[r.left, r.top], [r.right, r.bottom]]) {{
      const p = new DOMPoint(x, y).matrixTransform(inv);
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }}
  }}
  const m = Math.max(x1 - x0, y1 - y0) * 0.03;
  svg.setAttribute('viewBox', [x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m].join(' '));
}}'''

def pagina(cid, svg, paises, iso):
    """Mapa: só os países da tabela, cada um na cor da sua região"""
    continentes = (RAIZ / 'src' / 'continentes.js').as_uri()
    return f'''<!DOCTYPE html><html><head><meta charset="utf-8"><style>{ESTILO}
svg * {{ fill: none !important; stroke: none !important; }}
svg [data-pais], svg [data-pais] * {{ stroke-width: 0.6px !important; vector-effect: non-scaling-stroke; }}
</style></head><body>{svg}<script type="module">
import {{ CONTINENTES }} from '{continentes}';
{COMUM}
const continente = CONTINENTES[{json.dumps(cid)}];
const coluna = continente.colunaInicial;
const paises = {json.dumps(paises, ensure_ascii=False)};
const iso = {json.dumps(iso, ensure_ascii=False)};
// Ordem das regiões: a do catálogo; valores fora dela vão no fim, em ordem alfabética
const ordem = [...((continente.ordemValores || {{}})[coluna] || [])];
for (const v of [...new Set(paises.map(p => p[coluna]))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR')))
  if (v != null && !ordem.includes(v)) ordem.push(v);
const els = [];
for (const p of paises) {{
  const el = document.getElementById(iso[p['País']]); if (!el) continue;
  el.setAttribute('data-pais', '');
  const i = ordem.indexOf(p[coluna]);
  pintar(el, i < 0 ? '#999999' : CORES[i % CORES.length], '#ffffff');
  els.push(el);
}}
recortar(els);
</script></body></html>'''

def pagina_sala(svg):
    """Sala: carteiras na cor da região (retângulos de src/sala.js, só para
    saber onde fica cada uma; depois saem), lousa e mesa do professor em azul"""
    sala_js = (RAIZ / 'src' / 'sala.js').as_uri()
    return f'''<!DOCTYPE html><html><head><meta charset="utf-8"><style>{ESTILO}
svg * {{ fill: {COR} !important; stroke: #ffffff !important; }}
</style></head><body>{svg}<script type="module">
import {{ adicionarRegioesSala, REGIOES_SALA }} from '{sala_js}';
{COMUM}
const desenho = [...svg.querySelectorAll('rect, path, polygon, circle, ellipse')];
adicionarRegioesSala(svg);
const regioes = REGIOES_SALA.map(r => svg.getElementById(r.id));
const caixa = el => el.getBoundingClientRect();
for (const el of desenho) {{
  const c = caixa(el), x = (c.left + c.right) / 2, y = (c.top + c.bottom) / 2;
  const i = regioes.findIndex(r => {{ const b = caixa(r); return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom; }});
  if (i >= 0) pintar(el, CORES[i % CORES.length], '#ffffff');
}}
for (const r of regioes) r.remove();
recortar(desenho);
</script></body></html>'''

def main():
    ids_mapas = sys.argv[1:] or ['sala'] + sorted(p.name[:-len('_iso.json')] for p in (RAIZ / 'src/assets/data').glob('*_iso.json'))
    destino = RAIZ / 'src' / 'assets' / 'miniaturas'
    destino.mkdir(exist_ok=True)
    for cid in ids_mapas:
        svg = (RAIZ / 'src/assets/svg' / f'{cid}.svg').read_text(encoding='utf-8')
        svg = svg[svg.find('<svg'):]
        if cid == 'sala':
            html = pagina_sala(svg)
        else:
            dados = RAIZ / 'src/assets/data'
            paises = json.loads((dados / f'{cid}_paises.json').read_text(encoding='utf-8'))
            iso = json.loads((dados / f'{cid}_iso.json').read_text(encoding='utf-8'))
            html = pagina(cid, svg, paises, iso)
        with tempfile.TemporaryDirectory() as tmp:
            arq = Path(tmp) / 'mini.html'
            arq.write_text(html, encoding='utf-8')
            png = destino / f'{cid}.png'
            subprocess.run([CHROME, '--headless', '--disable-gpu', '--hide-scrollbars',
                            '--default-background-color=00000000', '--force-device-scale-factor=1',
                            '--allow-file-access-from-files',
                            f'--window-size={LARGURA},{ALTURA}', '--virtual-time-budget=3000',
                            f'--screenshot={png}', arq.as_uri()],
                           capture_output=True, check=True)
        print(f'{png.relative_to(RAIZ)}: {png.stat().st_size // 1024} KB')

if __name__ == '__main__':
    main()
