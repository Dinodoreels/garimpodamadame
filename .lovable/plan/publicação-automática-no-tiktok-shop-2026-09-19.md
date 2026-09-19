# Publicação automática no TikTok Shop

## Objetivo
Publicar automaticamente no TikTok Shop, através da conta conectada no Bling, todos os produtos completos e confirmados, sem exigir o botão manual e sem criar anúncios duplicados.

## Situação confirmada
- O canal TikTok “Garimpo da Madame” está ativo no Bling.
- O sistema já consulta categorias, valida atributos, envia anúncios e grava o retorno recebido.
- Neste momento, o Bling retorna zero categorias TikTok vinculadas; por isso o Body Splash continua pendente em “categoria TikTok”.
- Não há nenhum mapeamento de categoria TikTok confirmado atualmente.

## Implementação
1. **Centralizar a publicação automática**
   - Reutilizar a mesma validação e montagem de anúncio já usada pelo botão manual.
   - Permitir execução segura pelo processamento interno, mantendo a ação manual disponível para nova tentativa.

2. **Definir quando um produto está pronto**
   - Exigir cadastro ativo, dados confirmados, título, descrição, marca, preço, SKU, foto, estoque, peso, dimensões e dados fiscais necessários.
   - Exigir vínculo com o produto correspondente no Bling.
   - Exigir categoria real do TikTok e todos os atributos obrigatórios retornados pelo canal.
   - Nunca completar categoria, atributo legal/fiscal ou opção do TikTok por suposição.

3. **Buscar e reaproveitar categorias reais**
   - Atualizar as categorias TikTok durante a sincronização já existente do Bling e quando chegar uma alteração pelo aviso do Bling.
   - Quando uma categoria local já tiver um vínculo real confirmado, aplicá-lo automaticamente aos demais produtos completos da mesma categoria.
   - Se houver mais de uma possibilidade ou faltar atributo obrigatório, manter o produto pendente e mostrar exatamente o que falta.

4. **Publicar todos os produtos completos**
   - Após cada atualização do produto, do vínculo Bling ou das categorias, identificar os produtos elegíveis e enviá-los automaticamente.
   - Processar em lotes pequenos, com bloqueio contra execuções simultâneas e novas tentativas controladas para falhas temporárias.
   - Consultar primeiro se o anúncio já existe no canal; atualizar o registro existente em vez de duplicá-lo.

5. **Registrar o retorno real**
   - Salvar código do anúncio, situação, categoria, atributos enviados, resposta integral, erro, tentativas e horários.
   - Mostrar no cadastro “Publicado automaticamente”, “Aguardando categoria”, “Falta atributo” ou o erro exato recebido.

6. **Body Splash atual**
   - Mantê-lo aguardando até o Bling disponibilizar uma categoria real.
   - Assim que a categoria e os atributos obrigatórios estiverem disponíveis e validados, publicar automaticamente o anúncio oficial e mostrar o código e o retorno no produto.

## Segurança e regras
- A automação usa apenas a conta TikTok já conectada no Bling.
- Nenhum produto incompleto, sem estoque ou sem confirmação será publicado.
- Nenhuma categoria ou atributo será inventado.
- Todas as decisões, bloqueios, tentativas e respostas ficam no histórico administrativo.

## Validação
- Simular produto incompleto e confirmar que permanece bloqueado com motivo claro.
- Validar reaproveitamento de uma categoria real confirmada para produtos equivalentes.
- Reprocessar o mesmo produto e confirmar que não cria anúncio duplicado.
- Confirmar que um produto completo publica sem clique quando o TikTok disponibilizar categoria e atributos.
- Verificar no cadastro o código e o retorno exato recebido do canal.
