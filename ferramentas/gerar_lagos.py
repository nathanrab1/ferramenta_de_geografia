#!/usr/bin/env python3
"""Gera a água dos lagos que são buracos no mapa (ex.: Grandes Lagos da África).

    python3 ferramentas/gerar_lagos.py <id> [área mínima] [fechar]

Em alguns mapas os lagos não são elementos: são o espaço que nenhum país
cobre (Vitória, Tanganica, Malawi na África), e aparecem com a cor do fundo.
Este script desenha src/assets/svg/<id>.svg numa imagem (Chrome headless),
fecha as frestinhas entre as fronteiras (que ligam os lagos ao mar), acha
os buracos fechados maiores que a área mínima e grava o contorno deles,
um pouco engordado, em src/lagos/<id>.js. O MapaPanel põe essa forma azul
ATRÁS dos países (prepararMapa em src/continentes.js): os países cobrem a
sobra e a água aparece só no lago.
"""
import html, subprocess, sys, tempfile, json
from pathlib import Path

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
RAIZ = Path(__file__).resolve().parent.parent
ESCALA = 2        # pixels por unidade do viewBox na imagem de trabalho
FECHAR = 1        # px: fecha frestas entre fronteiras mais finas que isso
ENGORDAR = 3      # px além do que FECHAR encolheu: a água passa por baixo dos países

def pagina(svg, area_minima, fechar):
    return '''<html><body><pre id="saida"></pre><script>
const svgTxt = %s, ESC = %d, FECHAR = %d, ENGORDAR = %d, AREA = %d;
const vb = svgTxt.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);
const W = Math.ceil(vb[2] * ESC), H = Math.ceil(vb[3] * ESC);
const txt = svgTxt.replace('<svg', `<svg width="${W}" height="${H}"`)
  .replace(/<\\/svg>\\s*$/, '<style>*{fill:#000!important;stroke:none!important}</style></svg>');
const img = new Image();
img.onload = () => {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H).data, N = W * H;
  let terra = new Uint8Array(N); for (let i = 0; i < N; i++) terra[i] = d[i * 4] < 128 ? 1 : 0;
  // Dilata a terra (quadrado de raio r): fecha as frestas entre países
  const dilatar = (m, r) => {
    const h = new Uint8Array(N), o = new Uint8Array(N);
    for (let y = 0; y < H; y++) { let ult = -1e9; for (let x = 0; x < W; x++) { if (m[y*W+x]) ult = x; if (x - ult <= r) h[y*W+x] = 1; }
      ult = 1e9; for (let x = W - 1; x >= 0; x--) { if (m[y*W+x]) ult = x; if (ult - x <= r) h[y*W+x] = 1; } }
    for (let x = 0; x < W; x++) { let ult = -1e9; for (let y = 0; y < H; y++) { if (h[y*W+x]) ult = y; if (y - ult <= r) o[y*W+x] = 1; }
      ult = 1e9; for (let y = H - 1; y >= 0; y--) { if (h[y*W+x]) ult = y; if (ult - y <= r) o[y*W+x] = 1; } }
    return o;
  };
  const fechada = dilatar(terra, FECHAR);
  // Mar: tudo que não é terra e se liga à borda da imagem
  const mar = new Uint8Array(N), pilha = [];
  for (let x = 0; x < W; x++) pilha.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) pilha.push(y * W, y * W + W - 1);
  while (pilha.length) { const p = pilha.pop(); if (mar[p] || fechada[p]) continue; mar[p] = 1;
    const x = p %% W; if (x > 0) pilha.push(p - 1); if (x < W - 1) pilha.push(p + 1); if (p >= W) pilha.push(p - W); if (p < N - W) pilha.push(p + W); }
  // Buracos fechados grandes = lagos
  const lago = new Uint8Array(N), visto = new Uint8Array(N), relatorio = [];
  for (let p = 0; p < N; p++) {
    if (fechada[p] || mar[p] || visto[p]) continue;
    const comp = [p]; visto[p] = 1;
    for (let i = 0; i < comp.length; i++) { const u = comp[i], x = u %% W;
      for (const v of [x > 0 ? u - 1 : -1, x < W - 1 ? u + 1 : -1, u - W, u + W])
        if (v >= 0 && v < N && !fechada[v] && !mar[v] && !visto[v]) { visto[v] = 1; comp.push(v); } }
    if (comp.length >= AREA) { for (const u of comp) lago[u] = 1;
      const xs = comp.map(u => u %% W), ys = comp.map(u => (u / W) | 0);
      relatorio.push(`lago: ${comp.length} px, x ${Math.min(...xs) / ESC}-${Math.max(...xs) / ESC}, y ${Math.min(...ys) / ESC}-${Math.max(...ys) / ESC}`); }
  }
  const agua = dilatar(lago, FECHAR + ENGORDAR);
  // Contorno em faixas horizontais de 1 unidade do viewBox: "M x y h w v 1 h -w z"
  let dPath = '';
  for (let yu = 0; yu < vb[3]; yu++) {
    let x = 0; const linha = new Uint8Array(W);
    for (let s = 0; s < ESC; s++) { const y = yu * ESC + s; if (y < H) for (let i = 0; i < W; i++) if (agua[y*W+i]) linha[i] = 1; }
    while (x < W) { if (!linha[x]) { x++; continue; } const ini = x; while (x < W && linha[x]) x++;
      const a = (vb[0] + ini / ESC).toFixed(1), w = ((x - ini) / ESC).toFixed(1);
      dPath += `M${+a} ${vb[1] + yu}h${+w}v1h-${+w}z`; }
  }
  document.getElementById('saida').textContent = JSON.stringify({ d: dPath, relatorio });
};
img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt);
</script></body></html>''' % (json.dumps(svg), ESCALA, fechar, ENGORDAR, area_minima)

def main():
    if len(sys.argv) not in (2, 3, 4):
        sys.exit(__doc__)
    cid = sys.argv[1]
    area_minima = int(sys.argv[2]) if len(sys.argv) >= 3 else 400
    fechar = int(sys.argv[3]) if len(sys.argv) == 4 else FECHAR
    svg = (RAIZ / 'src/assets/svg' / f'{cid}.svg').read_text(encoding='utf-8')
    svg = svg[svg.find('<svg'):].strip()
    with tempfile.TemporaryDirectory() as tmp:
        arq = Path(tmp) / 'lagos.html'
        arq.write_text(pagina(svg, area_minima, fechar), encoding='utf-8')
        dom = subprocess.run([CHROME, '--headless', '--disable-gpu', '--virtual-time-budget=60000',
                              '--dump-dom', arq.as_uri()], capture_output=True, text=True).stdout
    ini = dom.find('<pre id="saida">') + len('<pre id="saida">')
    res = json.loads(html.unescape(dom[ini:dom.find('</pre>', ini)]))
    print('\n'.join(res['relatorio']) or 'nenhum lago encontrado')
    destino = RAIZ / 'src' / 'lagos'
    destino.mkdir(exist_ok=True)
    js = destino / f'{cid}.js'
    js.write_text(
        f'// Gerado por ferramentas/gerar_lagos.py a partir de src/assets/svg/{cid}.svg.\n'
        '// Água dos lagos que no mapa são buracos (espaço sem país): fica atrás dos\n'
        '// países, que cobrem a sobra (veja prepararMapa em src/continentes.js).\n'
        f"export const LAGOS = '{res['d']}';\n", encoding='utf-8')
    print(f'{js.relative_to(RAIZ)}: {js.stat().st_size // 1024} KB')

if __name__ == '__main__':
    main()
