# Ciclo operacional completo

## Objetivo
Criar em **Administração → Operacional** uma visão única do trabalho, desde a chegada da carga até o pós-compra, mostrando somente dados reais e indicando onde a operação precisa agir. Ao concluir a venda, entrega, troca ou reembolso, o painel volta a destacar entrada, reposição e novas oportunidades, reiniciando o ciclo.

## O que será construído
- Adicionar a área **Operacional** ao menu administrativo, sem remover as telas atuais.
- Exibir o ciclo em etapas conectadas:
  1. Carga e recebimento
  2. Lotes e triagem
  3. Identificação e controle de qualidade
  4. Cadastro, preço e etiqueta interna
  5. Endereçamento e estoque central
  6. Publicação nos canais de venda
  7. Pedido e pagamento
  8. Separação, nota e etiqueta de envio
  9. Postagem e entrega
  10. Pós-compra, troca ou reembolso
  11. Reposição e reinício do ciclo
- Cada etapa mostrará quantidade real, situação, pendências, próxima ação e acesso direto à tela responsável.
- Destacar gargalos por prioridade: bloqueios, atrasos, dados incompletos e falhas de integração.
- Incluir uma fila de **Próximas ações**, ordenada pelo que exige atenção primeiro.
- Manter o estoque da Vanguard Store como centro: a publicação só aparece como concluída após produto aprovado, precificado, endereçado e disponível.
- No pós-compra, mostrar pedidos entregues, reembolsos/trocas pendentes e itens que retornaram ao estoque; depois alimentar novamente as necessidades de reposição.

## Regras
- Não criar números, pedidos, clientes, produtos ou movimentações fictícias.
- Reaproveitar recebimentos, lotes, itens Inbound, produtos, estoque, filas de publicação, pedidos, pagamentos, etiquetas, envios e reembolsos existentes.
- Não alterar automaticamente situações comerciais ou operacionais apenas por abrir o painel.
- Respeitar as permissões atuais: administrador vê todo o ciclo; equipe do galpão continua limitada ao Inbound.
- Não executar pagamento, reembolso, emissão fiscal ou compra de etiqueta durante os testes.

## Detalhes técnicos
- Criar uma página administrativa responsiva para o ciclo operacional e um hook agregador com consultas somente leitura.
- Usar os componentes e tokens visuais existentes, com cartões compactos por etapa e ligações para as rotas atuais.
- Tratar ausência de dados, falha parcial e carregamento sem derrubar a página inteira.
- Adicionar a rota protegida e o item no menu administrativo.
- Registrar a entrega no roadmap do projeto.

## Validação
- Confirmar que a loja continua abrindo sem o erro “Component is not a function”.
- Conferir a nova área no computador e no celular.
- Validar que cada total corresponde aos registros reais e que todos os acessos levam à tela correta.
- Verificar estados vazios, carregamento e falhas sem tela branca.
