// Ordenação dos países: usada pela tabela (DadosPanel), pela ordem em que
// o laço "para cada país" percorre os países e pelo dropdown do bloco "se ="

// Colunas com ordem própria (geográfica, não alfabética); as demais
// ficam em ordem alfabética. Vem do continente carregado (veja
// src/continentes.js): o App chama definirOrdemValores ao abrir um.
let ORDEM_VALORES = {};

export function definirOrdemValores(ordem) {
    ORDEM_VALORES = ordem || {};
}

// Ordenação padrão de toda coluna: nome do país, crescente
export const ORDENACAO_PADRAO = { por: 'País', direcao: 'asc' };

// Compara dois valores de uma coluna em ordem crescente: números pelo
// valor, texto pela ordem própria da coluna (se houver) ou alfabética.
// Valores ausentes vão para o fim.
export function compararValores(coluna, a, b) {
    if (a == null || b == null) return (a == null) - (b == null);
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    const ordem = ORDEM_VALORES[coluna];
    if (ordem) {
        const posicao = (v) => {
            const i = ordem.indexOf(v);
            return i === -1 ? Infinity : i; // desconhecidos vão para o fim
        };
        const d = posicao(a) - posicao(b);
        if (d) return d;
    }
    // numeric: "Aluno 2" antes de "Aluno 10"
    return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
}

// Devolve uma cópia dos países ordenada. Empates (mesmo valor na coluna)
// ficam por nome do país, crescente.
export function ordenarPaises(paises, coluna, { por, direcao }) {
    const chave = por === 'País' ? 'País' : coluna;
    const sinal = direcao === 'desc' ? -1 : 1;
    return [...paises].sort((a, b) =>
        sinal * compararValores(chave, a[chave], b[chave]) ||
        compararValores('País', a['País'], b['País'])
    );
}
