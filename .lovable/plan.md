# Validar e fechar o ciclo operacional completo

## Situação confirmada
- Existem **2 recebimentos abertos** e **2 lotes abertos**, com 2.000 unidades esperadas e nenhuma processada.
- Ainda não há itens no fluxo Inbound nem posições físicas ativas; por isso triagem, qualidade e endereçamento não podem ser homologados com uma peça real neste momento.
- Há 5 produtos ativos e 4 não possuem peso ou todas as dimensões necessárias para frete e etiqueta automática.
- Há 14 pedidos com pagamento registrado e nenhum envio do Melhor Envio. Porém, a central atual mistura **3 pedidos do site já entregues** e **11 pedidos antigos de marketplace**; marketplaces não devem entrar na fila do Melhor Envio.
- Os 14 pedidos não têm endereço vinculado nem movimento de estoque, indicando dados legados que precisam de conciliação, não de baixa automática.
- O Bling tem 3 falhas reais: PI20260023, PI20260024 e PI20260028. Duas falham ao salvar a venda e uma ao validar o cliente.
- Existem 2 publicações pendentes de Body Splash, sem erro registrado.
- Não existem reembolsos pendentes, avaliações, carrinhos abandonados ou notificações aguardando envio.
- Os atalhos atuais da central usam parâmetros que a tela de pedidos ainda não lê; portanto abrem a página, mas não a fila já filtrada.

## Fluxo de trabalho
```text
Carga → Recebimento → Lote → Scan/Triagem → QC → Preço
→ Endereço → Estoque Vanguard → Bling/Canais → Venda
→ Reserva/Baixa → Separação → Fiscal/Etiqueta → Envio
→ Entrega → Pós-compra → Retorno à triagem → Novo ciclo
```

## Etapa 1 — Tornar a central operacional fiel à realidade
- Separar pedidos do site, marketplaces e pedidos legados.
- Considerar como pendente de separação somente situações realmente acionáveis; pedidos entregues não entram nessa fila.
- Aplicar Melhor Envio somente aos pedidos do site e mostrar etiquetas de marketplace em uma fila própria.
- Corrigir os contadores de recebimentos, pendências de triagem, expedição e pós-compra.
- Fazer os botões da central abrirem filtros reais na tela de pedidos.
- Exibir falha parcial e horário da atualização quando alguma fonte não responder, sem transformar ausência de dados em “Em dia”.

**Teste:** comparar cada cartão com consultas reais e abrir cada atalho, confirmando que a lista exibida corresponde ao número do cartão.

## Etapa 2 — Homologar entrada, lote e Scan
- Verificar permissões por função e seleção automática do lote aberto mais recente.
- Mostrar claramente lote escolhido, unidades esperadas, processadas e restantes.
- Testar código de barras, foto, identificação local, identificação assistida e encaminhamento para pendência.
- Impedir gravação sem lote e duplicidade causada por toque repetido.
- Não publicar automaticamente durante a homologação.

**Teste seguro:** usar uma peça física real do lote, gravá-la com publicação bloqueada e conferir foto, código, evidências, contador do lote e histórico. Sem peça real, executar somente testes de leitura e validação.

## Etapa 3 — Triagem, qualidade, preço e endereçamento
- Transformar as filas em uma sequência orientada pela próxima ação.
- Conferir transições permitidas: identificado → qualidade → preço → endereço → estoque.
- Exigir motivo e evidência para quarentena ou reprovação.
- Validar capacidade e atividade da posição física antes de guardar.
- Criar um assistente de configuração das posições, sem inventar códigos ou localização do galpão.

**Dependência:** os códigos reais de zona, corredor, estante, prateleira e posição devem ser cadastrados pela operação.

**Teste:** avançar a mesma peça real por cada etapa, tentar uma transição fora de ordem e confirmar que ela é bloqueada e registrada.

## Etapa 4 — Estoque central, catálogo e etiquetas internas
- Confirmar que guardar no CD registra uma única movimentação.
- Liberar para venda somente produto completo, aprovado, endereçado, com SKU, preço, peso e dimensões.
- Vincular a etiqueta interna à peça/SKU e ao endereço físico.
- Manter Vanguard Store como fonte central; Bling e canais recebem somente depois da liberação.

**Teste:** imprimir uma prévia interna, ler o código novamente e confirmar que aponta para o item certo; não publicar em canal real durante o teste.

## Etapa 5 — Corrigir Bling e publicações pendentes
- Mostrar no painel os campos exatos recusados pelo Bling antes de permitir nova tentativa.
- Corrigir os dados de cliente/venda dos três pedidos confirmados e reprocessar individualmente, com idempotência.
- Analisar prontidão e campos pendentes das duas publicações de Body Splash.
- Verificar vínculo existente antes de publicar para impedir anúncio duplicado.

**Teste:** executar primeiro uma validação sem envio; depois reprocessar somente um registro aprovado e confirmar vínculo, resposta e histórico antes dos demais.

## Etapa 6 — Separação, fiscal, etiqueta e envio
- Criar filas distintas: “Separar”, “Aguardando dados”, “Aguardando nota”, “Etiqueta pronta”, “Postar” e “Em trânsito”.
- Mostrar lista de separação com produto, quantidade, SKU e posição física.
- Para pedidos do site, manter automação híbrida: completos seguem; divergentes aguardam revisão.
- Para marketplaces, usar somente a etiqueta oficial do canal.
- Criar uma tela de conciliação dos 14 pedidos legados, sem baixar estoque, comprar etiqueta ou mudar situação automaticamente.

**Teste seguro:** validar um pedido elegível em modo de conferência, sem cobrança, emissão fiscal ou compra de etiqueta. A compra real exigirá aprovação separada.

## Etapa 7 — Entrega, pós-compra e reinício
- Confirmar atualização de rastreio, entrega e e-mails transacionais.
- Validar devolução → quarentena/triagem; nunca devolver diretamente ao estoque vendável.
- Testar o fluxo de reembolso em simulação até antes do estorno real.
- Preparar solicitação de avaliação e carrinho abandonado, mantendo marketing condicionado ao consentimento.
- Mostrar na central quando o item devolvido estiver pronto para reiniciar o ciclo.

## Ordem de execução
1. Corrigir verdade dos indicadores e atalhos.
2. Homologar entrada com uma peça real.
3. Cadastrar posições reais e concluir QC/estoque.
4. Completar embalagem dos quatro produtos.
5. Corrigir Bling e revisar publicações.
6. Criar expedição e conciliação dos legados.
7. Validar pós-compra e retorno à triagem.
8. Repetir o ciclo ponta a ponta e registrar resultado de cada etapa.

## Regras de segurança
- Não inventar produtos, endereços, posições, clientes ou documentos.
- Não cobrar, estornar, emitir nota, publicar anúncio ou comprar etiqueta durante testes comuns.
- Toda ação externa terá prévia, confirmação explícita, idempotência e histórico.
- Pedidos legados serão conciliados manualmente; nunca terão estoque alterado em massa sem revisão.
- Cada etapa só será marcada como concluída após teste visual, consulta dos registros e ausência de erro relevante.
