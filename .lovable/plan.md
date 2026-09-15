# Trazer catálogo, estoque e pedidos do Bling

## Resultado
Adicionar ao painel Bling uma importação completa e segura da conta conectada, com prévia e revisão antes de publicar produtos na loja.

## 1. Preparar a importação
- Buscar no Bling os produtos, variações, SKUs, preços, custos, imagens, dimensões, situação e saldo do depósito escolhido.
- Comparar primeiro pelo SKU normalizado e, quando disponível, pelo vínculo já confirmado.
- Separar os resultados em **novos**, **já vinculados**, **com diferenças** e **sem SKU/conflito**.
- Guardar a prévia e o resultado de cada execução para retomar uma revisão sem repetir chamadas desnecessárias.

## 2. Tela de revisão
- Criar no painel Bling uma área **Importar dados do Bling** com contadores, busca e filtros.
- Mostrar lado a lado os dados atuais da loja e os dados recebidos do Bling.
- Permitir selecionar itens, corrigir o vínculo por SKU e escolher quais produtos serão importados.
- Novos produtos entram como **rascunho**, sem aparecer ao cliente até aprovação do administrador.
- Produtos existentes não serão sobrescritos silenciosamente; preço e estoque respeitarão as regras “Bling manda”, “Loja manda” ou “Só me avisar”.

## 3. Aplicar produtos e estoque
- Criar ou atualizar produto, variação, imagem e vínculo de forma idempotente, evitando duplicações se a ação for repetida.
- Usar o depósito Bling escolhido para o saldo.
- Manter a Vanguard Store como estoque central quando **A loja manda** estiver selecionado.
- Registrar por item o que foi criado, vinculado, atualizado, ignorado ou rejeitado.

## 4. Trazer pedidos
- Reutilizar a importação existente de pedidos dos marketplaces.
- Trazer cliente, documento, contato, itens, quantidades, valores, frete, endereço, canal e situação.
- Evitar pedidos duplicados pelo identificador do Bling e permitir execução manual na mesma tela.

## 5. Troca de conta e segurança
- Associar cada execução à conta Bling atualmente autorizada para não reaproveitar IDs antigos como se fossem da nova conta.
- Ao trocar de empresa, preservar pedidos e histórico anteriores, mas exigir nova conferência dos vínculos de produto.
- Somente administradores poderão pré-visualizar e aplicar uma importação.
- Nunca registrar Client Secret, access token ou refresh token nos históricos.

## 6. Operação e acompanhamento
- Adicionar a ação **Buscar tudo do Bling**, mostrando progresso separado para catálogo, estoque e pedidos.
- Exibir resumo final: novos produtos, vínculos, atualizações, conflitos, pedidos importados e erros.
- Manter processamento em lotes, tentativas automáticas e mensagens claras quando o Bling limitar ou recusar uma chamada.

## Validação
- Rodar primeiro uma prévia sem alterar o catálogo.
- Confirmar que repetir a importação não duplica produtos, variantes ou pedidos.
- Conferir um produto novo, um SKU existente, um conflito, estoque do depósito e um pedido de marketplace.
- Confirmar que produtos importados permanecem em rascunho até publicação manual.
- Validar a tela no computador e no celular.

## Detalhes técnicos
- Criar tabelas protegidas para execuções e itens de importação, com acesso administrativo e acesso de serviço para o processamento.
- Criar funções de busca, prévia e aplicação em lotes usando a API Bling v3 e os padrões de fila/log já existentes.
- Reutilizar `products`, `product_variants`, `product_images`, vínculos Bling, pedidos e histórico atuais; nenhuma informação operacional existente será apagada.
