# Validar pendências fiscais antes de emitir NF-e real

## Objetivo
Preservar o fluxo atual de pedidos e impedir qualquer emissão real enquanto houver dados fiscais, regras tributárias ou configuração do Bling sem validação. O sistema mostrará exatamente o que falta, sem preencher informações legais por conta própria.

## Situação confirmada
- A área Fiscal e a ação “Validar dados” já existem no pedido.
- Ainda não existe cadastro da empresa em `fiscal_settings`, nem documento fiscal preparado.
- Há 1 pedido pago com CPF e endereço preenchidos, mas ele ainda precisa passar pela validação fiscal completa.
- Os 52 produtos estão vinculados ao Bling, porém os dados importados disponíveis não contêm NCM, origem ou CEST; todos também estão sem categoria local.
- A emissão automática está desligada e continuará bloqueada durante a homologação.

## Implementação
1. **Diagnóstico fiscal central**
   - Transformar a aba Fiscal em um checklist de prontidão com estados “Pendente”, “Pronto para testar” e “Homologado”.
   - Separar pendências da empresa, Bling, produtos, cliente, pedido e pagamento.
   - Exibir contagens e links diretos para corrigir produtos ou abrir o pedido afetado.

2. **Dados e regras que serão validados**
   - Empresa: razão social, CNPJ válido, inscrição estadual quando aplicável, regime tributário e endereço completo.
   - Bling: conta autorizada, empresa vinculada, configuração fiscal, certificado, série, natureza da operação e ambiente de emissão.
   - Produtos: SKU/vínculo, NCM, origem, CEST quando aplicável, unidade, tributação e regras de ICMS/PIS/COFINS conforme cadastro real no Bling.
   - Cliente: nome, CPF/CNPJ válido e endereço completo.
   - Pedido: itens, quantidades, preços, desconto, frete, total, pagamento confirmado e vínculo do pedido no Bling.

3. **Validação segura por pedido**
   - Ampliar “Validar dados” para executar somente leitura e salvar a lista detalhada de pendências.
   - Não criar, transmitir ou autorizar NF-e durante a validação.
   - Mostrar a origem de cada pendência e orientar onde corrigi-la.
   - Manter histórico imutável de cada validação e de quem a executou.

4. **Travas contra emissão incorreta**
   - Bloquear “Emitir pelo Bling” enquanto qualquer requisito obrigatório estiver pendente.
   - Exigir confirmação explícita do administrador para liberar emissão real após a homologação.
   - Manter emissão automática desligada até a liberação explícita; pagamento aprovado sozinho não emitirá nota.
   - Revalidar tudo no servidor imediatamente antes de qualquer emissão, evitando contorno pela tela.

5. **Homologação sem inventar dados**
   - Usar o pedido pago existente apenas para diagnóstico, sem emitir nota.
   - Listar os campos reais faltantes dos 52 produtos e da empresa.
   - Depois que a administradora preencher os dados e o contador validar as regras, testar primeiro no ambiente de homologação do Bling.
   - Só liberar produção após retorno fiscal válido; DANFE e XML aparecerão no pedido apenas quando autorizados.

## Detalhes técnicos
- Evoluir o cadastro fiscal e o documento fiscal para registrar prontidão, ambiente, validações e liberação de produção.
- Consultar o Bling para conferir cadastro tributário de cada item, sem sobrescrever dados legais automaticamente.
- Manter as permissões atuais: administrador configura/emite; CD apenas consulta e imprime documentos autorizados.
- Preservar pedidos, pagamentos, estoque, vínculos e históricos existentes.

## Critérios de aceite
- Nenhuma chamada de emissão ocorre ao clicar em “Validar dados”.
- A aba Fiscal informa exatamente o que falta e onde corrigir.
- Um pedido só fica “Pronto para emitir” com empresa, Bling, produtos, cliente, valores e pagamento aprovados.
- A emissão real permanece indisponível até homologação e liberação explícita do administrador.
- Nenhum dado fiscal, imposto ou documento é inventado pelo sistema.
