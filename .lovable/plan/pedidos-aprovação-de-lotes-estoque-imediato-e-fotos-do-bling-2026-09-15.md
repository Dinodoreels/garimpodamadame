# Pedidos, aprovação de lotes, estoque imediato e fotos do Bling

## Objetivo
Concluir o fluxo real do Bling dentro do painel: trazer pedidos dos marketplaces, exigir aprovação dos lotes de produtos antes do estoque, sincronizar o saldo imediatamente e exibir as fotos com acesso direto ao produto.

## Estado confirmado
- A conta do Bling está conectada e a importação de pedidos está ligada.
- Existe 1 pedido do Bling no painel; novas buscas hoje ignoram pedidos já conhecidos, portanto não atualizam mudanças posteriores de situação.
- Os 52 produtos já importados estão vinculados, mas o depósito padrão ainda não foi escolhido; sem isso não é possível confirmar o saldo real por depósito.
- A revisão atual usa apenas seleção de itens. Ainda não registra aprovação/reprovação, motivo, responsável e histórico.
- As fotos já podem ser gravadas em Produtos, mas a lista não mostra vínculo nem acesso direto ao item importado do Bling.

## Implementação

### 1. Importar e atualizar pedidos reais
- Paginar a busca para não limitar a importação aos primeiros 100 pedidos alterados.
- Buscar o detalhe de cada pedido e trazer cliente, documento, contato, endereço, itens, quantidades, valores, frete, canal e situação.
- Vincular os itens aos produtos e SKUs locais quando houver correspondência no Bling.
- Atualizar pedidos já importados quando situação, pagamento, envio ou rastreio mudarem, registrando cada mudança no histórico do pedido.
- Proteger contra duplicidade mesmo quando busca manual, rotina automática e aviso do Bling ocorrerem juntos.
- Exibir um resumo da execução: novos, atualizados, ignorados e erros com motivo.

### 2. Aprovação lote por lote antes do estoque
- Transformar cada busca de catálogo em um lote de revisão com estados: `Aguardando aprovação`, `Aprovado`, `Reprovado`, `Aplicando`, `Concluído` e `Erro`.
- Registrar decisão, motivo obrigatório, administrador responsável e data; manter histórico imutável de cada decisão.
- Criar uma tela administrativa de lotes com resumo, produtos, fotos, diferenças, estoque do depósito, motivo e histórico.
- Permitir aprovar ou reprovar o lote inteiro; uma reprovação poderá ser revisada e aprovada depois, sem apagar o histórico anterior.
- Bloquear a aplicação de qualquer produto ou estoque enquanto o lote não estiver aprovado.

### 3. Estoque imediato e seguro
- Exigir a escolha do depósito do Bling antes de buscar ou aplicar um lote.
- No momento da aplicação, consultar novamente o saldo real do depósito para evitar usar uma prévia antiga.
- Respeitar a origem de estoque configurada: se o Bling controla, atualizar o painel imediatamente com o saldo do depósito; se a loja controla, enviar o saldo ao Bling imediatamente.
- Confirmar o resultado dos dois lados antes de concluir o lote, sem esperar a rotina automática.
- Manter proteção contra atualizações em círculo, repetição segura e registro detalhado de sucesso ou falha por produto.
- Atualizar Produtos e a tela do lote automaticamente assim que cada item for aplicado.

### 4. Fotos e acesso direto ao produto
- Buscar as imagens do detalhe completo do produto no Bling, incluindo imagens internas, externas e principal.
- Gravar somente fotos ainda inexistentes, preservando a ordem e evitando duplicações em novas execuções.
- Mostrar miniatura, quantidade de fotos e aviso claro quando o produto não tiver imagem no Bling.
- Após a aplicação, mostrar um botão direto para abrir o produto correspondente em **Produtos** no painel.
- Na lista de Produtos, identificar itens vinculados ao Bling e permitir abrir sua ficha completa com as fotos importadas.

## Segurança e dados
- Somente administradores poderão aprovar, reprovar ou aplicar lotes.
- Nenhum produto, pedido, foto ou histórico existente será apagado.
- Produtos novos continuarão como rascunho oculto até aprovação e aplicação.
- Serão usados apenas pedidos, clientes, saldos e imagens realmente retornados pela conta conectada; nada será inventado.

## Validação real
- Selecionar o depósito real no painel antes da execução.
- Executar a busca real de pedidos e conferir cliente, itens, frete, canal e situação no painel.
- Aprovar um lote com motivo, aplicar e comparar o estoque do depósito no Bling com Produtos no painel.
- Confirmar fotos e links nos produtos aplicados.
- Repetir as rotinas para comprovar que pedidos, produtos, vínculos, fotos e históricos não duplicam.
