# Plano: categorias amplas para todo o catálogo

## Objetivo
Organizar automaticamente os produtos em categorias amplas, criar essas categorias no Bling e preparar os produtos completos para publicação no TikTok Shop.

## Categorias propostas
- Beleza e Cuidados Pessoais
- Informática e Componentes
- Games e Acessórios
- Áudio, Vídeo e Streaming
- Câmeras e Fotografia
- Casa e Utilidades
- Automotivo
- Ferramentas e Elétrica
- Brinquedos e Hobby
- Saúde e Bem-estar

A categoria já existente **PERFUMARIA** será mantida para não desfazer o vínculo do Body Splash já publicado.

## Implementação
1. Classificar os 52 produtos sem categoria usando regras pelo nome e tipo do item, com prioridade para termos específicos para evitar categorias incorretas.
2. Salvar a categoria ampla no cadastro de cada produto e registrar quais produtos foram classificados automaticamente.
3. Criar no Bling somente as categorias que realmente tiverem produtos, reutilizando categorias equivalentes já existentes e evitando duplicações por diferenças de acento ou letras maiúsculas.
4. Atualizar cada produto no Bling com sua categoria, preservando fotos, marca, preço, estoque, SKU e vínculos existentes.
5. Executar a publicação automática no TikTok apenas para produtos completos; itens sem foto, marca, preço, estoque ou demais dados obrigatórios continuarão pendentes.
6. Registrar sucessos, pendências e erros no histórico para permitir conferência no painel.

## Situação confirmada
- Há 53 produtos ativos no catálogo.
- Apenas o Body Splash possui categoria preenchida: **PERFUMARIA**.
- Os outros 52 produtos estão sem categoria.
- A integração já consegue criar/reutilizar categorias no Bling e associá-las ao produto.

## Validação
- Conferir a quantidade de produtos em cada categoria ampla.
- Confirmar que as categorias aparecem no Bling sem duplicidade.
- Validar por amostragem produtos de Beleza, Games, Informática, Automotivo e Casa.
- Confirmar que nenhum anúncio existente foi duplicado no TikTok.
