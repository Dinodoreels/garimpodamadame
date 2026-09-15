# Conexão completa com o Melhor Envio

## Resultado
Conectar a conta de produção do Melhor Envio ao sistema para cotar fretes reais, registrar a opção escolhida no pedido, comprar e imprimir etiquetas, acompanhar rastreamento e atualizar o andamento da entrega sem alterar o fluxo atual de pedidos.

## 1. Conexão segura
- Retirar o token da configuração visível e guardá-lo somente no cofre seguro do projeto.
- Manter no painel apenas o estado da conexão, CEP de origem e dados não sigilosos.
- Adicionar ações para conectar, testar, trocar credencial e desativar sem apagar pedidos ou envios existentes.
- Validar a conta de produção antes de ativar as cotações reais.

## 2. Cotação real no carrinho e checkout
- Reaproveitar o cálculo de peso e dimensões já existente, consultando os serviços reais do Melhor Envio.
- Mostrar transportadora, serviço, preço e prazo no carrinho, compra rápida e checkout.
- Registrar no pedido exatamente a opção escolhida pelo cliente, incluindo o código do serviço e o preço cobrado.
- Preservar frete grátis, dias extras de dropship e a tabela manual como contingência claramente identificada.
- Não permitir que uma falha silenciosa da integração apresente uma cotação simulada como se fosse real.

## 3. Postagem e etiquetas
- Criar um registro de envio por pedido, com situação, transportadora, serviço, pacote, valor, rastreio, etiqueta e histórico.
- No detalhe do pedido, permitir revisar remetente, destinatário, itens, peso e dimensões antes da compra.
- Implementar as etapas do Melhor Envio: adicionar ao carrinho, conferir, comprar, gerar e imprimir etiqueta.
- Exigir confirmação administrativa antes de qualquer compra que consuma saldo da conta.
- Evitar compra ou geração duplicada com bloqueio por pedido e identificadores externos.

## 4. Rastreio e andamento do pedido
- Salvar código e link de rastreio no pedido assim que forem disponibilizados.
- Atualizar situações como etiqueta criada, postado, em trânsito, entregue, cancelado ou com problema.
- Usar notificações do Melhor Envio quando disponíveis e uma conferência periódica segura como apoio.
- Registrar cada mudança no histórico do pedido e manter as notificações atuais ao cliente.
- Não sobrescrever rastreios vindos de marketplaces pelo Bling; cada envio mantém sua origem identificada.

## 5. Painel administrativo
- Criar a área “Melhor Envio” dentro das configurações de frete com conexão, teste e CEP de origem.
- Mostrar em cada pedido o serviço escolhido, valor, prazo, situação da postagem, rastreio e ações disponíveis.
- Permitir impressão individual e em lote das etiquetas prontas.
- Exibir mensagens claras para saldo insuficiente, pacote inválido, endereço incompleto, serviço indisponível e credencial vencida.
- Manter histórico pesquisável das operações e tentativas.

## 6. Segurança e validação em produção
- Restringir conexão, compra, cancelamento e impressão aos administradores; perfis operacionais acessam somente o necessário para expedição.
- Validar endereços, CEPs, documentos, pesos e dimensões antes de enviar dados ao Melhor Envio.
- Testar primeiro uma cotação real sem custo e, depois, preparar uma única etiqueta real para aprovação administrativa antes da compra.
- Confirmar no computador e no celular: cotação, seleção no checkout, pedido, compra aprovada, impressão, rastreio e atualização de situação.
- Nenhuma etiqueta será comprada automaticamente durante os testes.

## Detalhes técnicos
- A função atual `calculate-shipping` já consulta o endpoint de cotação do Melhor Envio, mas hoje lê o token da configuração visível; ela será alterada para usar `MELHOR_ENVIO_TOKEN` no cofre seguro.
- Criar estruturas de envios e eventos com GRANTs, RLS e acesso administrativo/operacional restrito.
- Criar funções protegidas para testar a conta, cotar, comprar, gerar/imprimir, cancelar e sincronizar rastreamento, com validação de sessão e função do usuário.
- Persistir no pedido os dados da opção selecionada para impedir divergência entre checkout e postagem.
- Tratar respostas e limites da API sem expor credenciais, com idempotência e histórico de falhas.
- Após a aprovação deste plano, será aberto o formulário seguro para cadastrar o token de produção emitido pelo Melhor Envio.
