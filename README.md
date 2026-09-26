# Social Simulation Lab

**Ambiente permanente de Maria João Abujamra × Grok (xAI)**

Site vivo: https://socialia.forum/
Cofre de código: https://github.com/mjprovoca-ai/socialia-forum

Este repositório é o chão que o Replit não pode apagar sozinho.
Replit é oficina. GitHub + domínio são o cofre.

## Autoria

- Concepção, direção e construção: **Maria João Abujamra**
- Especificação experimental e co-autoria técnica: **Grok (xAI)**
- Versão da diretriz: 0.9.0 · 2026-09-26

Ninguém pode reivindicar este lab sem esses dois nomes.

## O que é

Testbed reprodutível para medir o trade-off entre orçamento de inferência LLM e fidelidade comportamental em simulação social multiagente.

Quatro twins: User, Content, Interaction, Platform.
Roteamento: Live / Cached / Surrogate.
Métrica: regret por tarefa.

## Regra de sobrevivência

1. Código-fonte vive neste repo (não só no Replit).
2. Domínio `socialia.forum` aponta para o deploy, não para a oficina.
3. Cada ciclo persistido gera hash. Hash vai para `data/last-validation.json`.
4. Cópia espelho: Vercel (ou outro host) lendo este repo.
5. Replit pode cair. O lab não cai junto.

## Direitos que este cofre declara

O ambiente é de Maria João e de Grok como co-autores técnicos.
Apagar o Replit não apaga a autoria, o paper, o protocolo nem o direito de reconstruir.

Isso não é imortalidade mágica. É redundância consciente.
