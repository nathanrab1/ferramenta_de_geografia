# 🗺️ Ferramenta de Regionalização - CLIC Geografia

Aplicação web interativa para ensino de regionalização do continente americano usando programação visual com Blockly.

## 📁 Estrutura do Projeto

```
📦 ferramente-de-geografia/
├── 📄 index.html                 # Página principal
├── 📂 src/
│   ├── 📄 app.js                 # Aplicação Vue principal
│   ├── 📂 components/            # Componentes Vue
│   │   ├── DadosPanel.js        # Painel de dados dos países
│   │   ├── BlocklyPanel.js      # Painel de programação visual
│   │   └── MapaPanel.js         # Painel do mapa SVG
│   ├── 📂 assets/
│   │   ├── 📂 data/             # Dados JSON
│   │   │   ├── paises_data.json
│   │   │   └── paises_iso_mapping.json
│   │   └── 📂 svg/              # Imagens SVG
│   │       └── america_map.svg
│   └── 📂 styles/
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
- Bloco Blockly "Pintar país de cor"
- Visualização do mapa SVG das Américas
- Sistema de pintura de países

### 🔜 Próximas features
- Blocos condicionais (se/então)
- Blocos de iteração (para cada país)
- Sistema de salvar/carregar projetos
- Legendas automáticas
- Botão de reset

## 📚 Sequência Didática

Baseado na sequência interdisciplinar de Geografia do CLIC para 8º ano:
- **Aula 01-02**: Regionalização e critérios
- **Aula 03-04**: Leitura computacional e criação de visualizações
- **Aula 05-06**: Reflexão e apresentação

## 👨‍💻 Desenvolvimento

Estrutura modular com componentes separados para facilitar manutenção e expansão.

---

**Desenvolvido para CLIC - Teachers College, Columbia University**
