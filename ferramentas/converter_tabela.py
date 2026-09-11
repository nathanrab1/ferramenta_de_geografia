#!/usr/bin/env python3
"""Converte a planilha de um continente nos JSONs da ferramenta.

    python3 ferramentas/converter_tabela.py <id> "<planilha.xlsx>"

Lê fontes/<id>/tabela.config.json:
    { "descartar": [colunas a não incluir],
      "iso": { "Nome do país": "código ISO", ... } }
e grava src/assets/data/<id>_paises.json e src/assets/data/<id>_iso.json.
Textos são aparados; "Indisponível"/"-"/vazio viram null; inteiros gravados
como 357021.0 viram 357021; IDH fica com 3 casas. Asteriscos no fim do nome
do país (marca de "transcontinental" em algumas planilhas) são removidos.
"""
import json, sys
from pathlib import Path
import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
AUSENTE = {'indisponível', 'indisponivel', 'n/d', 'nd', '-', ''}

def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    cid, planilha = sys.argv[1], sys.argv[2]
    config = json.loads((RAIZ / 'fontes' / cid / 'tabela.config.json').read_text(encoding='utf-8'))
    descartar, iso = set(config.get('descartar', [])), config['iso']

    ws = openpyxl.load_workbook(planilha, data_only=True).worksheets[0]
    linhas = list(ws.iter_rows(values_only=True))
    cabecalho = [str(h).strip() for h in linhas[0]]
    paises = []
    for linha in linhas[1:]:
        if not linha[0]:
            continue
        pais = {}
        for coluna, valor in zip(cabecalho, linha):
            if coluna in descartar:
                continue
            if isinstance(valor, str):
                valor = valor.strip()
                if coluna == 'País':
                    valor = valor.rstrip('*').strip()
                if valor.lower() in AUSENTE:
                    valor = None
            elif isinstance(valor, float):
                valor = int(valor) if valor.is_integer() and coluna != 'IDH' else round(valor, 3)
            pais[coluna] = valor
        paises.append(pais)

    nomes = [p['País'] for p in paises]
    faltam = [n for n in nomes if n not in iso]
    sobram = [n for n in iso if n not in nomes]
    if faltam or sobram:
        sys.exit(f'Sem ISO na config: {faltam}\nNa config mas não na planilha: {sobram}')

    dados = RAIZ / 'src' / 'assets' / 'data'
    (dados / f'{cid}_paises.json').write_text(json.dumps(paises, ensure_ascii=False, indent=2), encoding='utf-8')
    (dados / f'{cid}_iso.json').write_text(json.dumps({n: iso[n] for n in nomes}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(paises)} países; colunas: {list(paises[0])}')
    for coluna in paises[0]:
        vazios = [p['País'] for p in paises if p[coluna] is None]
        if vazios:
            print(f'  vazios em "{coluna}": {vazios}')

if __name__ == '__main__':
    main()
