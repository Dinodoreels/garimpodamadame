# Gerar SKUs automaticamente e atualizar o Bling

## Resultado
Os produtos recebidos do Bling sem SKU deixarão de ser bloqueados: o sistema criará códigos únicos, salvará os mesmos códigos no Bling e os incluirá automaticamente na revisão de importação.

## Implementação
- Gerar um SKU estável no formato `GDM-BLG-<ID do produto>` para cada produto sem código, evitando colisões com códigos existentes na loja e na própria importação.
- Atualizar primeiro o produto correspondente no Bling com esse SKU, preservando todos os demais dados retornados pela API.
- Registrar o SKU gerado na prévia e no histórico de sincronização, tornando o item selecionável como novo produto.
- Manter bloqueados apenas conflitos reais, como dois produtos diferentes usando o mesmo SKU.
- Na aplicação, repetir a validação e a atualização de forma segura para que reprocessar o mesmo produto não gere outro código nem duplique cadastros.
- Ajustar a tela para diferenciar “SKU gerado automaticamente” de conflitos que ainda exigem revisão.

## Validação
- Executar uma nova busca real no Bling e confirmar que os 37 itens recebem códigos no Bling e aparecem liberados na revisão.
- Confirmar que repetir a busca mantém os mesmos SKUs.
- Confirmar que nenhum produto é publicado automaticamente: produtos novos continuam entrando como rascunho oculto.
