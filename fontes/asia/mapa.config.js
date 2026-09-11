// Configuração da conversão do mapa da Ásia (veja ferramentas/converter_mapa.js).
// Entrada: fontes/asia/Mapa_Ásia_pb (1).svg — mapa em tons de cinza, sem
// nenhum id de país: cada país foi identificado pela posição (projeção
// ajustada a lagos e ilhas conhecidos) e conferido visualmente.
// Saída: src/assets/svg/asia.svg
window.CONFIG = {
    viewBox: '0 0 935.3 736.2',
    paises: ['af','sa','am','az','bh','bd','bn','bt','kh','qa','kz','cn','cy','kp','kr','eg','ae','ph','ge','ye',
             'in','id','ir','iq','il','jp','jo','kw','la','lb','my','mv','mm','mn','np','om','ps','pk','kg','ru',
             'sg','sy','lk','th','tj','tl','tm','tr','uz','vn'],
    // Caminho principal de cada país (ids do Inkscape sem o sufixo)
    renomear: {
        path1124: 'af', path1236: 'sa', path3826: 'am', path3648: 'az', path1320: 'bh', path1196: 'bd',
        path4676: 'bn', path3768: 'bt', path3896: 'kh', path1324: 'qa', path1754: 'kz', path564: 'cn',
        path1234: 'cy', path4360: 'kp', path3898: 'kr', path3276: 'eg', path640: 'ae', path3660: 'ph',
        path3330: 'ge', path448: 'ye', path3342: 'in', path60: 'id', path2462: 'ir', path1900: 'iq',
        path4356: 'il', path1366: 'jp', path626: 'jo', path3338: 'kw', path4358: 'la', path4672: 'lb',
        path2578: 'my', path2464: 'mm', path2576: 'mn', path4674: 'np', path2642: 'om', path3326: 'ps',
        path52: 'pk', path2554: 'kg', path780: 'ru', path2550: 'sy', path4350: 'lk', path1774: 'th',
        path3874: 'tj', path4438: 'tm', path1314: 'tr', path1326: 'uz', path1418: 'vn',
        // Não está na tabela: fica cinza, mas com id para não virar "ilha" de outro país
        path602: 'tw'
    },
    // Partes separadas do mesmo país (as ilhas menores são atribuídas por
    // proximidade pelo conversor)
    agrupar: {
        bn: ['bn', 'path4678'],                                   // Brunei é dividido em dois pelo Limbang
        ph: ['ph', 'path3714', 'path3746', 'path3730', 'path3654'], // Luzon, Mindanao, Samar, Negros, Palawan
        id: ['id', 'path410', 'path136', 'path418', 'path204', 'path184', 'path198', 'path308', 'path642'],
                                                                  // Sumatra, Kalimantan, Java, Papua, Sulawesi, Bali, Sumbawa, Halmahera, Timor
        jp: ['jp', 'path1402', 'path1358', 'path1388'],           // Honshu, Hokkaido, Kyushu, Shikoku
        my: ['my', 'path2580'],                                   // península + Sarawak/Sabah
        ps: ['ps', 'path3324'],                                   // Cisjordânia + Gaza
        kw: ['kw', 'path3292'],                                   // + ilha de Bubiyan
        tr: ['tr', 'path1312'],                                   // + Trácia
        ru: ['ru', 'path1138'],                                   // + Sacalina
        cn: ['cn', 'path566'],                                    // + Hainan
        mv: ['path3763', 'path4650', 'path4652', 'path4654', 'path4656', 'path4658'] // Maldivas: os 6 círculos do desenho
    },
    // Ilhas cujo país mais próximo no desenho não é o dono
    correcoes: {
        // Riau, Lingga, Natuna e Anambas (Indonésia) ficam coladas à Malásia
        path84: 'id', path88: 'id', path90: 'id', path94: 'id', path100: 'id', path104: 'id', path113: 'id',
        path118: 'id', path122: 'id', path126: 'id', path130: 'id', path140: 'id', path150: 'id', path1128: 'id',
        path1328: 'vn',   // Phu Quoc (Vietnã) fica colada ao Camboja
        path2552: 'om',   // Musandam (exclave de Omã) na ponta dos Emirados
        path3340: 'sa',   // ilha saudita no Golfo
        // Andamão e Nicobar (Índia) ficam mais perto de Mianmar e da Indonésia
        path3302: 'in', path3304: 'in', path3306: 'in', path3308: 'in', path3310: 'in',
        path3312: 'in', path3314: 'in', path3316: 'in', path3318: 'in',
        path1338: 'jp'    // Yonaguni (Ryukyu), colada a Taiwan
    },
    // Lagos desenhados em ciano no arquivo (não estão dentro de país nenhum)
    lagos: ['path4710', 'path4712', 'path4740', 'path4742', 'path4746', 'path4762', 'path3706', 'path4726'],
    remover: ['path4724', 'line3560', 'line4748'], // cópia preta do Cáspio por baixo do lago; duas linhas de comprimento zero
    neutros: ['path3699'],    // Caxemira (área disputada): cinza, sem país
    distanciaMaxima: 35,      // ilhas remotas (Palau, Guam, Chagos...) ficam sem país
    irmaosDoGrupo: false,     // os grupos aqui são camadas com dezenas de países
    // Sem forma própria no desenho: Singapura (ponta da península malaia) e
    // Timor-Leste (metade leste da ilha de Timor, que é um só caminho)
    micro: { sg: [611, 631], tl: [785.5, 717.5] }
};
