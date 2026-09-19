# Garimpo Scan com pesquisa de 3 anúncios e cadastro automático

## Objetivo
Ao bipar o código de barras ou tirar a foto, o Garimpo Scan identificará o item, localizará **3 anúncios reais comparáveis**, analisará as diferenças, sugerirá preço e descrição, buscará fotos reais e montará o produto completo no catálogo. O mesmo cadastro aparecerá na loja e no painel administrativo, sem duplicação.

## Fluxo na tela Garimpo Scan
1. Identificar o produto usando, nesta ordem: catálogo já existente, código de barras, foto e pesquisa externa.
2. Localizar e validar 3 anúncios reais do mesmo produto, guardando para cada um: título, plataforma/loja, preço, link, foto, condição e data da consulta.
3. Exibir os três anúncios na própria tela, com aviso claro quando houver menos de três referências confiáveis.
4. Usar IA para comparar marca, modelo, condição e diferenças entre os anúncios e gerar:
   - identificação final;
   - título comercial;
   - descrição completa;
   - marca e categoria, quando confirmadas pelas fontes;
   - preço sugerido com justificativa;
   - nível de confiança e pendências.
5. Buscar as fotos reais disponíveis nos anúncios, eliminar repetidas e salvar cópias no armazenamento da loja, mantendo os links das fontes.
6. Preencher automaticamente todos os campos disponíveis da tela, incluindo SKU reaproveitado ou gerado, quantidade, preço e imagens.

## Cadastro único no sistema
- Reaproveitar produto existente por produto vinculado, código de barras e SKU normalizado antes de criar outro.
- Criar ou atualizar um único cadastro nas tabelas centrais de produtos, variantes, imagens e estoque.
- Fazer esse mesmo cadastro aparecer imediatamente em **Produtos** no painel administrativo.
- Publicar automaticamente na loja somente quando houver foto real, identificação confiável, descrição, preço válido, SKU, quantidade e demais dados obrigatórios completos.
- Quando faltar algum dado obrigatório ou a confiança for baixa, salvar como rascunho/pendência para revisão, sem inventar marca, categoria fiscal, GTIN, NCM, CEST ou origem fiscal.
- Manter produtos com quantidade zero visíveis como **ESGOTADO**, sem permitir compra.

## Estoque e integrações
- Somar a quantidade informada no Garimpo Scan ao estoque do produto/variante correto.
- Reutilizar a fila já existente para enviar o cadastro completo ao Bling e iniciar as publicações configuradas, sem criar anúncios duplicados.
- Respeitar a aprovação e os dados obrigatórios exigidos por cada plataforma antes da publicação externa.

## Histórico e controle
- Registrar identificação, três referências, fotos escolhidas, conteúdo e preço sugeridos pela IA, usuário, data, produto criado/atualizado e resultado da publicação.
- Permitir abrir os três anúncios originais pelo painel administrativo.
- Mostrar estados objetivos: pesquisando, identificado, referências encontradas, cadastro criado, publicado, pendente ou erro.
- Tornar o processo repetível e idempotente: bipar novamente o mesmo item atualiza o cadastro e estoque corretos, sem duplicar produto.

## Detalhes técnicos
- Ampliar `inbound-identify` para selecionar exatamente as três melhores referências válidas e gerar a síntese com `openai/gpt-6-astra` pela Lovable AI.
- Persistir as referências em `inbound_market_references` e a análise completa no histórico de identificação.
- Evoluir `inbound-scan`/`inbound-workflow` e a função de liberação para compartilhar as mesmas regras de validação do cadastro administrativo.
- Substituir a deduplicação somente por SKU por uma resolução segura usando vínculo existente, código de barras e SKU normalizado.
- Persistir imagens no armazenamento da loja em vez de depender de links temporários externos.
- Não alterar produtos, estoque ou publicação até a pesquisa e a validação do item terminarem com sucesso.

## Validação
- Testar código de barras, foto, produto já existente, produto novo, menos de três anúncios, anúncios divergentes, imagem indisponível, estoque zero e repetição do mesmo item.
- Confirmar em computador e tablet que os três anúncios, fotos e campos preenchidos aparecem sem sobreposição.
- Confirmar que o produto aparece uma única vez no painel e na loja, com preço, descrição, fotos e estoque correspondentes.
- Validar que falhas externas deixam o item pendente e não publicam dados incompletos.
