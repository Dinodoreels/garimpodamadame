# SEO administrável e reembolso confirmado

## Objetivo
Dar ao administrador controle visual sobre títulos, descrições e prévias sociais, melhorar a descoberta das páginas pelo Google e concluir o reembolso somente após confirmação do Mercado Pago.

## Implementação

### 1. Gestão de SEO no painel
- Criar uma área “SEO” no painel administrativo para produtos e páginas públicas.
- Permitir editar título para buscadores, descrição e imagem de compartilhamento sem abrir código.
- Mostrar prévias de resultado do Google e de compartilhamento social antes de salvar.
- Manter valores atuais como padrão quando um campo personalizado estiver vazio.
- Aplicar os dados salvos nas páginas públicas, incluindo produto, páginas institucionais, promoções e kits.

### 2. Sitemaps, robôs e diagnóstico
- Manter um sitemap principal com páginas públicas e criar um sitemap de produtos ativos usando somente produtos reais.
- Atualizar `robots.txt` para indicar os dois sitemaps e continuar permitindo rastreamento público.
- Exibir no painel o estado de indexação informado pelo Google, incluindo o motivo retornado quando uma URL não estiver indexada.
- Não apresentar ausência de dados como prova de falta de indexação.

### 3. Reembolso real e seguro
- Ao aprovar, validar pedido, pagamento e saldo reembolsável antes de enviar a solicitação ao Mercado Pago.
- Registrar o início do estorno com chave de segurança contra duplicação.
- Manter o reembolso como “processando” enquanto o Mercado Pago não confirmar o retorno.
- Após confirmação, concluir total ou parcialmente; em reembolso total, devolver estoque uma única vez, atualizar o Bling, cancelar envio elegível e registrar cada resultado.
- O retorno automático do Mercado Pago também poderá concluir o mesmo fluxo sem duplicar estoque ou avisos.

### 4. E-mails ao cliente
- Enviar “Reembolso aprovado” quando o pedido de estorno for aceito para processamento.
- Enviar “Dinheiro devolvido” somente após a confirmação do Mercado Pago.
- Usar a identidade O Garimpo Digital e o domínio oficial já verificado.
- Tornar cada envio único por reembolso, evitando mensagens duplicadas em tentativas ou retornos repetidos.

## Validação
- Validar a tela de SEO no computador e celular, incluindo edição e prévias.
- Conferir `robots.txt`, sitemap principal e sitemap de produtos.
- Testar o fluxo de reembolso com respostas simuladas/seguras, sem estornar pedido real.
- Renderizar e conferir os dois e-mails e publicar as funções alteradas.
