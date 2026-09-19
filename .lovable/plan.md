# Corrigir a identificação por foto no Garimpo Scan

## Problema confirmado

A foto está chegando corretamente e a identificação é executada, mas o fluxo atual descarta qualquer anúncio que não traga preço já convertido em número. Quando a busca visual retorna links e títulos sem preço estruturado, a tela recebe zero referências, aplica a confiança padrão de 62% e deixa nome, descrição e preço vazios. Além disso, a IA hoje recebe apenas os textos dos anúncios; ela ainda não examina a foto da peça diretamente.

## Implementação

1. **Analisar a foto de verdade**
   - Enviar a imagem à IA visual para identificar tipo, marca/modelo apenas quando forem visíveis e gerar termos de pesquisa.
   - Nunca inventar marca, código, categoria fiscal ou especificações que não possam ser confirmadas.

2. **Fazer a pesquisa em duas etapas**
   - Primeiro usar a foto para descobrir o produto e coletar resultados visuais.
   - Depois pesquisar o nome/modelo identificado no Google Shopping para localizar três anúncios com preço em reais.
   - Aceitar títulos e links úteis da busca visual mesmo quando o preço vier ausente, usando-os como base para a segunda pesquisa.

3. **Corrigir leitura e seleção dos anúncios**
   - Interpretar preços brasileiros como `R$ 199,90`, além dos preços numéricos já suportados.
   - Remover duplicatas e selecionar até três anúncios reais com link, loja, foto e preço.
   - Mostrar claramente quando foram encontrados 0, 1, 2 ou 3 anúncios e o motivo de uma fonte ter falhado.

4. **Preencher o cadastro automaticamente**
   - Preencher nome, descrição, categoria comercial, condição e preço sugerido com base na foto e nas referências encontradas.
   - Usar a mediana dos preços válidos como proteção contra anúncios muito baratos ou caros, mantendo a sugestão revisável.
   - Reaproveitar SKU/código existente quando houver correspondência no catálogo.

5. **Publicação segura**
   - Com três referências confiáveis e os campos obrigatórios completos, permitir o fluxo automático já existente para painel e loja.
   - Com pouca confiança, referências insuficientes ou dados ausentes, salvar em Pendências para revisão, sem publicar informação inventada.

6. **Validação**
   - Testar com a foto real do mouse mostrada na tela.
   - Confirmar que aparecem até três anúncios, os campos são preenchidos e o item incompleto não é publicado por engano.
   - Validar também código de barras, foto sem código e indisponibilidade temporária de uma das fontes.

## Detalhes técnicos

- Ajustar a função de identificação para suportar entrada visual multimodal, normalização monetária em PT-BR e pesquisa encadeada por título.
- Manter as credenciais protegidas já configuradas para catálogo, pesquisa e IA.
- Preservar o cadastro único e os registros de referências, confiança e histórico já existentes.
