# Importação em lote de etiquetas e DANFEs do TikTok

## O que será entregue
- Adicionar à Central de Etiquetas dois campos: **PDF de etiquetas** e **PDF de NF-e/DANFE**.
- Ler cada página dos arquivos oficiais e localizar o código de rastreamento nela.
- Comparar o rastreamento com os pedidos TikTok reais exibidos no painel, sem tentar adivinhar vínculos.
- Mostrar uma conferência com pedidos encontrados, páginas sem correspondência e documentos ausentes antes de salvar.
- Ao confirmar, separar os PDFs por página e guardar uma etiqueta e um DANFE privados em cada pedido correspondente.
- Manter o envio individual atual para correções e substituições.

## Segurança e regras
- Aceitar somente PDFs válidos, com limite de 20 MB por arquivo.
- Permitir a operação somente a administradores e manter os documentos em armazenamento privado.
- Não substituir automaticamente documentos existentes sem informar isso na conferência.
- Não salvar páginas sem código de rastreamento ou sem pedido correspondente.
- Registrar nome do arquivo, horário, usuário e origem manual em lote.

## Uso no painel
- As etiquetas vinculadas continuarão disponíveis na impressão individual e em massa.
- O pedido mostrará o DANFE do TikTok com botão para abrir o PDF oficial.
- Ao final, exibir quantos pedidos receberam os dois arquivos, apenas etiqueta, apenas DANFE ou ficaram sem correspondência.

## Validação
- Testar com os dois PDFs enviados, que possuem três páginas e os mesmos três rastreamentos.
- Conferir o resultado no computador e no celular, sem gravar páginas em pedidos errados.