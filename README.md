# 🗺️ Ferramenta de Regionalização - CLIC Geografia

Aplicação web interativa para ensino de regionalização de continentes usando programação visual com Blockly. A tela inicial escolhe o que regionalizar: a sala de aula (respostas de um Google Forms) ou um continente (América, Europa, Ásia, África ou Oceania).

## 📁 Estrutura do Projeto

```
📦 ferramente-de-geografia/
├── 📄 index.html                 # Página única: tela inicial e app Vue (painéis de dados, blocos e mapa)
├── 📂 src/
│   ├── 📄 continentes.js        # Catálogo dos continentes (arquivos, coluna inicial, ordem das regiões)
│   ├── 📄 sala.js               # Sala de aula: leitura da planilha do Forms, tabela e regiões sobre o desenho da sala
│   ├── 📂 components/            # Componentes Vue
│   │   └── BlocklyPanel.js      # Painel de programação visual
│   ├── 📂 utils/
│   │   └── ordenacao.js         # Ordenação dos países (tabela e laço)
│   ├── 📂 assets/
│   │   ├── 📂 data/             # Dados JSON, um par por continente
│   │   │   ├── america_paises.json / america_iso.json
│   │   │   ├── europa_paises.json / europa_iso.json
│   │   │   ├── asia_paises.json / asia_iso.json
│   │   │   ├── africa_paises.json / africa_iso.json
│   │   │   └── oceania_paises.json / oceania_iso.json
│   │   └── 📂 svg/              # Mapas SVG, um por continente
│   │       ├── sala.svg         # Desenho da sala de aula (lousa, mesa, 6x6 carteiras)
│   │       ├── america.svg
│   │       ├── europa.svg
│   │       ├── asia.svg
│   │       ├── africa.svg
│   │       └── oceania.svg
│   └── 📂 styles/
│       ├── colors.css           # Paleta de cores (variáveis CSS)
│       └── main.css             # Estilos globais
├── 📂 ferramentas/               # Conversores (planilha -> JSON, SVG bruto -> mapa da ferramenta)
│   ├── converter_tabela.py
│   ├── converter_mapa.py
│   └── converter_mapa.js
└── 📂 fontes/<continente>/       # Arquivos brutos (xlsx, svg) e a configuração da conversão de cada continente
```

## 🛠️ Tecnologias

- **Vue 3** - Framework JavaScript reativo
- **Blockly** - Programação visual
- **CSS3** - Estilização
- **SVG** - Mapas vetoriais

## 🚀 Como usar

1. Inicie um servidor HTTP local:
   ```bash
   python3 -m http.server 8000
   ```

2. Acesse no navegador:
   ```
   http://localhost:8000
   ```
   A tela inicial escolhe o continente; `http://localhost:8000/?continente=america` abre a ferramenta direto (link para os alunos).

### Sala de aula

`?continente=sala` regionaliza a própria turma (Aula 01 da sequência). O professor cria um Google Forms com a
pergunta "Onde você está sentado?" em grade de múltipla escolha (linhas Frente, Centro e Fundo; colunas Esquerda
e Direita) e perguntas numéricas sobre a sala (quantas canetas no estojo...), vincula as respostas a uma
planilha, compartilha a planilha como "Qualquer pessoa com o link" e cola o link na ferramenta (também aceita
um CSV). A pergunta de posição também pode ser uma coluna simples com respostas como "Frente esquerda".

A sala tem seis regiões (três fileiras por dois lados), e cada uma é uma linha da tabela, como um país:
quantidade de alunos e, para cada pergunta numérica, o total e a média. O laço "para cada região" pinta os
retângulos de borda arredondada que `src/sala.js` acrescenta, atrás das carteiras, ao desenho da sala
(`src/assets/svg/sala.svg`). Data/hora, nome e e-mail nunca entram. Quem marca mais de um lugar
conta só no primeiro (com aviso). "Atualizar respostas" relê a planilha; o projeto baixado guarda as respostas
e o link.

### Acrescentar um continente

1. `src/assets/svg/<id>.svg` — cada país é um elemento com `id` igual ao código ISO de 2 letras, em minúsculas
   (grupo `<g>` quando o país tem ilhas; círculo para países sem forma visível). Lagos ficam no grupo `#lakes`.
2. `src/assets/data/<id>_paises.json` — lista de objetos, uma chave por coluna da tabela, sempre com `"País"`.
3. `src/assets/data/<id>_iso.json` — nome do país → código ISO.
4. Entrada em `src/continentes.js` com `disponivel: true`, a coluna inicial, a ordem própria das regiões e (se preciso) os ids a ocultar do mapa.

Os arquivos 1–3 são gerados a partir dos brutos em `fontes/<id>/` (precisa de `openpyxl` e do Google Chrome):

```bash
python3 ferramentas/converter_tabela.py <id> "fontes/<id>/planilha.xlsx"   # usa fontes/<id>/tabela.config.json
python3 ferramentas/converter_mapa.py <id> "fontes/<id>/mapa-bruto.svg"    # usa fontes/<id>/mapa.config.js
```

O conversor de mapa limpa o SVG do Inkscape, renomeia/agrupa os países conforme a configuração, classifica os
caminhos sem nome em lago (dentro de um país) ou ilha (atribuída ao país mais próximo) e imprime um relatório
para conferência. As configurações da Europa e da Ásia servem de exemplo.

## 🎯 Funcionalidades

### ✅ Implementado
- Tela inicial de escolha do continente (cartões; continentes ainda sem dados aparecem "em breve")
- Interface com 3 painéis (Dados, Blockly, Mapa); botão com o nome do continente volta à tela inicial
- Tabela com 35 países da América, 50 da Europa, 50 da Ásia, 54 da África e 14 da Oceania (cada
  continente com as suas colunas). Países sem forma visível no mapa aparecem como pontos: Mônaco,
  San Marino e Vaticano na Europa; Singapura e Timor-Leste na Ásia; os cinco insulares da África e
  os dez insulares da Oceania têm um círculo. Taiwan, a Caxemira, o Saara Ocidental e territórios
  fora da tabela ficam cinza.
- **Um workspace por coluna da tabela**: o dropdown "Visualizar coluna" escolhe
  qual regionalização está sendo editada; os blocos de cada coluna ficam
  guardados (em memória) ao trocar de coluna, permitindo várias
  regionalizações no mesmo projeto. Ao trocar de coluna o mapa é limpo.
- Biblioteca de blocos conforme o tipo da coluna: sempre "Pintar", mais
  "se coluna = valor" (colunas de texto) ou "se >", "se <", "se entre", "se ="
  (colunas numéricas). A coluna dos blocos "se" é fixa (a do workspace).
- Bloco de iteração "para cada país" com animação de varredura e slider de velocidade
- Tabela ordenável pelos cabeçalhos (nome do país ou valor da coluna,
  crescente/decrescente; Região usa a ordem Norte, Central, Sul). A ordem da
  tabela é a ordem em que o laço pinta o mapa, e cada coluna lembra a sua
  ordenação.
- Legenda automática e tooltip do mapa com os valores da coluna
- Botão Parar / Resetar

- Baixar/abrir projeto: botões no painel Blockly salvam em um `.json` os
  blocos de todas as colunas, a ordenação de cada uma, a coluna em exibição
  e o continente, e reabrem esse arquivo depois (ou em outro computador).
  Abrir um projeto de outro continente troca de continente antes de abrir.

### 🔜 Próximas features
- Persistência automática no navegador (localStorage)

## 📚 Sequência Didática

Baseado na sequência interdisciplinar de Geografia do CLIC para 8º ano:
- **Aula 01-02**: Regionalização e critérios
- **Aula 03-04**: Leitura computacional e criação de visualizações
- **Aula 05-06**: Reflexão e apresentação

## 👨‍💻 Desenvolvimento

Estrutura modular com componentes separados para facilitar manutenção e expansão.

---

**Desenvolvido para CLIC - Teachers College, Columbia University**
