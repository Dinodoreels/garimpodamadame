# Corrigir e validar o cálculo de frete

## Diagnóstico confirmado

- O CEP `02325-090` é válido e foi localizado em São Paulo/SP.
- A cotação responde sem travar, porém informa que a conta do Melhor Envio precisa ser reconectada.
- Quando a nova cotação falha, o carrinho mantém o frete anterior de `R$ 19,95`; por isso a tela mostra erro e, ao mesmo tempo, soma um frete antigo ao total.
- A mensagem atual “CEP não encontrado ou sem opções de frete” está incorreta nesse caso, pois o CEP foi encontrado.

## Alterações

1. Limpar imediatamente o valor, prazo e serviço de frete anteriores antes de cada nova tentativa.
2. Se a cotação não retornar opções, manter o frete zerado e impedir a finalização até existir uma opção válida.
3. Exibir a causa real retornada pelo serviço:
   - conta desconectada: orientar a reconexão do Melhor Envio;
   - indisponibilidade temporária: pedir nova tentativa;
   - CEP realmente inválido ou sem cobertura: mostrar a mensagem específica.
4. Aplicar o mesmo tratamento ao endereço salvo, ao recálculo automático e aos demais pontos de cálculo de frete, evitando valores antigos em qualquer fluxo.
5. Garantir que uma falha durante o recálculo por mudança no carrinho também remova a cotação anterior.

## Verificação

- Testar o CEP `02325-090` com o produto e subtotal mostrados no carrinho.
- Confirmar que, enquanto o Melhor Envio estiver desconectado, aparece a orientação correta, o frete antigo desaparece e a compra não avança com valor incorreto.
- Após a reconexão, repetir o teste e conferir opções, preço, prazo, total e seleção da opção mais barata.
- Testar também CEP inválido e troca entre dois endereços para garantir que nenhum preço anterior permaneça.

## Dependência externa

A correção da tela pode ser feita agora. Para validar uma cotação real até o fim, a conta do Melhor Envio deverá estar conectada e autorizada nas configurações de frete.
