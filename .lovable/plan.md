# Atualização automática de produtos do TikTok Shop

## Diagnóstico confirmado

- O fluxo atual de produtos funciona somente no sentido **painel → TikTok Shop**.
- O recebimento do TikTok trata pedidos, mas não cria nem atualiza produtos no catálogo local.
- Não existe rotina periódica para listar produtos do TikTok Shop e comparar por SKU.
- As tabelas de configuração, vínculos, filas e histórico do TikTok estão vazias no banco atual; portanto, nenhuma atualização de produto está entrando por essa conexão.
- O Bling está conectado e consulta o catálogo a cada 15 minutos. Na última consulta encontrou um produto pendente, mas a regra atual exige aprovação antes de aplicar produto novo.

## O que será implementado

1. **Ativar e validar a conexão oficial do TikTok Shop**
   - Confirmar a loja conectada e as permissões de catálogo, estoque e pedidos.
   - Mostrar no painel o nome da loja, última atualização e eventual erro de autorização.

2. **Importar produtos criados no TikTok Shop**
   - Criar uma busca periódica de produtos e variações da loja.
   - Trazer somente dados reais disponíveis: título, descrição, SKU, imagens, preço, estoque, categoria, atributos e situação do anúncio.
   - Nunca inventar marca, GTIN/EAN, NCM, origem fiscal ou outros dados ausentes.

3. **Vincular sem duplicar**
   - Procurar primeiro pelo identificador do TikTok, depois pelo SKU normalizado e pelo vínculo existente no Bling.
   - Atualizar o produto já existente quando houver correspondência.
   - Criar uma pendência de revisão quando não houver SKU, houver SKU duplicado ou a correspondência for insegura.

4. **Sincronizar estoque com uma única autoridade**
   - Manter o Bling como saldo principal, conforme a configuração atual.
   - Produtos importados do TikTok serão vinculados ao mesmo SKU do Bling e da loja.
   - Alterações de venda recebidas do TikTok atualizam o pedido; o saldo consolidado volta para TikTok e loja sem criar ciclos.

5. **Atualização imediata e verificação periódica**
   - Usar avisos do TikTok quando disponíveis para acelerar atualizações.
   - Manter uma busca periódica como garantia para eventos perdidos.
   - Adicionar botão **Atualizar agora** no painel.

6. **Aprovação e publicação segura**
   - Produto novo vindo do TikTok entra em revisão antes de aparecer na loja.
   - O administrador poderá aprovar, corrigir ou rejeitar.
   - Após aprovação, o mesmo cadastro aparecerá em Produtos, estoque e loja, sem duplicação.

7. **Histórico claro**
   - Registrar origem, SKU, campos alterados, estoque anterior/novo, resultado e mensagem de erro.
   - Mostrar estados: conectado, aguardando revisão, atualizado, conflito de SKU e erro.

## Validação final

- Criar ou alterar um produto real no TikTok Shop.
- Executar **Atualizar agora** e confirmar a entrada no painel.
- Verificar imagens, preço, SKU e vínculo com o Bling.
- Aprovar o item e confirmar sua exibição na loja.
- Repetir a busca e comprovar que não houve duplicação.
