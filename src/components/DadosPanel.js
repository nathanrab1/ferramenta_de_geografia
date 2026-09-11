export default {
    name: 'DadosPanel',
    props: {
        paises: {
            type: Array,
            required: true
        }
    },
    template: `
        <div class="panel dados-panel">
            <h2 class="panel-header">📊 Dados dos Países</h2>
            <div class="info-box">
                <strong>Total de países:</strong> {{ paises.length }}
            </div>
            <div style="overflow-x: auto;">
                <table class="dados-table">
                    <thead>
                        <tr>
                            <th>País</th>
                            <th>Região</th>
                            <th>Idioma</th>
                            <th>Esporte</th>
                            <th>IDH</th>
                            <th>População</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="pais in paises" :key="pais['País']">
                            <td><strong>{{ pais['País'] }}</strong></td>
                            <td>{{ pais['Região'] }}</td>
                            <td>{{ pais['Idioma principal'] }}</td>
                            <td>{{ pais['Esporte mais popular'] }}</td>
                            <td>{{ formatarIDH(pais['IDH']) }}</td>
                            <td>{{ formatarNumero(pais['População']) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `,
    methods: {
        formatarIDH(idh) {
            return idh ? idh.toFixed(3) : '0.000';
        },
        formatarNumero(num) {
            return num ? num.toLocaleString('pt-BR') : '0';
        }
    }
};
