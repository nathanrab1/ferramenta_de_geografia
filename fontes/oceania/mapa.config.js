// Configuração da conversão do mapa da Oceania (veja ferramentas/converter_mapa.js).
// Entrada: fontes/oceania/Blank_Map_Oceania.svg — mapa de regiões botânicas
// (Wikimedia): Austrália por estados, Nova Zelândia, Nova Guiné, Salomão e
// as ilhas do Pacífico como pontinhos minúsculos sem nome. Os dez países
// insulares viram círculos nas coordenadas da planilha (projeção Mercator
// ajustada às caixas da Austrália/NZ), e os pontinhos ao redor são
// atribuídos a eles. Saída: src/assets/svg/oceania.svg
window.CONFIG = {
    viewBox: '0 0 297 210',
    paises: ['au','fj','mh','sb','ki','fm','nr','nz','pw','pg','ws','to','tv','vu'],
    renomear: { Australia: 'au', NewZealand: 'nz', SOL: 'sb' },
    // Papua-Nova Guiné = metade leste da Nova Guiné + arquipélago de Bismarck
    agrupar: { pg: ['path2744', 'BIS'] },
    // Bougainville e Buka estão no grupo das Salomão, mas são da PNG
    correcoes: { path2738: 'pg', path2734: 'pg' },
    // Indonésia, Filipinas, Malásia (Indomalaya/Malesia) e a Papua indonésia
    // ficam no desenho, cinza, sem país
    neutros: ['Indomalaya', 'Malesia', 'path2549', 'path2561', 'path2563'],
    desagrupar: ['Australasia', 'Papuasia', 'NWG', 'NZNorth', 'NZSouth', 'SouthwesternPacific',
                 'NorthwesternPacific', 'WAU', 'NTA', 'QLD', 'SOA', 'NSW', 'TAS'],
    micro: { 'fj': [176.1, 108.2],
             'mh': [158.5, 43.2],
             'ki': [163.2, 57.9],
             'fm': [125.0, 43.7],
             'nr': [147.5, 62.9],
             'pw': [63.9, 42.1],
             'ws': [200.8, 97.0],
             'to': [193.8, 117.5],
             'tv': [179.3, 83.5],
             'vu': [147.5, 101.6] },
    raioMicro: 2.2,           // o viewBox tem só 297 unidades de largura; é quase tudo oceano, então os pontos podem ser bem maiores
    distanciaMaxima: 7,       // pontinhos longe de qualquer círculo (Nova Caledônia, Polinésia Francesa...) ficam sem país
    irmaosDoGrupo: false,
    limparIds: true,          // tira os ids de estados/regiões (WA, NSW, NZN...)
    tracoFino: ['au']         // divisas dos estados australianos mais finas que as fronteiras
};
