# Cadastro completo e publicação automática pelo Bling

## Objetivo

Ao cadastrar ou editar um produto na nossa plataforma, preencher e validar tudo o que o Bling e os canais conectados exigem. Depois da confirmação das sugestões, enviar o produto ao Bling e publicar automaticamente no TikTok Shop, Mercado Livre, Shopee, Magalu, Amazon e demais lojas habilitadas, sem criar anúncios duplicados.

## Situação confirmada

- O envio atual ao Bling já inclui nome, SKU, preço, custo, descrição curta, peso, dimensões e até cinco fotos.
- Estoque e preço já possuem sincronização separada com o depósito configurado no Bling.
- Ainda não são enviados categoria, marca, GTIN/EAN, NCM, origem fiscal e atributos específicos de cada plataforma.
- A base atual possui 52 produtos ativos; todos estão sem marca e descrição, embora os SKUs estejam preenchidos.
- Ainda não há categorias locais nem categorias vinculadas ao TikTok. A integração existente consegue consultar os atributos exigidos pelo TikTok, mas ainda não os salva nem os envia.

## O que será implementado

### 1. Cadastro completo do produto

Ampliar a tela de produto com:

- título e descrição completa;
- marca e fabricante;
- categoria principal;
- SKU único por variação;
- GTIN/EAN por variação, quando existir;
- preço, custo e estoque;
- peso e dimensões reais;
- fotos principais e por variação;
- NCM, CEST quando aplicável e origem fiscal;
- condição, garantia e demais informações comerciais;
- atributos variáveis conforme a categoria, como cor, tamanho, material, modelo, voltagem e composição.

Os valores padrão atuais de peso e dimensões não serão tratados como dados reais para publicar nos canais.

### 2. Sugestões automáticas com confirmação

- Sugerir descrição, categoria, marca e atributos usando os dados reais já existentes, fotos e códigos do produto.
- Destacar cada sugestão e exigir confirmação do administrador antes da primeira publicação.
- Nunca inventar GTIN/EAN, NCM, CEST, origem fiscal, marca, certificação ou outra informação legal.
- Quando não houver fonte confiável, deixar o campo pendente e informar exatamente o que falta.

### 3. Regras por plataforma

- Consultar no Bling as lojas conectadas e as categorias aceitas por cada canal.
- Criar um vínculo permanente entre a categoria da nossa plataforma, a categoria do Bling e a categoria de cada marketplace.
- Buscar e armazenar os atributos obrigatórios de cada categoria/canal.
- Reaproveitar o vínculo nos próximos produtos da mesma categoria, pedindo confirmação somente quando surgir um novo atributo ou uma mudança da plataforma.
- Mostrar uma lista por produto com: pronto, pendente, enviado, em análise, publicado ou erro para cada canal.

### 4. Envio completo ao Bling

Atualizar o cadastro do produto no Bling com todos os dados confirmados, incluindo categoria, marca, GTIN, dados fiscais, variações, fotos, preço, custo, peso e dimensões.

- Manter o mesmo SKU em nossa plataforma, no Bling e nos canais.
- Atualizar o produto existente pelo vínculo ou SKU, em vez de criar outro.
- Enviar estoque para o depósito configurado apenas quando nossa plataforma for a origem definida para o estoque.
- Registrar o retorno e os campos recusados pelo Bling.

### 5. Publicação automática em todos os canais conectados

Depois que o cadastro estiver completo e as sugestões confirmadas:

1. criar ou atualizar o produto no Bling;
2. criar ou atualizar o anúncio correspondente em cada loja conectada;
3. publicar automaticamente os anúncios válidos;
4. acompanhar análise, rejeição ou publicação;
5. repetir falhas temporárias com limite e sem duplicar anúncios.

Produtos incompletos não serão publicados. Eles permanecerão visíveis no painel com as pendências por plataforma.

### 6. Painel de acompanhamento

Na lista e na edição do produto, exibir:

- percentual de cadastro completo;
- campos pendentes;
- situação no Bling;
- situação em cada plataforma com nome e logo;
- motivo claro de rejeição;
- ação para revisar sugestões e reenviar;
- histórico de alterações, envios e respostas.

Também haverá filtros para produtos prontos, pendentes, publicados e com erro.

### 7. Segurança e consistência

- Validar tudo no servidor antes de enviar.
- Não apagar anúncios, vínculos ou históricos existentes.
- Evitar ciclos entre atualizações da nossa plataforma, Bling e marketplaces.
- Respeitar limites de requisições e usar fila com retomada segura.
- Manter pedidos, notas fiscais e etiquetas fora desta alteração.

## Validação final

- Cadastrar um produto de teste com variações e dados reais.
- Confirmar que ele recebe o mesmo SKU no sistema e no Bling.
- Confirmar fotos, descrição, categoria, dados fiscais, preço, estoque e atributos no Bling.
- Confirmar a criação ou atualização sem duplicidade em cada canal conectado.
- Testar produto incompleto, rejeição de canal, reenvio e atualização posterior de preço/estoque.
- Validar o fluxo no computador e no celular.

## Observação técnica

A automação usará o Bling como central de distribuição dos anúncios. Categorias e atributos obrigatórios variam por canal; por isso, a primeira confirmação de cada combinação de categoria e plataforma será guardada e reutilizada. A publicação automática só ocorrerá após essa configuração real estar completa.
