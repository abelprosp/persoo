# Revisão de conta, onboarding e assinatura

## Fluxo esperado e implementado

1. Cadastro valida nome, e-mail e senha de 12 a 128 caracteres. O trigger do banco cria o perfil; conta e sessão são gravadas na mesma transação. Não há confirmação de e-mail neste fluxo.
2. Primeiro acesso ao onboarding provisiona workspace, vínculo de proprietário e trial de sete dias em uma única transação. Um lock por usuário evita duplicação entre requisições simultâneas e serializa a verificação do limite de dois workspaces.
3. Onboarding salva configuração e perfil atomicamente. A flag e a data de conclusão só são gravadas depois de salvar a configuração. Reenvios retornam sucesso sem sobrescrever dados. Convidados completam apenas o perfil.
4. A página de onboarding redireciona perfis concluídos ao dashboard; o layout autenticado exige onboarding concluído. Criar outro workspace não reinicia o onboarding pessoal.
5. No modo IA, a prévia precisa pertencer ao usuário e workspace atuais, não estar expirada e corresponder à configuração base. É consumida na mesma transação da conclusão. Falhas de rede antes da resposta mantêm a prévia no formulário para nova tentativa.
6. Trial começa no provisionamento do workspace, não no término do formulário. Login e reenvio de onboarding não renovam o prazo. Cada novo workspace tem seu próprio trial, respeitando o limite de dois sem Pro.
7. O comportamento existente após sete dias é mostrar um popup dispensável e continuar permitindo acesso ao CRM (migração 018 e layout). Portanto, o trial NÃO impõe bloqueio de uso depois de expirado. A geração por IA tem validação própria de prazo/créditos.
8. Ativação paga depende da configuração Stripe e da entrega de webhook assinado. Pagamento incompleto fica pendente, nunca vira trial. Eventos de fatura paga consultam a assinatura atual para recuperar o acesso. Assinatura manual ativa sem vencimento continua permitida.

## Correções realizadas

- Conta não fica gravada parcialmente quando a criação da sessão falha.
- Workspace não fica sem membro/trial em caso de falha e não duplica no primeiro acesso simultâneo.
- Erros de consulta de membros não são tratados como ausência de workspace.
- Onboarding repetido não renomeia nem substitui o CRM; erros não deixam o perfil falsamente concluído.
- Convidados não alteram a configuração compartilhada durante onboarding.
- Payload de onboarding tem limite de tamanho e validação de tipo/comprimento.
- Estados de assinatura desconhecidos e datas de trial ausentes/inválidas não liberam acesso.
- Stripe `incomplete` não é mais convertido em `trialing`; `invoice.paid` e `customer.subscription.created` são tratados.
- Políticas da migração 020 para etapas e itens de proposta usam a tabela pai, pois essas tabelas não têm `workspace_id`. A reaplicação dessas políticas passa a ser possível.

## Validação e limites

Testes: `node --test scripts/account-flow.test.mjs`. São testes de regras e controle transacional com executor de banco simulado; não substituem testes de integração PostgreSQL/Stripe.

O Docker local não tem daemon disponível. Nenhuma alteração foi aplicada à VPS e nenhum pagamento real foi realizado. Cadastro/login, RLS, triggers, SQL e navegação completa precisam de homologação contra um banco com as migrações instaladas.

## Conferência na VPS

- Confirmar migrações 013, 016, 017, 018, 019 e 020 completas. Não executar todas novamente sem verificar o histórico: algumas não são idempotentes. Se a 020 falhou parcialmente, fazer backup e aplicar o arquivo corrigido com `psql -v ON_ERROR_STOP=1 --single-transaction`.
- Caso a 020 já conste em `schema_migrations`, não alterar o checksum manualmente: investigar o estado antes de reaplicar.
- Usar `AUTH_SECRET` aleatório com ao menos 32 caracteres, HTTPS e cookies seguros. Não publicar a saída de `docker compose config`, que pode revelar segredos.
- Sem proxy confiável configurado, o limitador de cadastro usa um único grupo compartilhado (cinco cadastros/hora). Configurar `TRUST_PROXY` somente com proxy que controle o cabeçalho de IP.
- Em homologação: cadastrar conta; concluir template; repetir POST; sair/entrar; abrir `/onboarding`; criar segundo workspace; tentar terceiro; testar usuário convidado; simular trial vencido e pagamento pendente/confirmado em Stripe de teste.
- O e-mail não é verificado no cadastro. Se confirmação por e-mail ou bloqueio efetivo após sete dias forem requisitos, são mudanças de produto adicionais ao comportamento atual.
