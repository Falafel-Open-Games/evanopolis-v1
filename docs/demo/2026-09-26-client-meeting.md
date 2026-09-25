# Reunião de acompanhamento — 26 de setembro de 2026

Guia curto para conduzir a reunião. O objetivo é confirmar o progresso desde a
[última conversa](2026-09-22-client-meeting.md), fechar as decisões pendentes e
sair com responsáveis e datas para a entrega.

## 1. Mensagem de abertura

Desde 22 de setembro, o projeto avançou de uma demonstração técnica para um
fluxo de entrada mais próximo do produto final, com economia escalável e uma
base de entrega reproduzível.

## 2. O que avançou

- **Entrada no jogo:** fluxos gratuito e pago foram simplificados, com páginas
  neutras e responsivas para criação, convite e abertura do jogo. Ver
  [requisitos da entrada](../design/production-entry-page-requirements.md) e
  [arquitetura do fluxo](../architecture/production_entry_flow.md).
- **Entrada em produção:** ficou definido que o pagamento será feito somente
  por blockchain. Ver o contrato de [admissão paga](../architecture/paid_admission_contract.md).
- **Economia:** valores agora usam micro-EVA, com entradas de **0,1 / 0,5 / 1
  EVA**, recompensas limitadas pelo banco e ordem definida para pagamentos. Ver
  [proposta de escala](../rules/buy-in-scaling-proposal.md),
  [banco finito](../devlog/0098-b-finite-bank-rewards.md) e
  [ordem de pagamentos](../devlog/0099-b-bank-payment-waterfall.md).
- **Regras:** o manual foi atualizado para separar claramente o que já está
  implementado do que ainda precisa de decisão. Ver
  [manual de regras](../rules/evanopolis-v1-rulebook.md).
- **Preparação para entrega:** já existem pacote web reproduzível, imagens dos
  serviços e instruções operacionais. Ver
  [guia de operação](../delivery/operator-handoff.md) e
  [auditoria do candidato](../delivery/2026-09-25-release-candidate-validation.md).

## 3. Demonstração sugerida

1. Criar uma sala gratuita e entrar por convite.
2. Criar uma sala paga, compartilhar o convite e mostrar a reserva do assento.
3. Dentro do jogo, mostrar os valores proporcionais à entrada e as mensagens
   quando o banco não consegue pagar tudo.
4. Mostrar rapidamente o pacote de entrega e os pontos de verificação do
   [guia de operação](../delivery/operator-handoff.md).

## 4. Decisões que precisamos fechar

- Regras finais: prêmio/jackpot, hipoteca, insolvência por carta, tempo de turno
  e percentuais do encerramento. Contexto no
  [manual de regras](../rules/evanopolis-v1-rulebook.md).
- Ambiente do cliente: responsáveis por domínio, TLS, segredos, CORS,
  hospedagem e persistência. Lista no
  [checklist de conclusão](../delivery/completion-checklist.md).

## 5. Caminho curto até o fim

| Marco | Evidência de conclusão |
| --- | --- |
| Aprovar regras e escopo | [Manual](../rules/evanopolis-v1-rulebook.md) aceito por produto e cliente |
| Validar uma partida completa | Registro conjunto de uma partida multiplayer até o encerramento |
| Validar integração real | Sala paga com conta, carteira, navegadores e celular do cliente |
| Congelar o candidato | Manifesto e imagens dos serviços apontando para a mesma revisão |
| Implantar no ambiente do cliente | Health checks e teste de ponta a ponta aprovados |
| Aceite final | [Checklist de conclusão](../delivery/completion-checklist.md) assinado |

Detalhes de empacotamento e recuperação ficam no
[guia de operação](../delivery/operator-handoff.md); não precisam ser discutidos
em profundidade nesta reunião.

## 6. Resultado esperado da reunião

- decisões de regras registradas;
- responsável e data para o ambiente do cliente;
- data do teste conjunto de partida completa;
- acordo sobre o próximo candidato de entrega e critério de aceite.
