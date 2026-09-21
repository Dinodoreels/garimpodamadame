# Tela de pedidos mais clean e funcional

## Objetivo
Transformar **Pedidos, cobranças e etiquetas** em uma central operacional minimalista, mantendo a paleta, a tipografia, os dados e as regras atuais.

## Mudanças visuais
- Manter o cabeçalho enxuto, com **Imprimir etiquetas**, **Exportar** e **Novo pedido** claramente separados por prioridade.
- Reunir as sete filas operacionais em uma única faixa compacta e clicável, destacando apenas a fila selecionada.
- Reduzir os quatro canais de venda para resumos discretos, sem cores decorativas ou caixas pesadas.
- Trocar os sete cartões de situação por seletores compactos com contador.
- Organizar busca, origem, cobrança, etiqueta, vendedor e período em uma área única de filtros.
- Fazer a lista de pedidos aparecer mais cedo na tela e ocupar o foco principal.
- Preservar o comportamento em telas menores, reorganizando faixas e filtros sem sobreposição.

## Melhorias de funcionamento
- Manter filtros combináveis e deixar a seleção atual mais evidente.
- Permitir voltar a “Todos” ao clicar novamente em uma situação ou fila selecionada.
- Exibir quantidade de resultados e filtros ativos de forma compacta.
- Manter impressão, exportação, criação, paginação e abertura dos detalhes dos pedidos funcionando como hoje.
- Preservar os avisos claros quando a consulta de pedidos for recusada, sem apresentar lista vazia como se os dados tivessem sumido.

## Correção de estabilidade
- Corrigir a inconsistência de estado no carregamento do painel que gera o erro do React **“Should have a queue”**.
- Garantir que a tela continue renderizando durante atualização rápida e recarregamento da prévia.

## Validação
- Conferir com os pedidos reais que filas, canais, situações, busca e filtros apresentam os mesmos resultados de antes.
- Testar impressão de etiquetas, exportação, novo pedido, detalhes e paginação sem executar pagamento, postagem ou compra de etiqueta.
- Validar desktop e celular, sem sobreposição e sem erro de tela branca.

## Limites
- Nenhum pedido, cobrança, etiqueta ou registro será alterado.
- Nenhuma regra de pagamento, estoque, Bling ou Melhor Envio será modificada.
- Nenhuma cor ou fonte nova será adicionada ao projeto.
