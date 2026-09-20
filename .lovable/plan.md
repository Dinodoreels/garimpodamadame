# Corrigir validação do perfil na compra

## Objetivo
Permitir que o cliente finalize a compra quando nome, telefone, CPF e data de nascimento já estiverem salvos corretamente.

## Alterações
- Atualizar a leitura do perfil antes de validar o botão de finalizar compra, evitando dados antigos em memória.
- Aguardar o carregamento do cadastro antes da validação.
- Normalizar espaços vazios e informar exatamente quais dados ainda faltam, caso exista alguma pendência real.
- Manter a exigência atual dos quatro dados e o fluxo de frete/pagamento existente.

## Validação
- Testar o carrinho com um perfil completo e frete selecionado.
- Confirmar que o aviso incorreto não aparece e que a compra segue para o pagamento.
- Confirmar que perfis realmente incompletos continuam bloqueados com uma mensagem clara.
