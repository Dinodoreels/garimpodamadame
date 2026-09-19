# Atualização automática de produtos pelo Bling

## Diagnóstico confirmado

- O Bling está conectado e consulta o catálogo a cada 15 minutos. Na última consulta encontrou um produto pendente, mas a regra atual exige aprovação antes de aplicar produto novo.
- O produto detectado no Bling não apareceu em **Produtos** porque ficou aguardando aplicação; a rotina não atualiza automaticamente itens novos.
- O vínculo com os canais será preservado pelo SKU informado no Bling, sem importar o catálogo diretamente do TikTok.

## O que será implementado

1. **Usar o Bling como entrada única do catálogo**
   - Produtos criados ou alterados nas plataformas devem chegar ao Bling primeiro.
   - O sistema consultará o Bling e não criará uma segunda importação direta do TikTok.
   - Mostrar no painel a empresa conectada, última consulta, quantidade processada e erros.

2. **Aplicar automaticamente produtos encontrados no Bling**
   - Quando o Bling retornar um produto novo com SKU válido, criar o cadastro local automaticamente.
   - Trazer somente dados reais disponíveis no Bling: título, descrição, SKU, imagens, preço, custo, estoque, dimensões, categoria e variações.
   - Nunca inventar marca, GTIN/EAN, NCM, origem fiscal ou outros dados ausentes.

3. **Vincular sem duplicar**
   - Procurar primeiro pelo identificador do Bling, depois pelo SKU normalizado e pelo vínculo existente.
   - Atualizar o produto já existente quando houver correspondência.
   - Criar uma pendência de revisão quando não houver SKU, houver SKU duplicado ou a correspondência for insegura.

4. **Sincronizar estoque com uma única autoridade**
   - Manter o Bling como saldo principal, conforme a configuração atual.
   - O mesmo SKU será usado no Bling, no painel, na loja e nos canais vinculados.
   - Alterações recebidas do Bling atualizam imediatamente o painel; mudanças locais autorizadas voltam ao Bling sem criar ciclos.

5. **Atualização imediata e verificação periódica**
   - Usar o aviso do Bling para acelerar atualizações de produto e estoque.
   - Manter a busca automática a cada 15 minutos como garantia para avisos perdidos.
   - Adicionar botão **Atualizar do Bling agora** no painel.

6. **Aprovação e publicação segura**
   - Produto completo vindo do Bling entra automaticamente em **Produtos**.
   - Produto sem foto, preço, SKU ou dados seguros fica em revisão, com o motivo visível ao administrador.
   - Itens completos podem ser publicados na loja; estoque zero permanece visível como **ESGOTADO** e não pode ser comprado.

7. **Histórico claro**
   - Registrar origem, SKU, campos alterados, estoque anterior/novo, resultado e mensagem de erro.
   - Mostrar estados: conectado, aguardando revisão, atualizado, conflito de SKU e erro.

## Validação final

- Criar ou alterar um produto real no Bling.
- Executar **Atualizar do Bling agora** e confirmar a entrada no painel.
- Verificar imagens, preço, SKU, estoque e vínculo com o Bling.
- Confirmar sua exibição na loja ou o motivo objetivo da revisão.
- Repetir a busca e comprovar que não houve duplicação.
