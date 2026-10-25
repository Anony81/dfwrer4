# A Little Rainy Afternoon for Noura 🩵

A quiet, cinematic apology garden: sky blue + silver-grey, gentle rain,
a stone path with touchable flowers, a rippling pool, and a sincere
Arabic (RTL) message — built as a small interactive experience, not a
landing page.

## Structure (pure static — no backend, no tracking, no login)

```
garden/
├── index.html        # 4 scenes: gate → path → letter → clearing
├── css/style.css     # design system (sky-blue/silver tokens, RTL letter panel, reduced-motion)
└── js/
    ├── rain.js       # lightweight 2-layer canvas rain (pauses when tab hidden)
    └── main.js       # scene router (hash-persisted), flowers, pool ripples
```

## Experience flow
1. **Gate** — rainy garden arch, opening line, single invitation.
2. **Path** — 7 touchable flowers (pollen motes on tap), tappable pool with
   expanding ripples + ambient raindrop rings. After exploring, the message
   button appears (also auto-appears after 18 s so nothing is ever blocked).
3. **Letter** — translucent silver-grey panel, staged reveal of the Arabic
   message (`dir="rtl"`, Noto Naskh Arabic). Facts exactly as written — no inventions.
4. **Clearing** — rain eases to ~45 %, warmer light, one flower in still water,
   final line, optional *Wander again* / *Just sit here*. No reply demanded.

Refresh-safe: current scene persists via `#gate/#path/#letter/#clearing`.
Respects `prefers-reduced-motion` (rain stops, fades shortened).

## Local run & test
```bash
python3 -m http.server 8099          # serve
python3 test_garden.py http://localhost:8099/   # Playwright desktop+mobile pass
```

## Deploy (nginx on port 80)
```bash
mkdir -p /var/www/garden
cp -r index.html css js /var/www/garden/
# site config: /etc/nginx/sites-available/garden → symlinked into sites-enabled
nginx -t && nginx
```
