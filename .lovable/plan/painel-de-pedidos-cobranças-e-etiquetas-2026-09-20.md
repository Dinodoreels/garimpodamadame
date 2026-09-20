# Painel de pedidos, cobranças e etiquetas

## Objetivo
Aprimorar o painel administrativo atual para reunir pedidos, situação das cobranças e etiquetas em uma única visão operacional. O acesso continuará como está hoje, sem criar um login administrativo separado, conforme solicitado.

## Painel unificado
- Adicionar em cada pedido a forma e a situação do pagamento, valor pago e eventual falha registrada.
- Mostrar a origem da venda e separar claramente etiquetas de marketplaces das etiquetas do Melhor Envio.
- Exibir o status individual da etiqueta: aguardando liberação, pronta, impressa ou com erro.
- Mostrar a plataforma, o formato recebido e uma prévia/abertura do PDF oficial sem alterar o arquivo.
- Permitir filtrar pedidos por pagamento, origem e situação da etiqueta.
- Manter o detalhe do pedido com ações próprias para atualizar, abrir ou imprimir a etiqueta.
- Informar que a etiqueta deve ser impressa no tamanho indicado no PDF original, sem recorte ou redimensionamento.

## Liberação automática das etiquetas
- Criar uma rotina protegida que consulte periodicamente somente pedidos elegíveis com etiqueta pendente.
- Não consultar pedidos cancelados nem repetir processamento de etiquetas já prontas.
- Quando a plataforma fornecer o PDF, atualizar automaticamente a etiqueta para “Pronta”.
- Criar um aviso administrativo com o número do pedido e a plataforma quando a etiqueta mudar de pendente para pronta.
- Manter tentativas, última consulta e erro real no histórico, evitando avisos duplicados.
- Programar a verificação recorrente junto às sincronizações atuais de pedidos.

## Operação no ponto de distribuição
Para vendas do site, o fluxo continuará: preparar postagem, comprar e gerar a etiqueta do Melhor Envio, imprimir, colar no pacote e entregar na agência/ponto indicado pela transportadora. Para vendas de marketplaces, será usada somente a etiqueta oficial liberada pela própria plataforma. O painel acompanhará postagem, trânsito e entrega quando esses eventos forem fornecidos.

## Estado confirmado
- O painel administrativo e a tela de pedidos já existem e exigem permissão administrativa.
- Os pedidos já carregam dados de cobrança, Melhor Envio e etiquetas de marketplaces.
- Existem atualmente 22 etiquetas de marketplace com situação “ainda não liberada”; nenhuma possui PDF disponível neste momento.
- Já há sincronizações automáticas do Bling ativas, mas não existe uma rotina periódica exclusiva para consultar novamente essas etiquetas.

## Validação
- Confirmar que pedidos, cobranças e etiquetas aparecem corretamente em computador e celular.
- Testar os filtros e as ações por pedido.
- Simular a transição pendente → pronta e confirmar um único aviso administrativo.
- Garantir que pedidos cancelados e etiquetas prontas não sejam reconsultados.
- Publicar a função alterada e testar a execução automática sem comprar frete ou gerar cobranças.
