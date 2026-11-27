// Configuração da conversão do mapa do Brasil (veja ferramentas/converter_mapa.js).
// Entrada: fontes/brasil/Brazil_Blank_Map.svg — mapa em branco dos estados
// (CorelDRAW/Inkscape). Os 27 caminhos do grupo "Estados" não têm nome
// (path44...path96); cada um foi identificado pela posição. Os outros grupos
// (terreno, divisas dos países vizinhos, contorno) são invisíveis e saem.
// Os ids são as siglas das UFs em minúsculas. Saída: src/assets/svg/brasil.svg
window.CONFIG = {
    viewBox: '0 0 220000 194010',
    paises: ['ac', 'al', 'ap', 'am', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mt', 'ms', 'mg', 'pa',
             'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'sp', 'se', 'to'],
    renomear: {
        path46: 'ac', path44: 'ro', path48: 'am', path50: 'rr', path52: 'ap', path86: 'pa',
        path56: 'mt', path54: 'to', path84: 'ma', path70: 'pi', path72: 'ce', path74: 'rn',
        path96: 'pb', path82: 'pe', path76: 'al', path78: 'se', path68: 'ba', path58: 'go',
        path80: 'df', path60: 'ms', path62: 'mg', path92: 'es', path88: 'sp', path90: 'rj',
        path64: 'pr', path94: 'sc', path66: 'rs'
    },
    remover: ['Terreno', 'Divisões dos vizinhos', 'Destaque', 'Regiões geoeconômicas', 'Contorno'],
    desagrupar: ['Estados'],
    limparIds: true
};
