// Catálogo dos continentes que a ferramenta sabe regionalizar. A tela
// inicial lista estas entradas e o app carrega a escolhida (?continente=id).
//
// Para acrescentar um continente: criar src/assets/svg/<id>.svg (cada país
// é um elemento com id = código ISO de 2 letras, em minúsculas),
// src/assets/data/<id>_paises.json (lista de objetos, uma chave por coluna
// da tabela, sempre com "País") e src/assets/data/<id>_iso.json (nome do
// país -> código ISO), e marcar a entrada abaixo com disponivel: true.

export const CONTINENTES = {
    america: {
        id: 'america',
        nome: 'América',
        icone: '🌎',
        descricao: '35 países, do Canadá à Argentina',
        disponivel: true,
        // Coluna da tabela exibida ao abrir
        colunaInicial: 'Região',
        // Colunas de texto com ordem própria (geográfica, não alfabética),
        // usada na tabela e no dropdown do bloco "se ="
        ordemValores: {
            'Região': ['Norte', 'Central', 'Sul']
        },
        // Ids do SVG que não fazem parte do continente e são removidos
        // do mapa: o arquivo de origem é um mapa-múndi recortado.
        // gl = Groenlândia, is = Islândia, aq = Antártida,
        // ck/ki/pf/pn = ilhas do Pacífico
        ocultar: ['gl', 'is', 'aq', 'ck', 'ki', 'pf', 'pn'],
        // Ajuste específico deste arquivo, aplicado depois de inserir o SVG:
        // os Grandes Lagos não são elementos, são buracos recortados nos
        // caminhos dos EUA/Canadá, então mostram o fundo da página.
        // Colocamos um polígono azul ATRÁS de tudo, só na região dos lagos
        // (coordenadas do viewBox original), para os buracos ficarem azuis.
        // O canto inferior direito é chanfrado para não vazar no Atlântico.
        prepararMapa(svg) {
            if (svg.querySelector('#grandes-lagos')) return;
            const poligono = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poligono.setAttribute('id', 'grandes-lagos');
            poligono.setAttribute('points', '1436,-18 1668,-18 1668,115 1640,134 1436,134');
            svg.insertBefore(poligono, svg.firstChild);
        }
    },
    europa: {
        id: 'europa',
        nome: 'Europa',
        icone: '🗺️',
        descricao: '50 países, da Islândia ao Cáucaso',
        disponivel: true,
        colunaInicial: 'Região geográfica',
        ordemValores: {
            'Região Guerra Fria': ['Ocidental', 'Oriental'],
            'Região geográfica': ['Setentrional', 'Ocidental', 'Centro-Oriental', 'Meridional']
        },
        // O SVG já vem recortado (europa.svg); territórios que não estão na
        // tabela (Ilhas Faroé, Jersey, Guernsey, Ilha de Man) ficam cinza
        ocultar: []
    },
    asia: {
        id: 'asia',
        nome: 'Ásia',
        icone: '🌏',
        descricao: '50 países, do Oriente Médio ao Japão',
        disponivel: true,
        colunaInicial: 'Região',
        ordemValores: {
            'Região': ['Ásia Setentrional', 'Ásia Ocidental', 'Oriente Médio', 'Ásia Central',
                       'Sul da Ásia', 'Sudeste Asiático', 'Leste Asiático']
        },
        // O SVG já vem recortado (asia.svg); Taiwan, a Caxemira e ilhas
        // remotas ficam cinza, sem país
        ocultar: []
    },
    africa: {
        id: 'africa',
        nome: 'África',
        icone: '🌍',
        descricao: '54 países, do Magrebe ao Cabo',
        disponivel: true,
        colunaInicial: 'Região',
        ordemValores: {
            'Região': ['África Setentrional', 'África Ocidental', 'África Central', 'África Oriental', 'África Austral'],
            'Norte ou Subsaariana': ['África Setentrional', 'África Subsaariana']
        },
        // O Saara Ocidental (eh) fica no mapa, cinza, sem país
        ocultar: []
    },
    oceania: {
        id: 'oceania',
        nome: 'Oceania',
        icone: '🏝️',
        descricao: '14 países, da Austrália às ilhas do Pacífico',
        disponivel: true,
        colunaInicial: 'Região',
        ordemValores: {
            'Região': ['Australásia', 'Melanésia', 'Micronésia', 'Polinésia']
        },
        // Indonésia, Nova Caledônia e outros territórios ficam cinza, sem país
        ocultar: []
    }
};

// Lista na ordem em que aparecem na tela inicial
export const LISTA_CONTINENTES = Object.values(CONTINENTES);

// Caminhos dos arquivos de um continente
export function arquivosDoContinente(continente) {
    return {
        mapa: `src/assets/svg/${continente.id}.svg`,
        paises: `src/assets/data/${continente.id}_paises.json`,
        iso: `src/assets/data/${continente.id}_iso.json`
    };
}

// Continente pedido na URL (?continente=id), se existir e estiver
// disponível; senão null (mostra a tela inicial)
export function continenteDaURL() {
    const id = new URLSearchParams(location.search).get('continente');
    const continente = CONTINENTES[id];
    return continente && continente.disponivel ? continente : null;
}

// URL para abrir a ferramenta em um continente
export function urlDoContinente(continente) {
    return `?continente=${continente.id}`;
}
