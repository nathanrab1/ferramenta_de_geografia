# 🗺️ Ferramenta de Regionalização - CLIC Geografia

Aplicação web interativa para ensino de regionalização do continente americano usando programação visual com Blockly.

## 📁 Estrutura do Projeto

```
📦 ferramente-de-geografia/
├── 📄 index.html                 # Página principal (app Vue, painéis de dados e mapa)
├── 📂 src/
│   ├── 📂 components/            # Componentes Vue
│   │   └── BlocklyPanel.js      # Painel de programação visual
│   ├── 📂 utils/
│   │   └── ordenacao.js         # Ordenação dos países (tabela e laço)
│   ├── 📂 assets/
│   │   ├── 📂 data/             # Dados JSON
│   │   │   ├── paises_data.json
│   │   │   └── paises_iso_mapping.json
│   │   └── 📂 svg/              # Imagens SVG
│   │       └── america_map.svg
│   └── 📂 styles/
│       ├── colors.css           # Paleta de cores (variáveis CSS)
│       └── main.css             # Estilos globais
└── 📂 [CLIC]/                   # Materiais pedagógicos (PDFs)
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

## 🎯 Funcionalidades

### ✅ Implementado
- Interface com 3 painéis (Dados, Blockly, Mapa)
- Tabela com 35 países da América
- **Um workspace por coluna da tabela**: o dropdown "Visualizar coluna" escolhe
  qual regionalização está sendo editada; os blocos de cada coluna ficam
  guardados (em memória) ao trocar de coluna, permitindo várias
  regionalizações no mesmo projeto. Ao trocar de coluna o mapa é limpo.
- Biblioteca de blocos conforme o tipo da coluna: sempre "Pintar", mais
  "se coluna = valor" (colunas de texto) ou "se >", "se <", "se entre"
  (colunas numéricas). A coluna dos blocos "se" é fixa (a do workspace).
- Bloco de iteração "para cada país" com animação de varredura e slider de velocidade
- Tabela ordenável pelos cabeçalhos (nome do país ou valor da coluna,
  crescente/decrescente; Região usa a ordem Norte, Central, Sul). A ordem da
  tabela é a ordem em que o laço pinta o mapa, e cada coluna lembra a sua
  ordenação.
- Legenda automática e tooltip do mapa com os valores da coluna
- Botão Parar / Resetar

### 🔜 Próximas features
- Salvar/carregar projetos (persistência dos workspaces)

## 📚 Sequência Didática

Baseado na sequência interdisciplinar de Geografia do CLIC para 8º ano:
- **Aula 01-02**: Regionalização e critérios
- **Aula 03-04**: Leitura computacional e criação de visualizações
- **Aula 05-06**: Reflexão e apresentação

## 👨‍💻 Desenvolvimento

Estrutura modular com componentes separados para facilitar manutenção e expansão.

---

**Desenvolvido para CLIC - Teachers College, Columbia University**
