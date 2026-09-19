# Atualização automática dos dados do Bling

## Diagnóstico confirmado
- A conexão está ativa, com produtos, estoque, preços e pedidos habilitados; o depósito **Geral** está configurado.
- Os agendamentos atuais estão executando corretamente: pedidos a cada 15 minutos e fila de envio ao Bling a cada 5 minutos.
- Esses agendamentos não buscam alterações de produtos, fotos, preços e estoque vindas do Bling. Hoje essa busca completa depende do botão **Buscar tudo do Bling**.
- A atualização imediata por aviso também não está atuando: não houve nenhuma chamada do Bling para a URL de avisos nos últimos sete dias.
- Por isso, pedidos continuam atualizando automaticamente, mas alterações feitas no catálogo/estoque do Bling podem permanecer antigas no painel.

## Correção
1. Criar uma atualização incremental automática do Bling, executada em intervalo seguro, para consultar produtos vinculados, estoque do depósito Geral, preço, descrição, marca, medidas e fotos.
2. Atualizar imediatamente os 52 produtos já vinculados, sem recriar produtos, SKUs, fotos ou vínculos.
3. Respeitar as regras atuais de origem dos dados:
   - **Estoque:** Bling atualiza o painel.
   - **Preço:** a loja continua sendo a origem e não será sobrescrita pelo Bling.
4. Produtos novos encontrados no Bling continuarão entrando em lote para aprovação; somente produtos já aprovados e vinculados serão atualizados automaticamente.
5. Manter a atualização de pedidos a cada 15 minutos e a fila de envio a cada 5 minutos.
6. Tornar os avisos do Bling complementares, não obrigatórios: quando chegarem, atualizam na hora; se não chegarem, a busca periódica garante a atualização.
7. Registrar última tentativa, última atualização bem-sucedida, quantidade alterada e erros por produto, deixando isso visível no painel Bling.
8. Impedir execuções simultâneas e repetir somente falhas temporárias, respeitando o limite da API do Bling.

## Validação
- Alterar um saldo no Bling e confirmar que aparece no painel sem clicar em **Buscar tudo**.
- Alterar descrição ou foto de um produto vinculado e confirmar a atualização automática.
- Confirmar que o preço da loja não foi substituído, conforme a configuração atual.
- Confirmar que um produto novo permanece aguardando aprovação.
- Confirmar que pedidos, produtos e vínculos não foram duplicados.
- Confirmar no histórico que cada execução automática mostra horário, resultado e eventual erro.

## Detalhes técnicos
- Reutilizar os vínculos, importação, fila, logs e autenticação Bling existentes.
- Adicionar uma função incremental protegida para catálogo/estoque e um agendamento próprio.
- Usar bloqueio de execução, paginação, lotes pequenos, idempotência e atualização somente quando houver diferença.
- Não apagar produtos, pedidos, históricos ou configurações existentes.
