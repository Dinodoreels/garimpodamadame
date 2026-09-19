# Estoque sincronizado e ofertas no grupo VIP

## Resultado
Manter o estoque central sincronizado entre a loja e o Bling pelo mesmo SKU e usar a página `garimpo-da-madame.netlify.app` como entrada para o grupo VIP. A página não terá um estoque separado: as mensagens sempre levarão ao produto real em `ogarimpodigital.com.br`.

## O que será feito
1. **Estoque único**
   - Manter a loja/Bling como fluxo oficial já configurado.
   - Receber alterações do Bling e atualizar imediatamente a disponibilidade na loja.
   - Enviar alterações feitas na loja ao Bling pela fila existente.
   - Reforçar segurança, histórico, idempotência e proteção contra ciclos no webhook do Bling.

2. **Campanhas do grupo VIP**
   - Criar no painel uma área para escolher produtos por SKU, definir o desconto percentual e gerar um cupom válido na loja.
   - Montar a mensagem com foto, nome, preço original, preço com desconto, saldo disponível, cupom e link direto do produto na loja.
   - Enviar para o grupo pelo provedor de WhatsApp configurado no painel.
   - Não enviar produto sem estoque, sem imagem, sem preço ou sem SKU.

3. **Acompanhamento automático**
   - Registrar cada campanha e envio, sem repetir a mesma mensagem.
   - Quando o estoque chegar a zero, marcar a oferta como esgotada e impedir novos envios.
   - Quando houver reposição, permitir nova divulgação sem criar outro produto ou SKU.
   - Exibir no painel a situação do estoque no Bling, na loja e da divulgação no grupo.

4. **Página VIP**
   - Preservar a página atual de venda do acesso ao grupo.
   - Usar os links das mensagens para abrir diretamente o produto no site Garimpo Digital, já com o cupom identificável.
   - Não processar pedidos nem reduzir estoque na página VIP; isso acontece somente na loja principal.

## Dependências para ativar o envio
- Escolher e conectar um provedor que envie mensagens para grupos, como Evolution API, WPPConnect ou UAZAPI.
- Informar o código do grupo VIP nesse provedor.
- Até esses dados serem preenchidos, o painel poderá criar e visualizar a campanha, mas não enviará mensagens reais.

## Validação
- Alterar o estoque de um SKU no Bling e confirmar a atualização na loja.
- Criar uma campanha com percentual definido e confirmar cupom, preço e link corretos.
- Enviar um teste ao grupo VIP e confirmar foto, texto e link.
- Zerar o estoque e confirmar que novas divulgações ficam bloqueadas.
- Repetir o mesmo aviso e confirmar que não ocorre duplicação.
