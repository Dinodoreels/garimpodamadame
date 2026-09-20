# Entregar a cópia SQL da infraestrutura

## Resultado
Disponibilizar o arquivo SQL já gerado com a estrutura atual do banco do O Garimpo Digital, sem registros de clientes, pedidos ou produtos.

## Conteúdo incluído
- Tipos e tabelas do schema público
- Restrições e índices
- Funções
- Proteções de acesso e políticas
- Transação de criação da estrutura

## Validação
- Confirmar que o arquivo não contém comandos `INSERT` ou `COPY`.
- Entregar o arquivo `.sql` para download.

## Limite
O arquivo replica a estrutura pública. Configurações gerenciadas de autenticação, segredos, arquivos armazenados e funções externas não são dados transportados por esse SQL.
