// Configuração da conversão do mapa da África (veja ferramentas/converter_mapa.js).
// Entrada: fontes/africa/BlankMap-Africa.svg (Wikimedia, domínio público):
// cada país já vem com id = ISO (grupo quando tem ilhas); os pequenos
// insulares trazem um círculo (class "circle", invisível no original) que
// aqui fica visível como o "ponto" clicável. Saída: src/assets/svg/africa.svg
window.CONFIG = {
    viewBox: '0 0 1000 1000',
    paises: ['za','ao','dz','bj','bw','bf','bi','cv','cm','td','km','ci','dj','eg','er','sz','et','ga','gm','gh',
             'gn','gq','gw','ls','lr','ly','mg','mw','ml','ma','mu','mr','mz','na','ne','ng','ke','cf','cd','cg',
             'rw','st','sn','sl','sc','so','sd','ss','tz','tg','tn','ug','zm','zw'],
    // Territórios europeus (Canárias, Madeira, Mayotte, Réunion, Santa Helena)
    // não fazem parte da tabela e ficariam como pontos soltos no oceano.
    // "pt-30" (Madeira) vira "pt" quando o conversor tira o sufixo numérico.
    remover: ['es-cn', 'pt', 'yt', 're', 'sh'],
    // Saara Ocidental (eh) fica no desenho, cinza, sem país
    irmaosDoGrupo: false
};
