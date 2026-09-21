# Produtos e depósito

## Objetivo
Concluir a estrutura física do estoque e os dados de embalagem necessários ao frete, sem criar posições ou medidas fictícias.

## Situação confirmada
- Não há nenhuma posição física cadastrada no depósito.
- A tela atual permite cadastrar uma posição por vez, usando código, zona, corredor, estante, prateleira e posição.
- Há 5 produtos ativos; 3 estão sem peso ou medidas completas.
- O cadastro de produto já possui campos de peso, comprimento, largura e altura.
- Não há itens físicos no fluxo Inbound para endereçar neste momento.

## Implementação

### 1. Cadastro individual das posições
- Manter o cadastro uma posição por vez.
- Organizar o formulário com código obrigatório e campos de zona, corredor, estante, prateleira, posição, capacidade e descrição.
- Validar código único, capacidade positiva e campos antes de salvar.
- Permitir editar e ativar/desativar uma posição, sem excluir seu histórico.
- Exibir situação, capacidade e quantidade ocupada; a ocupação será calculada apenas com itens reais vinculados.
- Impedir a desativação de uma posição que ainda contenha itens, indicando o que precisa ser transferido.

### 2. Fila de produtos sem dados de embalagem
- Criar uma visão filtrada com os 3 produtos ativos atualmente incompletos.
- Mostrar claramente quais dados faltam em cada produto: peso, comprimento, largura ou altura.
- Abrir a edição diretamente na seção de peso e dimensões.
- Aceitar somente valores positivos e salvar em gramas e centímetros.
- Não sugerir nem preencher medidas automaticamente; a equipe deve medir o produto já embalado.

### 3. Travas operacionais
- Manter produtos incompletos visíveis na loja, mas bloquear cotação/etiqueta automática quando não houver peso e dimensões válidos.
- Bloquear o avanço de um item Inbound para estoque quando não existir posição ativa selecionada.
- Não permitir publicação automática de novos produtos originados do Inbound enquanto os dados de embalagem estiverem incompletos.
- Atualizar a Central Operacional imediatamente após cada correção.

### 4. Validação segura
- Cadastrar uma posição real informada pela equipe e confirmar edição, desativação e prevenção de duplicidade.
- Preencher e salvar as medidas reais dos três produtos pendentes, um por vez.
- Confirmar que a Central Operacional passa de bloqueada para concluída somente quando todos os dados forem válidos.
- Testar a cotação sem comprar frete, gerar etiqueta ou alterar pedidos reais.

## Detalhes técnicos
- Usar `warehouse_locations` para posições e calcular ocupação a partir dos itens vinculados, sem contador manual.
- Reforçar a validação na função protegida do fluxo Inbound, além da tela administrativa.
- Usar `products.weight_grams`, `length_cm`, `width_cm` e `height_cm` como fonte única para embalagem.
- Preservar histórico e vínculos ao desativar posições; nenhum registro operacional será apagado.

## Dependência de dados reais
A implementação pode deixar todas as telas e travas prontas. A conclusão operacional dependerá dos códigos, capacidades e medidas reais informados pela equipe no painel.
