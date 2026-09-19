# Liberar a pesquisa de anúncios no Garimpo Scan

## Diagnóstico confirmado
- A leitura da foto pelo Gemini está funcionando.
- A etapa seguinte, que pesquisa páginas reais com preço e link, está retornando erro **429 — cota do Gemini esgotada**.
- Por segurança, o Scan descarta resultados sem preço verificável e mantém a peça em revisão; por isso aparece `0/3 anúncios`.

## Uso da NVIDIA
- Revogar a chave NVIDIA enviada no chat, pois ela ficou exposta, e criar outra no portal da NVIDIA.
- Guardar a nova chave somente no cofre seguro do sistema; não colocá-la no navegador ou no código.
- Usar um modelo NVIDIA com visão para identificar a foto quando o Gemini estiver indisponível.
- Validar o modelo e o formato de imagem aceito com uma chamada controlada antes de ativá-lo no Scan.
- A NVIDIA não oferece pesquisa Google integrada: ela poderá identificar o produto, mas não substituirá a fonte que encontra anúncios, preços e links reais.

## Ação necessária no Google
1. Abrir o projeto Google `GARIMPO DA MADME` e vincular uma conta de faturamento ativa.
2. Confirmar que a **Gemini API / Generative Language API** está habilitada nesse projeto.
3. Verificar a página de cotas e aumentar ou liberar a cota de requisições do modelo com pesquisa Google.
4. Manter a chave somente no cofre seguro do sistema; não enviar outra chave pelo chat.

## Ajustes e validação no sistema
- Usar Gemini como identificação principal e NVIDIA como alternativa somente para analisar a foto.
- Manter a pesquisa complementar no Google para obter anúncios verificáveis; nunca tratar texto gerado pela NVIDIA como anúncio real.
- Exibir uma mensagem específica de “limite da pesquisa atingido” quando o Google responder 429.
- Não repetir imediatamente chamadas bloqueadas; aguardar a liberação da cota e exigir uma nova ação do operador.
- Após a ativação do faturamento, testar novamente com uma foto real.
- Confirmar que o Scan apresenta até três anúncios distintos com título, preço em reais e link acessível.
- Calcular o preço pela mediana somente dos valores confirmados.
- Manter em revisão qualquer peça com menos de três anúncios; não publicar preço ou link inventado.

## Resultado esperado
Gemini ou NVIDIA identifica o produto; a pesquisa Google encontra três anúncios reais. O Scan preenche descrição e preço sugerido e libera o fluxo somente quando as referências forem verificáveis.
