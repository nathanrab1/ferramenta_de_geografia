const { markRaw } = Vue;

export default {
    name: 'BlocklyPanel',
    // coluna: a coluna da tabela selecionada no DadosPanel. Cada coluna tem
    // o seu próprio workspace (uma regionalização por coluna); ao trocar a
    // coluna o painel guarda os blocos da anterior e mostra os da nova.
    props: ['paises', 'coluna'],
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
            <div class="blockly-titulo">Regionalização por: <strong>{{ rotulo }}</strong></div>
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

        // Expor execução globalmente: o botão "Executar" fica no MapaPanel
        window.executarCodigo = () => this.executarCodigo();

        // Cancela o laço em andamento: cada execução guarda o id com que
        // começou e para assim que o id global muda (veja iniciar_programa).
        // Usado pelo botão "Resetar" e ao iniciar uma nova execução.
        window.execucaoId = 0;
        window.pararExecucao = () => { window.execucaoId++; };
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
            // Lista usada pelo loop do bloco "para cada país" no código gerado
            window.paises = this.paises;
            this.colunaAtual = this.coluna;

            // Limpar definições anteriores se existirem
            delete Blockly.Blocks['iniciar_programa'];
            delete Blockly.Blocks['pintar'];
            delete Blockly.Blocks['se_atributo'];
            delete Blockly.Blocks['se_maior'];
            delete Blockly.Blocks['se_menor'];
            delete Blockly.Blocks['se_entre'];
            if (Blockly.JavaScript) {
                delete Blockly.JavaScript['iniciar_programa'];
                delete Blockly.JavaScript['pintar'];
                delete Blockly.JavaScript['se_atributo'];
                delete Blockly.JavaScript['se_maior'];
                delete Blockly.JavaScript['se_menor'];
                delete Blockly.JavaScript['se_entre'];
            }

            // Opções de cor do bloco de pintar (também usadas na legenda)
            const CORES = this.CORES = [
                ["🔴 Vermelho", "#ff0000"],
                ["🔵 Azul", "#0000ff"],
                ["🟢 Verde", "#00ff00"],
                ["🟡 Amarelo", "#ffff00"],
                ["🟠 Laranja", "#ff8800"],
                ["🟣 Roxo", "#8800ff"],
                ["🟤 Marrom", "#8b4513"],
                ["⚫ Preto", "#000000"],
                ["⚪ Branco", "#ffffff"],
                ["🩷 Rosa", "#ff69b4"]
            ];

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
                    this.setColour(180);
                    this.setTooltip("Executa os blocos internos uma vez para cada país");
                    this.setDeletable(false); // Não pode ser deletado
                }
            };

            // Gerador de código para o bloco inicial: envolve os blocos
            // internos em um loop sobre a lista de países. O loop é
            // assíncrono com uma pausa por país, para dar para ver a
            // varredura acontecendo no mapa em ordem. A pausa é lida a cada
            // iteração de window.intervaloPintura (slider do MapaPanel).
            // A cada país o laço confere se ainda é a execução atual
            // (window.pararExecucao invalida o id e encerra o laço).
            Blockly.JavaScript['iniciar_programa'] = function(block) {
                const corpo = Blockly.JavaScript.statementToCode(block, 'DO');
                if (!corpo.trim()) return '';
                return `(async () => {\n` +
                       `  const execucaoId = window.execucaoId;\n` +
                       `  for (const paisAtual of window.paises) {\n` +
                       `    if (window.execucaoId !== execucaoId) break;\n` +
                       `    window.paisAtual = paisAtual;\n` +
                       corpo +
                       `    await new Promise(r => setTimeout(r, window.intervaloPintura ?? 150));\n` +
                       `  }\n` +
                       `})()`;
            };

            // Bloco "Pintar [cor]": pinta o país atual do laço
            Blockly.Blocks['pintar'] = {
                init: function() {
                    this.appendDummyInput()
                        .appendField("Pintar")
                        .appendField(new Blockly.FieldDropdown(CORES), "COR");
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(160);
                    this.setTooltip("Pinta o país atual do laço com a cor escolhida");
                }
            };

            Blockly.JavaScript['pintar'] = function(block) {
                const cor = block.getFieldValue('COR');
                return `window.pintarPais(window.paisAtual['País'], '${cor}');\n`;
            };

            // Os blocos "se" não têm dropdown de coluna: a coluna é a do
            // workspace em exibição. Os blocos só são criados (pela
            // biblioteca ou ao restaurar o estado guardado) enquanto a sua
            // coluna está ativa, então a leitura na criação é segura.
            const panel = this;
            const colunaAtual = () => panel.colunaAtual;
            const rotuloColuna = (coluna) => panel.rotuloColuna(coluna);
            const paises = this.paises;

            // Colunas com ordem própria no dropdown (geográfica, não
            // alfabética); as demais ficam em ordem alfabética
            const ORDEM_VALORES = {
                'Região': ['Norte', 'Central', 'Sul']
            };
            // Valores únicos de uma coluna de texto, para o dropdown do "se ="
            const valoresUnicos = (coluna) => {
                const ordem = ORDEM_VALORES[coluna];
                const posicao = (v) => {
                    const i = ordem ? ordem.indexOf(v) : -1;
                    return i === -1 ? Infinity : i; // desconhecidos vão para o fim
                };
                return [...new Set(paises.map(p => p[coluna]))]
                    .sort((a, b) => posicao(a) - posicao(b) || String(a).localeCompare(String(b)))
                    .map(v => [v, v]);
            };

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
                    this.setColour(210);
                    this.setTooltip("Executa os blocos internos apenas se o país atual tiver esse valor na coluna");
                }
            };

            Blockly.JavaScript['se_atributo'] = function(block) {
                const coluna = JSON.stringify(colunaAtual());
                const valor = JSON.stringify(block.getFieldValue('VALOR'));
                const corpo = Blockly.JavaScript.statementToCode(block, 'DO');
                return `if (window.paisAtual[${coluna}] === ${valor}) {\n${corpo}}\n`;
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
                    this.setColour(210);
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
                    this.setColour(210);
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
                    this.setColour(210);
                    this.setTooltip("Executa os blocos internos apenas se o país atual tiver, nessa coluna, um valor entre os dois digitados (limites inclusos)");
                }
            };

            Blockly.JavaScript['se_maior'] = function(block) {
                const coluna = JSON.stringify(colunaAtual());
                const valor = Number(block.getFieldValue('VALOR'));
                const corpo = Blockly.JavaScript.statementToCode(block, 'DO');
                return `if (window.paisAtual[${coluna}] > ${valor}) {\n${corpo}}\n`;
            };

            Blockly.JavaScript['se_menor'] = function(block) {
                const coluna = JSON.stringify(colunaAtual());
                const valor = Number(block.getFieldValue('VALOR'));
                const corpo = Blockly.JavaScript.statementToCode(block, 'DO');
                return `if (window.paisAtual[${coluna}] < ${valor}) {\n${corpo}}\n`;
            };

            // Funciona mesmo se o aluno digitar os limites na ordem inversa
            Blockly.JavaScript['se_entre'] = function(block) {
                const coluna = JSON.stringify(colunaAtual());
                const v1 = Number(block.getFieldValue('VALOR1'));
                const v2 = Number(block.getFieldValue('VALOR2'));
                const min = Math.min(v1, v2), max = Math.max(v1, v2);
                const corpo = Blockly.JavaScript.statementToCode(block, 'DO');
                return `if (window.paisAtual[${coluna}] >= ${min} && window.paisAtual[${coluna}] <= ${max}) {\n${corpo}}\n`;
            };

            // Criar workspace
            this.criarWorkspace();
        },
        // Biblioteca de blocos da coluna: sempre o "pintar", mais os "se"
        // do tipo da coluna (igualdade para texto, comparações para número)
        toolboxPara(coluna) {
            const blocosSe = this.colunaNumerica(coluna)
                ? ['se_maior', 'se_menor', 'se_entre']
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
                    colour: '#ccc',
                    snap: true
                }
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
        trocarWorkspace(nova, anterior) {
            // O laço em andamento pintaria com o programa da coluna antiga
            window.pararExecucao();

            if (anterior) {
                this.estados[anterior] = Blockly.serialization.workspaces.save(this.workspace);
            }

            // Antes de criar qualquer bloco: os "se" leem a coluna ao nascer
            this.colunaAtual = nova;
            this.workspace.updateToolbox(this.toolboxPara(nova));

            // Sem eventos: a troca não deve entrar no histórico de desfazer
            Blockly.Events.disable();
            try {
                this.workspace.clear();
                if (this.estados[nova]) {
                    Blockly.serialization.workspaces.load(this.estados[nova], this.workspace);
                } else {
                    this.carregarBlocosIniciais();
                }
            } finally {
                Blockly.Events.enable();
            }
            this.workspace.clearUndo();
            Blockly.svgResize(this.workspace);
        },
        // Legenda do mapa: um item por bloco "Pintar" que vai executar
        // (dentro do "para cada país"), com a cor e os valores das condições
        // "se" que o envolvem. Sem condição, o rótulo é "Todos os países".
        // Devolve também a coluna do workspace (tooltip do mapa).
        montarLegenda() {
            const nomesCores = Object.fromEntries(
                (this.CORES || []).map(([nome, cor]) => [cor, nome.replace(/^\S+\s/, '')])
            );
            const itens = [];
            const vistos = new Set();
            const coluna = this.colunaAtual;
            const nome = coluna ? this.rotuloColuna(coluna) : '';

            for (const bloco of this.workspace.getBlocksByType('pintar', true)) {
                if (bloco.getRootBlock().type !== 'iniciar_programa') continue;

                // Cada condição vira {rotulo, detalhe}: o rótulo aparece na
                // legenda e o detalhe (com o nome da coluna) no title
                const condicoes = [];
                for (let pai = bloco.getSurroundParent(); pai; pai = pai.getSurroundParent()) {
                    let comparacao = null;
                    if (pai.type === 'se_atributo') {
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
                itens.push({ cor, nomeCor: nomesCores[cor] || cor, rotulo, detalhe });
            }
            return { itens, colunas: coluna ? [coluna] : [] };
        },
        executarCodigo() {
            try {
                if (!Blockly.JavaScript) {
                    throw new Error('Gerador JavaScript do Blockly não está disponível');
                }
                const code = Blockly.JavaScript.workspaceToCode(this.workspace);
                console.log('📝 Código:', code);
                if (code.trim()) {
                    // Encerra uma execução anterior ainda em andamento
                    window.pararExecucao();
                    if (window.atualizarLegenda) {
                        const legenda = this.montarLegenda();
                        window.atualizarLegenda(legenda.itens, legenda.colunas);
                    }
                    // O laço gerado é assíncrono (pausa entre países),
                    // então erros dentro dele chegam pela Promise
                    Promise.resolve(eval(code))
                        .then(() => console.log('✅ Executado!'))
                        .catch(error => {
                            console.error('❌ Erro:', error);
                            alert('Erro ao executar: ' + error.message);
                        });
                } else {
                    console.log('⚠️ Nenhum código para executar');
                }
            } catch (error) {
                console.error('❌ Erro:', error);
                alert('Erro ao executar: ' + error.message);
            }
        }
    }
};
