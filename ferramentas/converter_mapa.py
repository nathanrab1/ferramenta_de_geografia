#!/usr/bin/env python3
"""Converte o mapa bruto de um continente no SVG da ferramenta.

    python3 ferramentas/converter_mapa.py <id> "<entrada.svg>"

Lê fontes/<id>/mapa.config.js, roda ferramentas/converter_mapa.js em Chrome
headless (o script precisa de geometria do navegador) e grava
src/assets/svg/<id>.svg. Imprime o relatório da classificação (lago/ilha).
"""
import html, re, subprocess, sys, tempfile
from pathlib import Path

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
RAIZ = Path(__file__).resolve().parent.parent

def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    cid, entrada = sys.argv[1], Path(sys.argv[2])
    config = RAIZ / 'fontes' / cid / 'mapa.config.js'
    saida = RAIZ / 'src' / 'assets' / 'svg' / f'{cid}.svg'

    svg = entrada.read_text(encoding='utf-8')
    svg = svg[svg.find('<svg'):]
    pagina = (
        '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>'
        f'<div>{svg}</div><textarea id="saida"></textarea><pre id="relatorio"></pre>'
        f'<script>{config.read_text(encoding="utf-8")}</script>'
        f'<script>{(RAIZ / "ferramentas" / "converter_mapa.js").read_text(encoding="utf-8")}</script>'
        '</body></html>'
    )
    with tempfile.TemporaryDirectory() as tmp:
        arq = Path(tmp) / 'converter.html'
        arq.write_text(pagina, encoding='utf-8')
        dom = subprocess.run(
            [CHROME, '--headless=new', '--disable-gpu', '--virtual-time-budget=8000',
             '--dump-dom', arq.as_uri()],
            capture_output=True, text=True, encoding='utf-8').stdout

    def entre(ini, fim):
        a = dom.find(ini) + len(ini)
        return html.unescape(dom[a:dom.find(fim, a)])
    xml = entre('<textarea id="saida">', '</textarea>')
    relatorio = entre('<pre id="relatorio">', '</pre>')
    if not xml.startswith('<svg'):
        sys.exit('A conversão não produziu SVG. Relatório:\n' + relatorio)

    # Sobras do Inkscape que o navegador não remove por causa do prefixo
    xml = re.sub(r'\s*<sodipodi:namedview[^>]*/>', '', xml)
    xml = re.sub(r' (sodipodi|inkscape):[\w-]+="[^"]*"', '', xml)
    xml = xml.replace(' xmlns:svg="http://www.w3.org/2000/svg"', '')
    xml = re.sub(r'\n(\s*\n)+', '\n', xml)

    cabecalho = (RAIZ / 'fontes' / cid / 'mapa.cabecalho.txt')
    cab = cabecalho.read_text(encoding='utf-8') if cabecalho.exists() else ''
    saida.write_text('<?xml version="1.0" encoding="UTF-8"?>\n' + cab + xml + '\n', encoding='utf-8')
    print(relatorio)
    avisos = [l for l in relatorio.splitlines() if l.startswith(('FALTA', 'AVISO'))]
    print(f'\n{saida.relative_to(RAIZ)}: {len(xml)} bytes; {len(avisos)} avisos')

if __name__ == '__main__':
    main()
