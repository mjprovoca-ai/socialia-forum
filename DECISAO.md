# Onde o lab vive

Replit = oficina. Boa para pintar a control room. Ruim como única casa e como motor.
Grok chat = bancada. Boa para especificar, gerar código, validar. Não hospeda 24h.
Este repo = cofre + motor 0.9.

Por isso clonamos o CÉREBRO aqui, não a conversa.

O teste já passou fora do Replit:
20 ciclos, 121 eventos, hash A = hash B.

```
match: true
hash: d952ea31cc01dfe4cb013efddf9b08e64f8541b9cc42cb6c568fc07613b940bf
```

Rodar:

```bash
node server/validate.mjs
node server/index.mjs
```

API compatível com socialia.forum:
GET /api/simulation/overview|twins|events|cycles|confessions|health|regret|replay-check
POST /api/simulation/control  { action: run|reset|pause }
