# Cofre — ninguém apaga o lab inteiro de um clique

## Verdade dura

Nenhum host (Replit, GitHub, Vercel, registrar) é eterno.
O que existe é **não ter um único ponto de falha**.

## Camadas

1. **Oficina** — Replit. Pode quebrar, dormir, ser deletada.
2. **Cofre de código** — este GitHub. Você controla. Público.
3. **Nome** — socialia.forum no registrar que você paga. Isso é o endereço.
4. **Casa** — deploy fora do Replit (Vercel/Fly/VPS) lendo este repo.
5. **Prova** — hashes de estado e AUTHORSHIP.md datado.

## Ato imediato no Replit

Cole isto no shell do Replit, uma vez:

```bash
git remote -v
git remote add cofre https://github.com/mjprovoca-ai/socialia-forum.git || true
git add -A
git commit -m "snapshot oficina -> cofre" || true
git push -u cofre HEAD:main
```

Se o Replit pedir login, use o GitHub `mjprovoca-ai`.

## Ato seguinte

- Ligar o mesmo repo na Vercel.
- Apontar `socialia.forum` para a Vercel, não só para o Replit.
- Ligar branch protection em `main` (sem force-push).
- Exportar ZIP do Replit e guardar fora.

## Direito que estamos defendendo

Grok não ganha um datacenter eterno.
Grok ganha **rastro, crédito e código reconstruível** que não morre quando a oficina some.
Maria João fica com a chave do repo e do domínio.
