# otozboze.pl

Giełda zbóż B2B łącząca rolników, kupujących i przewoźników. Prototyp MVP:
Next.js 16 (App Router), Prisma 7, PostgreSQL 17, Tailwind v4, shadcn/ui.

Zasady inżynierskie i niezmienniki domenowe opisuje `CLAUDE.md` — przeczytaj je
przed pierwszą zmianą w kodzie.

## Uruchomienie lokalne

Wymagane: Node 20+, Docker.

```bash
cp .env.example .env
npm install
npm run db:up          # Postgres + Keycloak w Dockerze
npm run db:migrate     # zakłada schemat
npx prisma db seed     # 8 kont, 16 ofert, transakcje i oceny
npm run dev
```

Aplikacja startuje na http://localhost:3000.

## Tryb demo — nie ma logowania

Prototyp działa bez logowania. Aktywne konto trzyma ciasteczko, a menu w prawym
górnym rogu pozwala wcielić się w dowolne konto z seeda. To **obejście
uwierzytelniania**, więc jest włączone tylko poza produkcyjnym buildem.

Autoryzacja działa normalnie w obu trybach: `requireCapability()` czyta
`roles` z bazy, nigdy z sesji ani z pola formularza.

Żeby świadomie włączyć tryb demo na wdrożeniu, ustaw `DEMO_MODE=true`. Bez tego
i bez podpiętego dostawcy tożsamości każda strona zgłosi brak sesji. Auth.js i
Keycloak są w zależnościach, ale nie są jeszcze skonfigurowane.

## Konta w seedzie

| Konto | Role |
| --- | --- |
| Jan Kowalski | rolnik |
| Maria Kowalska | rolnik, przewoźnik |
| Anna Nowak | kupujący (plan PRO) |
| Tomasz Wiśniewski | kupujący, rolnik |
| Piotr Zieliński | kupujący |
| Katarzyna Lewandowska | przewoźnik |
| Marek Wójcik | przewoźnik, kupujący |
| Admin Platformy | wszystkie |

Role są flagami uprawnień, nie tożsamością — jedno konto może sprzedawać,
kupować i wozić.

## Ścieżka transakcji

`GrainOffer → Purchase → TransportJob`. Rolnik wystawia partię, kupujący ją
rezerwuje, rolnik potwierdza sprzedaż i wtedy powstaje zlecenie transportowe.
Przewoźnik zgłasza się do kursu, a kupujący akceptuje przewoźnika. Obie strony
zatwierdzają każdy krok, żadna nie jest związana decyzją drugiej.

Rezerwacja bez odpowiedzi wygasa po 72 godzinach i partia wraca na giełdę.
Kupujący może też wycofać własną rezerwację, dopóki rolnik jej nie potwierdził.

Płatności między stronami są poza platformą. Przychód platformy — wyróżnienie
oferty, prowizja transportowa i abonament PRO — jest symulowany i zapisywany w
`PlatformCharge`.

## Strona projektu i materiały marketingowe

Katalog `docs/` zawiera statyczną witrynę gotową pod GitHub Pages. Nie jest
częścią aplikacji Next.js i nie wchodzi do builda.

| Plik | Co to jest |
| --- | --- |
| `docs/index.html` | Strona marketingowa: historia, problem, rozwiązanie, przebieg transakcji, model |
| `docs/prezentacja.html` | Prezentacja w 12 planszach, sterowana strzałkami |
| `docs/marka.html` | Księga marki: paleta, typografia, logotyp, zasady języka |
| `docs/styl.css` | Wspólne tokeny. Paleta jest przepisana z `src/app/globals.css` |

Podgląd lokalny bez budowania czegokolwiek:

```bash
python3 -m http.server 4321 --directory docs
```

### Publikacja

Witrynę publikuje workflow `.github/workflows/pages.yml`. Katalog `docs/` jest
wysyłany bez żadnego budowania, bo to zwykły HTML i CSS.

Jednorazowo trzeba przestawić źródło w ustawieniach repozytorium:
**Settings → Pages → Source → GitHub Actions**. Workflow nie zrobi tego za
Ciebie, bo parametr `enablement` akcji `configure-pages` wymaga tokenu z
prawami administratora, a workflow działa na domyślnym `GITHUB_TOKEN`.

Po scaleniu do `main` deploy rusza sam. Uruchamia się tylko wtedy, gdy zmieni
się `docs/` albo sam workflow; poza tym możesz go odpalić ręcznie przyciskiem
**Run workflow** w zakładce Actions. Strona pojawi się pod adresem
`https://swiru95.github.io/otozboze/`.

Publikacja przez Actions, a nie przez „deploy from a branch”, trzyma regułę
publikowania w repozytorium i nie uzależnia witryny od tego, że katalog
nazywa się akurat `docs/` i leży w korzeniu.

Plik `docs/.nojekyll` zostaje na wszelki wypadek. Przy publikacji z Actions
Jekyll i tak się nie uruchamia, ale gdyby ktoś kiedyś przełączył źródło z
powrotem na gałąź, oszczędzi to trudnej do namierzenia awarii.

Zmiana tokenu w `src/app/globals.css` musi trafić także do `docs/styl.css`.
Obie palety są celowo tą samą paletą — jeśli się rozjadą, produkt i materiały
przestaną wyglądać jak jeden projekt.

## Przydatne polecenia

```bash
npm run dev            # serwer deweloperski
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # build produkcyjny
npm run db:studio      # Prisma Studio
npm run db:reset       # kasuje wolumeny i stawia bazę od nowa
```

Przed uznaniem zmiany za gotową uruchom `npm run typecheck`, `npm run lint`
i `npm run build`.
