# Gemini em todo o Garimpo Scan

## Objetivo
Usar a API Gemini para analisar a foto, identificar o produto, montar título e descrição, orientar a pesquisa de mercado e comparar os anúncios encontrados. O produto só seguirá para cadastro ou publicação quando os dados forem sustentados por fontes reais.

## Segurança da conexão
- Revogar a chave enviada no chat e criar uma nova chave no mesmo projeto Google, pois a atual ficou exposta na conversa.
- Salvar a nova credencial somente no cofre seguro como `GEMINI_API_KEY`; nunca colocá-la no navegador ou no código.
- Validar a credencial e a disponibilidade de um modelo Gemini com visão antes de ativar a troca.
- Manter o funcionamento atual disponível caso a configuração do Gemini falhe, sem publicar resultados incompletos.

## Fluxo completo do Scan
1. Enviar a foto do produto ao Gemini pelo servidor.
2. Solicitar identificação visual estruturada: tipo, título provável, marca/modelo apenas quando visíveis, condição aparente, descrição e termos de pesquisa.
3. Usar esses termos para buscar anúncios reais e preços em reais.
4. Selecionar até três anúncios distintos, cada um com loja/plataforma, título, preço, link e foto verificáveis.
5. Pedir ao Gemini que compare somente essas referências e gere título, descrição, condição, confiança e sugestão de preço.
6. Preencher a tela automaticamente e mostrar as três fontes para conferência.
7. Salvar no painel e encaminhar à loja somente quando as regras de segurança forem atendidas.

## Regras de validação
- O Gemini não poderá inventar links, preços, marca, modelo, código de barras, dados fiscais, peso ou dimensões.
- Links e preços usados no cadastro deverão vir da resposta real da pesquisa, nunca do texto gerado pela IA.
- Menos de três anúncios, confiança baixa, ausência de foto real ou divergência importante força revisão manual.
- A sugestão de preço continuará usando a mediana dos preços válidos; a IA explica a comparação, mas não substitui os valores reais.
- Produtos repetidos serão resolvidos por vínculo existente, código de barras e SKU normalizado antes de criar outro cadastro.
- A publicação externa continuará respeitando confirmação dos dados e categorias reais exigidas pelo Bling e pelas plataformas.

## Tratamento de erros
- Exibir separadamente falhas de análise da foto, pesquisa de anúncios e montagem do cadastro.
- Não repetir erros de credencial, permissão ou requisição inválida.
- Repetir apenas limitações temporárias e falhas do serviço, com espera e número máximo de tentativas.
- Se a pesquisa real estiver indisponível, permitir identificação preliminar, mas manter o produto em revisão sem preço ou publicação automática.

## Alterações técnicas
- Adaptar `inbound-identify` para chamar a API Gemini no servidor com imagem e resposta estruturada.
- Separar claramente a análise Gemini da coleta de anúncios, mantendo os dados das fontes intactos.
- Registrar no histórico qual análise foi usada, confiança, referências, avisos e resultado final, sem registrar a chave.
- Preservar `inbound-scan`, o cadastro único, os bloqueios de revisão e o fluxo atual de estoque/publicação.
- Não alterar telas ou integrações fora do Garimpo Scan.

## Validação
- Testar a credencial sem expor seu valor e confirmar uma resposta visual real.
- Testar foto nítida, foto ruim, produto sem marca legível, menos de três anúncios, preços inválidos e pesquisa indisponível.
- Confirmar que três links e preços exibidos correspondem às fontes retornadas.
- Confirmar que produtos incompletos ficam em revisão e que nenhum cadastro duplicado é criado.
- Confirmar no tablet e computador que identificação, referências, preço e avisos aparecem corretamente.
