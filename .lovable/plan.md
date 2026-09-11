# Finalização da Fase 3

## Situação atual

A parte técnica está concluída: identificação por código e foto, tela de SKU, fotos privadas, QC, preço, endereçamento, estoque, liberação, histórico e integração com o Bling.

O Bling está ativo, sem erro registrado, com produtos, preços, estoque, envio de pedidos e importação de pedidos habilitados. Existe um recebimento real aberto (`REC-2026-00001`), porém ainda não há itens escaneados, fotos de produtos, endereços do CD ou movimentações de estoque.

Hoje existe somente uma conta real, `madamedoluar4@gmail.com`, com perfil de administradora. Nenhum usuário está atribuído aos perfis Inbound, QC, Estoque ou Comercial.

## O que falta

1. **Cadastrar as quatro pessoas da operação**
   - Receber nome e e-mail de cada pessoa.
   - Criar ou localizar suas contas reais.
   - Atribuir uma função a cada conta: Inbound, QC, Estoque e Comercial.
   - Confirmar na prática quem cadastra, aprova, endereça e libera.

2. **Cadastrar os endereços físicos do CD**
   - Informar os códigos reais de zona, corredor, estante, prateleira e posição.
   - Registrar esses endereços na tela de Endereçamento.

3. **Executar o primeiro fluxo com mercadoria real**
   - Usar o recebimento existente ou cadastrar outro recebimento real.
   - Anexar os documentos e fotos reais da carreta.
   - Criar o lote e escanear ao menos um produto real com código de barras e fotos.
   - Conferir a identificação por catálogo, GTIN e busca visual, mantendo revisão humana quando não houver certeza.

4. **Homologar o fluxo completo entre os perfis**
   - Inbound cadastra e escaneia.
   - QC aprova, coloca em quarentena ou reprova.
   - Comercial define o preço Vanguard.
   - Estoque endereça e guarda no CD.
   - Comercial libera para venda.
   - Confirmar que o estoque vendável só aumenta na liberação e apenas uma vez.

5. **Homologar o Bling com o SKU real**
   - Confirmar criação ou vínculo do produto.
   - Confirmar preço e estoque no depósito configurado.
   - Confirmar processamento das filas sem duplicidade.
   - Confirmar logs de sucesso ou falha e o fluxo de nova tentativa.

6. **Encerrar a homologação**
   - Validar as telas em computador, tablet e celular usando os dados reais.
   - Conferir o histórico completo do recebimento até a liberação.
   - Corrigir somente problemas encontrados nessa operação real.

## Dados necessários para continuar

- Nome e e-mail das quatro pessoas responsáveis por Inbound, QC, Estoque e Comercial.
- Estrutura real dos endereços do CD.
- Fotos reais da carreta, documentos e ao menos um produto com código de barras.

Nenhuma conta, foto, produto, endereço ou movimentação de demonstração será criada.
