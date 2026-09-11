// Configuração da conversão do mapa da Europa (veja ferramentas/converter_mapa.js).
// Entrada: fontes/europa/map europa.svg (Wikimedia "Europe countries map",
// CC BY-SA 2.5, editado no Inkscape). Saída: src/assets/svg/europa.svg
window.CONFIG = {
    viewBox: '0 0 753.9 609.2',
    paises: ['al','de','ad','am','at','az','be','by','ba','bg','cy','hr','dk','sk','si','es','ee','fi','fr','ge',
             'gr','hu','ie','is','it','xk','lv','li','lt','lu','mk','mt','md','mc','me','no','nl','pl','pt','gb',
             'cz','ro','ru','sm','rs','se','ch','tr','ua','va'],
    // "de" estava na ilha de Sylt; o corpo da Alemanha, a Noruega e os
    // Países Baixos tinham perdido o id na edição
    desnomear: ['de'],
    renomear: { path1458: 'no', path1260: 'nl', path1532: 'de', crimea_disputed: 'crimea' },
    // Rússia = corpo + Kaliningrado; Ucrânia = corpo + Crimeia
    agrupar: { ru: ['ru-main', 'ru-kgd'], ua: ['ua', 'crimea'] },
    // Ilhotas ao sul da Sicília (Pantelleria etc.) ficam mais perto de Malta
    // que do continente italiano; a Zelândia fica colada à Bélgica
    correcoes: { path1714: 'it', path1716: 'it', path1718: 'it', path1274: 'nl' },
    // Sem forma visível nesta escala: círculos. Posições por projeção cônica
    // ajustada a pontos conhecidos do desenho, conferidas contra a costa
    micro: { mc: [217.2, 481.2], sm: [277.7, 476.0], va: [278.1, 510.4] }
};
