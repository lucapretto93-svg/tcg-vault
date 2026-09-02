# TCG Vault

Crea una web app full-stack chiamata “Pokémon Collection Manager”, realmente utilizzabile e non un mockup. Obiettivo: gestire collezione Pokémon TCG, carte raw/gradate, prodotti sealed, acquisti, vendite, ROI, storico prezzi, grading e foto. Stack Lovable standard TypeScript + Tailwind + shadcn/ui; predisponi database PostgreSQL/Supabase tramite Lovable Cloud Database, responsive desktop/iPhone/iPad, dark UI pulita e professionale.

REGOLA FONDAMENTALE: schema dati stabile e retrocompatibile. Usa UUID permanenti. Non cambiare arbitrariamente significato o nomi dei campi; nuove funzionalità devono essere additive/migrate, mai distruttive.

MVP DA IMPLEMENTARE ORA:
1) Dashboard con numero carte/sealed, capitale investito, valore corrente, profitto realizzato/non realizzato, ROI complessivo, carte da gradare, top carte per valore e ROI.
2) Sezione Carte con tabella + card view, ricerca, filtri e ordinamento.
3) Form inserimento carta con: pokemon_name, card_name, set_name, set_code, card_number, set_total, year, language, rarity, variant, holo, reverse_holo, first_edition, unlimited, shadowless, promo, notes.
4) Foto carta: front, back, extra, mantenendo originali.
5) Condition assessment: overall_condition, centering_front/back, surface_front/back, edges, corners, whitening, scratches, print_lines, dents, creases, stains, notes.
6) Grading assessment: grading_company, min_grade, probable_grade, max_grade, PSA 6/7/8/9/10 probability (somma 100), confidence, recommendation GRADA/VALUTA/NON GRADARE, notes.
7) Market values separati per raw, PSA6, PSA7, PSA8, PSA9, PSA10 e sealed, con value, currency, source, observed_at. Ogni aggiornamento crea storico, non sovrascrive lo storico.
8) Expected Graded Value = somma(probabilità voto × valore mercato voto). Mostra grading cost stimato, expected uplift e expected profit.
9) Acquisti: data, piattaforma, venditore, item price/allocated cost, spedizione, fees, taxes, total cost, note. Supporta lotti tramite purchases + purchase_items.
10) Vendite: pulsante VENDI; data, piattaforma, gross revenue, shipping, fees, taxes, net revenue. Non cancellare item: status -> SOLD. Net Profit = net revenue - total item cost; ROI = net profit / total item cost * 100.
11) Sealed: ETB, Booster Box, Booster Bundle, Collection Box, Tin, Blister, Display, UPC, Deck, Altro. Campi: nome, set, lingua, anno, product_type, quantity, package_condition, sealed_status, notes e foto.
12) Storico prezzi con grafico per singolo item.
13) Export JSON + CSV.
14) Sidebar: Dashboard, Carte, Sealed, Acquisti, Vendite, Grading, Storico Prezzi, Impostazioni.
15) Pagina dettaglio carta con foto, identità, condizione, difetti, valore raw, valori PSA, probabilità, expected value, recommendation, costo acquisto, profitto potenziale, storico prezzi/operazioni, e pulsanti Modifica, Aggiorna valore, Analizza, Grada, Genera inserzione, Vendi. Per ora Analizza e Genera inserzione possono essere placeholder funzionali senza API esterne.

ARCHITETTURA DATI MINIMA: items, cards, card_images, condition_assessments, grading_assessments, market_prices, purchases, purchase_items, sales, sale_items, sealed_products. Prevedi ai_analyses per futura integrazione OpenAI/Gemini, ma non chiamare API a pagamento ora. Prevedi futura integrazione eBay senza implementarla.

Crea RLS/sicurezza sensata per app personale. Non usare service keys nel frontend. Inserisci pochi dati DEMO chiaramente marcati. Costruisci app completa, collegala al database, verifica routing e flussi CRUD principali, correggi autonomamente errori e lascia il progetto in stato funzionante. Non introdurre costi o servizi a pagamento.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/daba645c-0266-424f-9724-b6c409db4a65).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
