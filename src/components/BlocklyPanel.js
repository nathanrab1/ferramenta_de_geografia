const { markRaw } = Vue;

export default {
    name: 'BlocklyPanel',
    props: {
        paises: {
            type: Array,
            required: true
        }
    },
    data() {
        return {
            workspace: null
        };
    },
    template: `
        <div class="panel blockly-panel">
            <h2 class="blockly-header">🧩 Programação Visual</h2>
            <div id="blocklyDiv" class="blockly-workspace"></div>
            <button class="execute-btn" @click="executarCodigo">▶️ Executar</button>
        </div>
    `,
    mounted() {
        this.inicializarBlockly();
    },
    methods: {
        inicializarBlockly() {
            // Definir bloco de início do programa
            Blockly.Blocks['inicio_programa'] = {
                init: function() {
                    this.appendDummyInput()
                        .appendField("▶️ Executar Programa");
                    this.appendStatementInput("DO")
                        .setCheck(null);
                    this.setColour(120);
                    this.setTooltip("Início do programa");
                    this.setDeletable(false); // Não pode deletar o bloco inicial
                }
            };

            // Definir bloco customizado para pintar país
            Blockly.Blocks['pintar_pais'] = {
                init: function() {
                    this.appendDummyInput()
                        .appendField("Pintar");
                    this.appendDummyInput()
                        .appendField(new Blockly.FieldDropdown(
                            this.getPaisesDropdown()
                        ), "PAIS");
                    this.appendDummyInput()
                        .appendField(new Blockly.FieldColour("#ff0000"), "COR");
                    this.setInputsInline(false);
                    this.setPreviousStatement(true, null);
                    this.setNextStatement(true, null);
                    this.setColour(160);
                    this.setTooltip("Pinta um país com a cor escolhida");
                    this.setHelpUrl("");
                },
                getPaisesDropdown: () => {
                    return this.paises.map(p => [p['País'], p['País']]);
                }
            };

            // Definir gerador de código para o bloco inicial
            Blockly.JavaScript['inicio_programa'] = function(block) {
                const statements = Blockly.JavaScript.statementToCode(block, 'DO');
                const code = '// Início do programa\n' + statements;
                return code;
            };

            // Definir gerador de código para pintar país
            Blockly.JavaScript['pintar_pais'] = function(block) {
                const pais = block.getFieldValue('PAIS');
                const cor = block.getFieldValue('COR');
                const code = `window.pintarPais('${pais}', '${cor}');\n`;
                return code;
            };

            // Criar workspace
            // markRaw: sem isso o Vue envolve o workspace em um Proxy reativo.
            // Os blocos criados atraves do Proxy ficam com block.workspace !== workspace
            // interno do Blockly, e a verificacao de conexao falha com
            // "Blocks not on same workspace" (blocos nao encaixam).
            this.workspace = markRaw(Blockly.inject('blocklyDiv', {
                toolbox: `
                    <xml>
                        <block type="pintar_pais"></block>
                    </xml>
                `,
                zoom: {
                    controls: true,
                    wheel: true,
                    startScale: 1.0,
                    maxScale: 3,
                    minScale: 0.3,
                    scaleSpeed: 1.2
                },
                trashcan: true,
                scrollbars: true
            }));

            // Adicionar bloco inicial de execução
            setTimeout(() => {
                const blocoInicio = this.workspace.newBlock('inicio_programa');
                blocoInicio.initSvg();
                blocoInicio.render();
                blocoInicio.moveBy(50, 50);
            }, 100);
        },
        executarCodigo() {
            try {
                const code = Blockly.JavaScript.workspaceToCode(this.workspace);
                console.log('📝 Código gerado:', code);
                eval(code);
                console.log('✅ Código executado!');
                this.$emit('codigo-executado');
            } catch (error) {
                console.error('❌ Erro ao executar:', error);
                alert('Erro ao executar o código. Verifique o console.');
            }
        }
    }
};
