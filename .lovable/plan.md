# Liberar e validar um produto real no Bling e na loja

## Produto escolhido

Usar o produto real **Body Splash Sociedade das Vilas Elixir Noturno DKA 200 ml**.

Situação confirmada antes da execução:
- ativo e disponível na loja;
- preço real cadastrado;
- peso de 250 g;
- embalagem de 10 × 10 × 2 cm;
- fotos e estoque cadastrados;
- vínculo existente com produtos reais no Bling;
- última fila de sincronização concluída sem erro.

## Implementação

1. **Corrigir o erro da publicação TikTok**
   - Tratar o retorno real do Bling `Grpc client not found` na confirmação de categoria, além da busca inicial.
   - Substituir “Edge Function returned a non-2xx status code” pela mensagem específica e útil retornada pelo sistema.
   - Quando o Bling não liberar categorias TikTok, mostrar o canal como temporariamente indisponível e impedir uma nova tentativa inválida.
   - Preservar o anúncio pendente já existente; não criar anúncio duplicado.

2. **Ressincronizar o produto real com o Bling**
   - Enviar novamente título, descrição, preço, SKU, fotos, peso, medidas e estoque do Body Splash escolhido.
   - Usar o vínculo existente no Bling para atualizar, nunca criar uma cópia do produto.
   - Conferir a resposta do Bling e o registro local de sincronização, incluindo eventuais avisos de foto ou estoque.

3. **Confirmar o produto na loja**
   - Confirmar que o produto continua ativo e acessível pelo endereço público do catálogo.
   - Verificar imagem, nome, preço, disponibilidade e cálculo de frete com a embalagem cadastrada.
   - Confirmar que não surge tela branca ou erro de função durante a consulta.

4. **Melhorar o retorno no painel**
   - Exibir separadamente o estado do produto no Bling, na loja e no TikTok.
   - Mostrar o texto real da falha do canal, sem mensagem técnica genérica.
   - Manter o botão TikTok bloqueado enquanto a própria integração do Bling não disponibilizar categorias.

## Validação segura

- Executar uma atualização real somente no produto escolhido.
- Conferir o mesmo identificador no Bling após a sincronização.
- Conferir o produto na loja pública em computador e celular.
- Não alterar preço, estoque, fotos, peso ou medidas existentes.
- Não criar produto, anúncio ou vínculo duplicado.
- Não efetuar compra, pagamento, etiqueta ou movimentação de estoque.

## Critério de conclusão

O trabalho estará concluído quando:
- a atualização real do Body Splash for aceita e confirmada pelo Bling;
- o produto estiver visível e comprável na loja com frete calculável;
- o painel não exibir mais a mensagem genérica de erro;
- a limitação das categorias TikTok aparecer claramente, sem disparar requisições inválidas ou duplicar o anúncio pendente.
