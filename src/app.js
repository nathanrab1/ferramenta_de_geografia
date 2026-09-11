import DadosPanel from './components/DadosPanel.js';
import BlocklyPanel from './components/BlocklyPanel.js';
import MapaPanel from './components/MapaPanel.js';

const { createApp } = Vue;

const app = createApp({
    components: {
        DadosPanel,
        BlocklyPanel,
        MapaPanel
    },
    data() {
        return {
            paises: [],
            paisesISOMapping: {},
            loading: true,
            error: null
        };
    },
    template: `
        <div id="app" v-if="!loading">
            <DadosPanel :paises="paises" />
            <BlocklyPanel :paises="paises" @codigo-executado="onCodigoExecutado" />
            <MapaPanel :paisesISOMapping="paisesISOMapping" />
        </div>
        <div v-else-if="error" style="padding: 20px; color: red;">
            <h2>❌ Erro ao carregar dados</h2>
            <p>{{ error }}</p>
        </div>
        <div v-else style="padding: 20px; text-align: center;">
            <h2>⏳ Carregando...</h2>
        </div>
    `,
    async mounted() {
        await this.carregarDados();
    },
    methods: {
        async carregarDados() {
            try {
                // Carregar dados dos países
                const responsePaises = await fetch('src/assets/data/paises_data.json');
                this.paises = await responsePaises.json();

                // Carregar mapeamento ISO
                const responseISO = await fetch('src/assets/data/paises_iso_mapping.json');
                this.paisesISOMapping = await responseISO.json();

                this.loading = false;
                console.log('✅ Todos os dados carregados');
            } catch (error) {
                this.error = error.message;
                this.loading = false;
                console.error('❌ Erro ao carregar dados:', error);
            }
        },
        onCodigoExecutado() {
            console.log('🎉 Código executado com sucesso!');
        }
    }
});

app.mount('#app');
