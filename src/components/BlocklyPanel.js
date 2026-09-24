import { compararValores } from '../utils/ordenacao.js';

const { markRaw } = Vue;

// Tema do workspace com as cores do app (colors.css): fundo do painel
// em cinza-claro, biblioteca de blocos em branco e marcadores em
// azul-escuro. As cores dos blocos ficam em cada bloco (setColour).
let temaClicCache = null;
function temaClic() {
    if (!temaClicCache) {
        temaClicCache = Blockly.Theme.defineTheme('clic', {
            base: Blockly.Themes.Classic,
            componentStyles: {
                workspaceBackgroundColour: '#F5F5F5',
                toolboxBackgroundColour: '#FFFFFF',
                flyoutBackgroundColour: '#FFFFFF',
                flyoutOpacity: 1,
                scrollbarColour: '#A8A8A8',
                scrollbarOpacity: 0.5,
                insertionMarkerColour: '#405B7C',
                insertionMarkerOpacity: 0.3,
                markerColour: '#405B7C',
                cursorColour: '#D87550'
            }
        });
    }
    return temaClicCache;
}

export default {
    name: 'BlocklyPanel',
    // paises: já na ordem da tabela; é a ordem em que o laço "para cada
    // país" percorre (e pinta) os países.
    // coluna: a coluna da tabela selecionada no DadosPanel. Cada coluna tem
    // o seu próprio workspace (uma regionalização por coluna); ao trocar a
    // coluna o painel guarda os blocos da anterior e mostra os da nova.
    // continente: entrada de src/continentes.js, para o botão de voltar
    // à tela inicial (mostra o continente atual).
    props: ['paises', 'coluna', 'continente'],
    // baixar-projeto / abrir-projeto: os botões ficam aqui, mas quem monta
    // e aplica o arquivo é o App (que também guarda a ordenação e a coluna).
    // trocar-continente: botão de voltar à tela inicial (o App decide).
    emits: ['baixar-projeto', 'abrir-projeto', 'trocar-continente'],
    data() {
        return {
            // markRaw ao atribuir: o workspace do Blockly NAO pode virar
            // um Proxy reativo do Vue (veja criarWorkspace)
            workspace: null,
            // Coluna do workspace em exibição. É lida pelos blocos "se" ao
            // serem criados (coluna fixa, sem dropdown) e pelos geradores.
            // Só difere de this.coluna durante a troca de workspace.
            colunaAtual: null,
            // Estado serializado (JSON do Blockly) dos workspaces das outras
            // colunas, guardado ao sair delas. Só em memória: recarregar a
            // página zera tudo.
            estados: {}
        };
    },
    computed: {
        rotulo() {
            return this.coluna ? this.rotuloColuna(this.coluna) : '';
        }
    },
    template: `
        <div class="panel blockly-panel">
            <div class="painel-cabecalho blockly-titulo">
                <button class="btn-contorno btn-continentes" @click="$emit('trocar-continente')" title="Voltar à escolha de continente">{{ continente.icone }} {{ continente.nome }}</button>
                <span class="blockly-titulo-texto">Regionalização por: <strong>{{ rotulo }}</strong></span>
                <span class="projeto-botoes">
                    <button class="btn-contorno" @click="$emit('baixar-projeto')" title="Salva os blocos de todas as colunas em um arquivo .json">💾 Baixar projeto</button>
                    <button class="btn-contorno" @click="$refs.arquivo.click()" title="Carrega um arquivo .json salvo com o botão Baixar">📂 Abrir projeto</button>
                    <input type="file" accept=".json,application/json" ref="arquivo" hidden @change="escolherArquivo">
                </span>
            </div>
            <div id="blocklyDiv" class="blockly-workspace"></div>
        </div>
    `,
    watch: {
        coluna(nova, anterior) {
            if (this.workspace) this.trocarWorkspace(nova, anterior);
        }
    },
    mounted() {
        setTimeout(() => {
            this.inicializarBlockly();
        }, 500);

        // Expor método de resize globalmente
        window.resizeBlockly = () => {
            if (this.workspace) {
                Blockly.svgResize(this.workspace);
            }
        };
    },
    methods: {
        // Rótulo da coluna nos blocos e no título: nome em minúsculas
        rotuloColuna(coluna) {
            return coluna.toLowerCase();
        },
        // Colunas numéricas têm os blocos de comparação (>, <, entre);
        // as de texto têm o bloco de igualdade
        colunaNumerica(coluna) {
            return this.paises.some(p => typeof p[coluna] === 'number');
        },
        inicializarBlockly() {
            this.colunaAtual = this.coluna;

            // Limpar definições anteriores se existirem
            delete Blockly.Blocks['iniciar_programa'];
            delete Blockly.Blocks['pintar'];
            delete Blockly.Blocks['se_atributo'];
            delete Blockly.Blocks['se_igual'];
            delete Blockly.Blocks['se_maior'];
            delete Blockly.Blocks['se_menor'];
            delete Blockly.Blocks['se_entre'];
            if (Blockly.JavaScript) {
                delete Blockly.JavaScript['iniciar_programa'];
                delete Blockly.JavaScript['pintar'];
                delete Blockly.JavaScript['se_atributo'];
                delete Blockly.JavaScript['se_igual'];
                delete Blockly.JavaScript['se_maior'];
                delete Blockly.JavaScript['se_menor'];
                delete Blockly.JavaScript['se_entre'];
            }

            // Paleta do bloco de pintar: grade de 9 linhas (uma por
            // matiz) x 7 colunas (do claro ao escuro), no seletor de cor
            // do Blockly (FieldColour). Sem cinzas: o cinza é a cor dos
            // países ainda não pintados no mapa.
            const PALETA = [
                // vermelhos
                '#f5c6c6', '#f07070', '#e83c2c', '#c82e1e', '#a21c10', '#7c1408', '#4b0804',
                // laranjas
                '#f9cfa5', '#f3a170', '#ef8c34', '#ee7b2c', '#c76b1e', '#a45614', '#7a3c0c',
                // amarelos / marrons
                '#fdfd9e', '#fefe7c', '#f5d670', '#f7cc3e', '#d9a83c', '#a8762f', '#6c3a30',
                // amarelos / oliva
                '#fdfdca', '#fefe7a', '#fefe4e', '#f8d63e', '#baa422', '#7c7c1c', '#3c3c0c',
                // verdes
                '#bcf9a2', '#a2f9a2', '#7cfa5c', '#5cda2c', '#2eaa1c', '#1e7c10', '#0e3c08',
                // cianos / verde-azulados
                '#aafaf8', '#7cfbfb', '#5cdad2', '#4cbaba', '#3c8c8c', '#2c6c6c', '#183c3c',
                // azuis
                '#dafefb', '#a2fbf9', '#5cdafb', '#2c5cfb', '#1c1cfb', '#0c0caa', '#08086c',
                // roxos
                '#dadafb', '#aaaaf5', '#6c6cda', '#7c32fb', '#6c0cda', '#3c1caa', '#2c0c6c',
                // magentas
                '#fbdafb', '#f9a2f9', '#da6cda', '#da3cda', '#aa3caa', '#6c2c6c', '#3c0c3c'
            ];
            const PALETA_COLUNAS = 7;
            // Cores dos blocos, iguais às dos blocos dos outros apps do
            // CLIC: laço em azul, "pintar" em amarelo e os "se" em laranja
            const COR_BLOCO_LACO = '#5369AB';
            const COR_BLOCO_PINTAR = '#E3C15E';
            const COR_BLOCO_SE = '#C8613D';
            const COR_INICIAL = '#e83c2c'; // vermelho

            // Definir bloco de início do programa: um bloco "C" (loop)
            // que executa os blocos internos uma vez para cada país
            Blockly.Blocks['iniciar_programa'] = {
                init: function() {
                    this.appendDummyInput()
                        .appendField("∞")
                        .appendField("para cada país");
                    this.appendStatementInput("DO");
                    this.appendDummyInput()
                        .appendField("↻");
                    this.setColour(COR_BLOCO_LACO);
                    this.setTooltip("Executa os blocos internos uma vez para cada país");
                    this.setDeletable(false); // Não pode ser deletado
                }
            };

            // Gerador de código para o bloco inicial: envolve os blocos
            // internos em um loop sobre a lista de países. O código gerado
            // é uma função assíncrona que recebe o mapa onde vai pintar
            // (veja MapaPanel.rodar): dele vêm a lista de países (na ordem
            // da tabela daquela coluna), o pintarPais, a espera entre
            // países (pausa do slider de velocidade e, se o aluno pausou,
            // até ele continuar) e o id da execução atual. A cada país o
            // laço confere se ainda é a execução atual (parar/resetar
            // troca o id e encerra o laço) e avisa o mapa qual país está
            // visitando (destaque na tabela). Sem globais, dois mapas podem
            // rodar programas ao mesmo tempo.
            Blockly.JavaScript['iniciar_programa'] = function(block) {
                const corpo = Blockly.JavaScript.statementToCode(block, 'DO');
                if (!corpo.trim()) return '';
                return `(async (mapa) => {\n` +
                       `  const execucaoId = mapa.execucaoId;\n` +
                       `  for (const paisAtual of mapa.paises) {\n` +
                       `    if (mapa.execucaoId !== execucaoId) break;\n` +
                       `    mapa.visitar(paisAtual);\n` +
                       corpo +
                       `    await mapa.esperar();\n` +
                       `  }\n` +
                       `})`;
            };

            // Bloco "Pintar [cor]": pinta o país atual do laço
            Blockly.Blocks['pintar'] = {
                init: function() {
                    const campoCor = new Blockly.FieldColour(COR_INICIAL);
                    campoCor.setColours(PALETA);
                    campoCor.setColumns(PALETA_COLUNAS);
                    this.appendDummyInput()
                        .appendField("Pintar")
                        .appendField(campoCor, "COR");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(COR_BLOCO_PINTAR);
                    this.setTooltip("Pinta o país atual do laço com a cor escolhida");
                }
            };

            Blockly.JavaScript['pintar'] = function(block) {
                const cor = block.getFieldValue('COR');
                return `mapa.pintarPais(paisAtual['País'], '${cor}');\n`;
            };

            // Os blocos "se" não têm dropdown de coluna: a coluna é a do
            // workspace em exibição. Os blocos só são criados (pela
            // biblioteca ou ao restaurar o estado guardado) enquanto a sua
            // coluna está ativa, então a leitura na criação é segura
            // (programaDaColuna também garante isso ao gerar código de
            // outra coluna).
            const panel = this;
            const colunaAtual = () => panel.colunaAtual;
            const rotuloColuna = (coluna) => panel.rotuloColuna(coluna);
            const paises = this.paises;

            // Valores únicos de uma coluna de texto, para o dropdown do
            // "se =", na ordem própria da coluna (ou alfabética)
            const valoresUnicos = (coluna) =>
                [...new Set(paises.map(p => p[coluna]))]
                    .sort((a, b) => compararValores(coluna, a, b))
                    .map(v => [v, v]);

            // Bloco "se [coluna] = [valor]": executa os blocos internos só
            // quando o país atual do laço tem o valor escolhido na coluna
            Blockly.Blocks['se_atributo'] = {
                init: function() {
                    const coluna = colunaAtual();
                    const valores = coluna ? valoresUnicos(coluna) : [];
                    this.appendDummyInput()
                        .appendField("se")
                        .appendField(rotuloColuna(coluna || ''))
                        .appendField("=")
                        .appendField(new Blockly.FieldDropdown(
                            valores.length ? valores : [['(sem dados)', '']]
                        ), "VALOR");
                    this.appendStatementInput("DO")
                        .appendField("então");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(COR_BLOCO_SE);
                    this.setTooltip("Executa os blocos internos apenas se o país atual tiver esse valor na coluna");
                }
            };

            Blockly.JavaScript['se_atributo'] = function(block) {
                const coluna = JSON.stringify(colunaAtual());
                const valor = JSON.stringify(block.getFieldValue('VALOR'));
                const corpo = Blockly.JavaScript.statementToCode(block, 'DO');
                return `if (paisAtual[${coluna}] === ${valor}) {\n${corpo}}\n`;
            };

            // Campo numérico em formato brasileiro: mostra e aceita vírgula
            // como separador decimal (ponto também é aceito ao digitar).
            // O valor guardado continua sendo um número JS normal.
            class FieldNumeroBR extends Blockly.FieldNumber {
                doClassValidation_(novoValor) {
                    if (typeof novoValor === 'string') {
                        novoValor = novoValor.replace(',', '.');
                    }
                    return super.doClassValidation_(novoValor);
                }
                // Texto exibido no bloco
                getText_() {
                    return this.formatarBR(this.getValue());
                }
                // Texto mostrado na caixa de edição
                getEditorText_(valor) {
                    return this.formatarBR(valor);
                }
                formatarBR(valor) {
                    return valor === null || valor === undefined
                        ? '' : String(valor).replace('.', ',');
                }
            }
            Blockly.fieldRegistry.register('field_numero_br', FieldNumeroBR);

            // Bloco "se [coluna] = [valor]" (colunas numéricas; o de texto
            // é o se_atributo, com dropdown)
            Blockly.Blocks['se_igual'] = {
                init: function() {
                    this.appendDummyInput()
                        .appendField("se")
                        .appendField(rotuloColuna(colunaAtual() || ''))
                        .appendField("=")
                        .appendField(new FieldNumeroBR(0), "VALOR");
                    this.appendStatementInput("DO")
                        .appendField("então");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(COR_BLOCO_SE);
                    this.setTooltip("Executa os blocos internos apenas se o país atual tiver, nessa coluna, exatamente o valor digitado");
                }
            };

            // Bloco "se [coluna] > [valor]"
            Blockly.Blocks['se_maior'] = {
                init: function() {
                    this.appendDummyInput()
                        .appendField("se")
                        .appendField(rotuloColuna(colunaAtual() || ''))
                        .appendField(">")
                        .appendField(new FieldNumeroBR(0), "VALOR");
                    this.appendStatementInput("DO")
                        .appendField("então");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(COR_BLOCO_SE);
                    this.setTooltip("Executa os blocos internos apenas se o país atual tiver, nessa coluna, um valor maior que o digitado");
                }
            };

            // Bloco "se [coluna] < [valor]"
            Blockly.Blocks['se_menor'] = {
                init: function() {
                    this.appendDummyInput()
                        .appendField("se")
                        .appendField(rotuloColuna(colunaAtual() || ''))
                        .appendField("<")
                        .appendField(new FieldNumeroBR(0), "VALOR");
                    this.appendStatementInput("DO")
                        .appendField("então");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(COR_BLOCO_SE);
                    this.setTooltip("Executa os blocos internos apenas se o país atual tiver, nessa coluna, um valor menor que o digitado");
                }
            };

            // Bloco "se [coluna] entre [valor1] e [valor2]" (limites inclusos)
            Blockly.Blocks['se_entre'] = {
                init: function() {
                    this.appendDummyInput()
                        .appendField("se")
                        .appendField(rotuloColuna(colunaAtual() || ''))
                        .appendField("entre")
                        .appendField(new FieldNumeroBR(0), "VALOR1")
                        .appendField("e")
                        .appendField(new FieldNumeroBR(0), "VALOR2");
                    this.appendStatementInput("DO")
                        .appendField("então");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(COR_BLOCO_SE);
                    this.setTooltip("Executa os blocos internos apenas se o país atual tiver, nessa coluna, um valor entre os dois digitados (limites inclusos)");
                }
            };

            // Valor numérico do país na coluna do workspace. Valores ausentes
            // (null, ex.: IDH do Vaticano) viram NaN, que é falso em toda
            // comparação; sem isso null < 5 seria verdadeiro (null vira 0)
            const valorNumerico = (coluna) => `Number(paisAtual[${coluna}] ?? NaN)`;

            Blockly.JavaScript['se_igual'] = function(block) {
                const coluna = JSON.stringify(colunaAtual());
                const valor = Number(block.getFieldValue('VALOR'));
                const corpo = Blockly.JavaScript.statementToCode(block, 'DO');
                return `if (${valorNumerico(coluna)} === ${valor}) {\n${corpo}}\n`;
            };

            Blockly.JavaScript['se_maior'] = function(block) {
                const coluna = JSON.stringify(colunaAtual());
                const valor = Number(block.getFieldValue('VALOR'));
                const corpo = Blockly.JavaScript.statementToCode(block, 'DO');
                return `if (${valorNumerico(coluna)} > ${valor}) {\n${corpo}}\n`;
            };

            Blockly.JavaScript['se_menor'] = function(block) {
                const coluna = JSON.stringify(colunaAtual());
                const valor = Number(block.getFieldValue('VALOR'));
                const corpo = Blockly.JavaScript.statementToCode(block, 'DO');
                return `if (${valorNumerico(coluna)} < ${valor}) {\n${corpo}}\n`;
            };

            // Funciona mesmo se o aluno digitar os limites na ordem inversa
            Blockly.JavaScript['se_entre'] = function(block) {
                const coluna = JSON.stringify(colunaAtual());
                const v1 = Number(block.getFieldValue('VALOR1'));
                const v2 = Number(block.getFieldValue('VALOR2'));
                const min = Math.min(v1, v2), max = Math.max(v1, v2);
                const corpo = Blockly.JavaScript.statementToCode(block, 'DO');
                const v = valorNumerico(coluna);
                return `if (${v} >= ${min} && ${v} <= ${max}) {\n${corpo}}\n`;
            };

            // Criar workspace
            this.criarWorkspace();
        },
        // Biblioteca de blocos da coluna: sempre o "pintar", mais os "se"
        // do tipo da coluna (igualdade para texto, comparações para número)
        toolboxPara(coluna) {
            const blocosSe = this.colunaNumerica(coluna)
                ? ['se_maior', 'se_menor', 'se_entre', 'se_igual']
                : ['se_atributo'];
            return `<xml>` +
                ['pintar', ...blocosSe].map(t => `<block type="${t}"></block>`).join('') +
                `</xml>`;
        },
        criarWorkspace() {
            // Criar workspace
            // markRaw: sem isso o Vue envolve o workspace em um Proxy reativo.
            // Os blocos criados atraves do Proxy ficam com block.workspace !== workspace
            // interno do Blockly, e a verificacao de conexao falha com
            // "Blocks not on same workspace" (blocos nao encaixam).
            this.workspace = markRaw(Blockly.inject('blocklyDiv', {
                toolbox: this.toolboxPara(this.colunaAtual),
                // Biblioteca de blocos no topo, com os blocos lado a lado
                horizontalLayout: true,
                toolboxPosition: 'start',
                zoom: {
                    controls: true,
                    wheel: true,
                    startScale: 1.0,
                    maxScale: 3,
                    minScale: 0.3,
                    scaleSpeed: 1.2
                },
                trashcan: true,
                scrollbars: true,
                move: {
                    scrollbars: {
                        horizontal: true,
                        vertical: true
                    },
                    drag: true,
                    wheel: true
                },
                grid: {
                    spacing: 20,
                    length: 3,
                    colour: '#d5d5d5',
                    snap: true
                },
                theme: temaClic()
            }));

            this.carregarBlocosIniciais();

            // Forçar resize do workspace
            Blockly.svgResize(this.workspace);

            console.log('✅ Workspace pronto com bloco inicial!');
        },
        // Workspace novo: só o bloco "para cada país"
        carregarBlocosIniciais() {
            const blocosIniciais = `
                <xml xmlns="https://developers.google.com/blockly/xml">
                    <block type="iniciar_programa" x="20" y="20"></block>
                </xml>
            `;
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(blocosIniciais), this.workspace);
        },
        // Troca o workspace em exibição: guarda os blocos da coluna anterior
        // e mostra os da nova (ou um workspace novo, na primeira vez).
        // É um único Blockly.inject; o que muda é o conteúdo e a biblioteca.
        // (O App reseta o mapa ao trocar a coluna, parando a execução.)
        trocarWorkspace(nova, anterior) {
            if (anterior) this.guardarEstado(anterior);
            this.carregarColuna(nova);
        },
        // Guarda os blocos em exibição como o estado da coluna
        guardarEstado(coluna) {
            this.estados[coluna] = Blockly.serialization.workspaces.save(this.workspace);
        },
        // Mostra no workspace o estado guardado da coluna (ou um workspace
        // novo) e a biblioteca de blocos do tipo dela
        carregarColuna(coluna) {
            // Antes de criar qualquer bloco: os "se" leem a coluna ao nascer
            this.colunaAtual = coluna;
            this.workspace.updateToolbox(this.toolboxPara(coluna));

            // Sem eventos: a troca não deve entrar no histórico de desfazer
            Blockly.Events.disable();
            try {
                this.workspace.clear();
                if (this.estados[coluna]) {
                    Blockly.serialization.workspaces.load(this.estados[coluna], this.workspace);
                } else {
                    this.carregarBlocosIniciais();
                }
            } finally {
                Blockly.Events.enable();
            }
            this.workspace.clearUndo();
            Blockly.svgResize(this.workspace);
        },
        // Estado de todas as colunas (inclusive a em exibição), para o
        // arquivo do projeto. Só entram colunas onde o aluno montou algo
        // além do "para cada país".
        exportarWorkspaces() {
            if (!this.workspace) return {};
            this.guardarEstado(this.colunaAtual);
            const comBlocos = {};
            for (const [coluna, estado] of Object.entries(this.estados)) {
                if ((estado.blocks?.blocks || []).some(b => b.type !== 'iniciar_programa' || b.inputs)) {
                    comBlocos[coluna] = estado;
                }
            }
            return comBlocos;
        },
        // Substitui os workspaces de todas as colunas pelos do arquivo e
        // recarrega a coluna em exibição. Lança erro se algum estado não
        // puder ser carregado (arquivo de outra versão, por exemplo).
        importarWorkspaces(workspaces) {
            const anteriores = this.estados;
            this.estados = { ...workspaces };
            try {
                this.carregarColuna(this.coluna);
            } catch (error) {
                // Volta ao que estava, para não deixar o workspace vazio
                this.estados = anteriores;
                this.carregarColuna(this.coluna);
                throw error;
            }
        },
        // Botão "Abrir projeto": lê o .json escolhido e repassa ao App
        async escolherArquivo(event) {
            const arquivo = event.target.files[0];
            // Permite escolher o mesmo arquivo de novo depois
            event.target.value = '';
            if (!arquivo) return;
            let projeto;
            try {
                projeto = JSON.parse(await arquivo.text());
            } catch (error) {
                alert('Não foi possível ler o arquivo: não é um JSON válido.');
                return;
            }
            this.$emit('abrir-projeto', projeto);
        },
        // Legenda do mapa: um item por bloco "Pintar" que vai executar
        // (dentro do "para cada país"), com a cor e os valores das condições
        // "se" que o envolvem. Sem condição, o rótulo é "Todos os países".
        // Devolve também a coluna do workspace (tooltip do mapa).
        montarLegenda(workspace, coluna) {
            const itens = [];
            const vistos = new Set();
            const nome = coluna ? this.rotuloColuna(coluna) : '';

            for (const bloco of workspace.getBlocksByType('pintar', true)) {
                if (bloco.getRootBlock().type !== 'iniciar_programa') continue;

                // Cada condição vira {rotulo, detalhe}: o rótulo aparece na
                // legenda e o detalhe (com o nome da coluna) no title
                const condicoes = [];
                for (let pai = bloco.getSurroundParent(); pai; pai = pai.getSurroundParent()) {
                    let comparacao = null;
                    if (pai.type === 'se_atributo') {
                        comparacao = `= ${pai.getFieldValue('VALOR')}`;
                    } else if (pai.type === 'se_igual') {
                        comparacao = `= ${pai.getFieldValue('VALOR')}`;
                    } else if (pai.type === 'se_maior') {
                        comparacao = `> ${pai.getFieldValue('VALOR')}`;
                    } else if (pai.type === 'se_menor') {
                        comparacao = `< ${pai.getFieldValue('VALOR')}`;
                    } else if (pai.type === 'se_entre') {
                        const v1 = Number(pai.getFieldValue('VALOR1'));
                        const v2 = Number(pai.getFieldValue('VALOR2'));
                        comparacao = `entre ${Math.min(v1, v2)} e ${Math.max(v1, v2)}`;
                    }
                    if (!comparacao) continue;
                    condicoes.unshift({
                        // Para "=", o valor sozinho já identifica (ex.: "Sul");
                        // nas comparações numéricas precisa do nome da coluna
                        rotulo: pai.type === 'se_atributo'
                            ? pai.getFieldValue('VALOR')
                            : `${nome} ${comparacao}`,
                        detalhe: `${nome} ${comparacao}`
                    });
                }

                const cor = bloco.getFieldValue('COR');
                const rotulo = condicoes.length
                    ? condicoes.map(c => c.rotulo).join(' e ')
                    : 'Todos os países';
                const detalhe = condicoes.map(c => c.detalhe).join(' e ');

                const chave = `${cor}|${rotulo}`;
                if (vistos.has(chave)) continue;
                vistos.add(chave);
                itens.push({ cor, rotulo, detalhe });
            }
            return { itens, colunas: coluna ? [coluna] : [] };
        },
        // Programa de uma coluna, pronto para o MapaPanel rodar:
        // { codigo, legenda, colunas } ou null se a coluna não tem blocos
        // dentro do "para cada país". Para a coluna em exibição usa o
        // workspace da tela; para as outras (comparação de mapas) carrega o
        // estado guardado num workspace sem tela (headless) só para gerar.
        programaDaColuna(coluna) {
            if (!this.workspace || !Blockly.JavaScript) return null;
            if (coluna === this.colunaAtual) return this.programaDoWorkspace(this.workspace, coluna);

            this.guardarEstado(this.colunaAtual);
            const estado = this.estados[coluna];
            if (!estado) return null;

            // Os blocos "se" leem colunaAtual ao nascer (dropdown de
            // valores) e os geradores ao gerar: aponta para a coluna
            // pedida só enquanto dura a geração
            const emExibicao = this.colunaAtual;
            this.colunaAtual = coluna;
            const headless = new Blockly.Workspace();
            Blockly.Events.disable();
            try {
                Blockly.serialization.workspaces.load(estado, headless);
                return this.programaDoWorkspace(headless, coluna);
            } finally {
                Blockly.Events.enable();
                headless.dispose();
                this.colunaAtual = emExibicao;
            }
        },
        programaDoWorkspace(workspace, coluna) {
            const codigo = Blockly.JavaScript.workspaceToCode(workspace);
            if (!codigo.trim()) return null;
            console.log(`📝 Código (${coluna}):`, codigo);
            const legenda = this.montarLegenda(workspace, coluna);
            return { codigo, legenda: legenda.itens, colunas: legenda.colunas };
        }
    }
};
