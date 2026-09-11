export default {
    name: 'MapaPanel',
    props: {
        paisesISOMapping: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            svgContent: '',
            // Controles de zoom e pan
            scale: 1,
            translateX: 0,
            translateY: 0,
            isPanning: false,
            startPanX: 0,
            startPanY: 0
        };
    },
    template: `
        <div class="panel mapa-panel">
            <div
                class="mapa-container"
                @wheel.prevent="handleWheel"
                @dblclick="resetZoom"
                @mousedown="startPan"
                @mousemove="handlePan"
                @mouseup="endPan"
                @mouseleave="endPan"
                :style="{ cursor: isPanning ? 'grabbing' : 'grab' }"
            >
                <div
                    v-html="svgContent"
                    class="mapa-svg"
                    :style="{ transform: 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ')', transformOrigin: 'center center', transition: isPanning ? 'none' : 'transform 0.1s ease-out' }"
                ></div>
            </div>
        </div>
    `,
    async mounted() {
        await this.carregarMapa();
        // Expor método global para pintar países
        window.pintarPais = this.pintarPais;
    },
    watch: {
        // O mapeamento chega depois do mounted (fetch no componente raiz),
        // entao refazemos o recorte quando ele finalmente carrega.
        paisesISOMapping() {
            if (this.svgContent) this.ajustarViewBox();
        }
    },
    methods: {
        async carregarMapa() {
            try {
                const response = await fetch('src/assets/svg/america_map.svg');
                this.svgContent = await response.text();
                await this.$nextTick();
                this.ocultarNaoAmericanos();
                this.ajustarViewBox();
                console.log('✅ Mapa carregado');
            } catch (error) {
                console.error('❌ Erro ao carregar mapa:', error);
            }
        },
        // O viewBox original do arquivo (2752x1537) e bem maior que o desenho
        // das Americas, o que deixava muita area vazia nas laterais. Aqui
        // medimos a caixa real do conteudo e recortamos o viewBox nela.
        // O arquivo de origem e um mapa-mundi recortado, entao ainda traz
        // territorios que nao fazem parte das Americas.
        ocultarNaoAmericanos() {
            const svg = this.$el.querySelector('svg');
            if (!svg) return;

            // gl = Groenlandia, is = Islandia, aq = Antartida,
            // ck/ki/pf/pn = ilhas do Pacifico.
            for (const codigoISO of ['gl', 'is', 'aq', 'ck', 'ki', 'pf', 'pn']) {
                const elemento = svg.getElementById(codigoISO);
                if (elemento) elemento.remove();
            }
        },
        medirPaises(svg) {
            // getBBox() devolve coordenadas no espaco local do elemento e
            // varios grupos deste SVG tem transform="matrix(2.19...)". Por
            // isso convertemos cada caixa para o espaco da raiz via CTM.
            const ctmRaiz = svg.getScreenCTM();
            if (!ctmRaiz) return null;
            const paraRaiz = ctmRaiz.inverse();

            let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;

            for (const codigoISO of Object.values(this.paisesISOMapping || {})) {
                const elemento = svg.querySelector(`#${codigoISO}`);
                if (!elemento) continue;

                let caixa, ctm;
                try {
                    caixa = elemento.getBBox();
                    ctm = elemento.getScreenCTM();
                } catch (error) {
                    continue;
                }
                if (!ctm || (!caixa.width && !caixa.height)) continue;

                const m = paraRaiz.multiply(ctm);
                const cantos = [
                    [caixa.x, caixa.y],
                    [caixa.x + caixa.width, caixa.y],
                    [caixa.x, caixa.y + caixa.height],
                    [caixa.x + caixa.width, caixa.y + caixa.height]
                ];

                for (const [cx, cy] of cantos) {
                    const ponto = svg.createSVGPoint();
                    ponto.x = cx;
                    ponto.y = cy;
                    const p = ponto.matrixTransform(m);
                    x1 = Math.min(x1, p.x);
                    y1 = Math.min(y1, p.y);
                    x2 = Math.max(x2, p.x);
                    y2 = Math.max(y2, p.y);
                }
            }

            if (!Number.isFinite(x1)) return null;

            return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
        },
        medirTudo(svg) {
            try {
                const caixa = svg.getBBox();
                return caixa.width && caixa.height ? caixa : null;
            } catch (error) {
                console.warn('⚠️ Nao foi possivel medir o mapa:', error);
                return null;
            }
        },
        ajustarViewBox() {
            const svg = this.$el.querySelector('svg');
            if (!svg) return;

            // Medimos so os paises da base. O arquivo original e um mapa-mundi
            // recortado e ainda carrega territorios distantes (Ilhas Cook,
            // Kiribati, Polinesia Francesa, Islandia, Antartida) que esticariam
            // a caixa e trariam de volta o espaco vazio.
            const bbox = this.medirPaises(svg) || this.medirTudo(svg);
            if (!bbox) return;

            // Margem pequena para o traco das bordas nao ficar cortado.
            const margem = Math.max(bbox.width, bbox.height) * 0.02;
            const x = bbox.x - margem;
            const y = bbox.y - margem;
            const largura = bbox.width + margem * 2;
            const altura = bbox.height + margem * 2;

            svg.setAttribute('viewBox', `${x} ${y} ${largura} ${altura}`);
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            // Sem width/height fixos o SVG passa a ocupar o espaco do painel
            // seguindo a proporcao do novo viewBox.
            svg.removeAttribute('width');
            svg.removeAttribute('height');
        },
        handleWheel(event) {
            // Calcular novo zoom
            const delta = event.deltaY > 0 ? -0.1 : 0.1;
            const newScale = Math.max(0.5, Math.min(5, this.scale + delta));

            this.scale = newScale;
        },
        resetZoom() {
            this.scale = 1;
            this.translateX = 0;
            this.translateY = 0;
        },
        startPan(event) {
            this.isPanning = true;
            this.startPanX = event.clientX - this.translateX;
            this.startPanY = event.clientY - this.translateY;
        },
        handlePan(event) {
            if (!this.isPanning) return;

            this.translateX = event.clientX - this.startPanX;
            this.translateY = event.clientY - this.startPanY;
        },
        endPan() {
            this.isPanning = false;
        },
        pintarPais(nomePais, cor) {
            const codigoISO = this.paisesISOMapping[nomePais];

            if (!codigoISO) {
                console.warn(`⚠️ País não encontrado: ${nomePais}`);
                return;
            }

            const svg = this.$el.querySelector('svg');
            if (!svg) {
                console.error('❌ SVG não encontrado');
                return;
            }

            let elemento = svg.getElementById(codigoISO);

            if (elemento) {
                elemento.style.fill = cor;
                console.log(`✅ ${nomePais} (${codigoISO}) -> ${cor}`);
            } else {
                console.warn(`⚠️ Elemento não encontrado: ${nomePais} (${codigoISO})`);
            }
        }
    }
};
