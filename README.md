# CloxOne

A Chrome extension (Manifest V3) that turns the New Tab page into a multi–time zone dashboard. It makes zero network requests.

## Try it (2 minutes)

1. Open `chrome://extensions` and switch on **Developer mode**.
2. Click **Load unpacked** and choose the `extension` folder.
3. Open a new tab. If Chrome asks whether to keep the new New Tab page, choose **Keep it**.

## Before publishing

1. **Holiday data (10 years, by country):** run once:
   ```
   pip install --upgrade holidays
   python3 tools/build_holidays.py
   ```
   This writes `extension/js/holidays-data.js` with national public holidays for every supported country, for the current year plus the next 9. No yearly rebuild is needed. Rebuilding occasionally with a newer python-holidays picks up corrections to far-future lunar and government-announced dates. Until you run it, holiday badges stay hidden.
2. **Ko-fi links:** set `KOFI_URL` and `KOFI_PRO_URL` in `extension/js/config.js`.
3. **Licence signing key:** your key is in `tools/keys/private-key.json`, and its public half is in `config.js`. Back it up and keep it secret. It is not included in either zip. Losing it means you can't issue new keys; leaking it means anyone can.
4. **Run the tests:** `node tests/run_tests.mjs` (needs Node 18+ and Python 3).
5. **Zip the `extension` folder only** and upload it to the Chrome Web Store. In the privacy section, declare that it collects no data.

## Cities and time zones

The city list lives in `tools/data/cities.txt` (one line per city: `Name|Country|IANA zone|aliases`). After editing, run:

```
node tools/build_data.mjs
```

It checks every city against the tzdb zone list (`tools/data/zone.tab`) and regenerates `extension/js/cities-data.js` and `extension/js/zones.js`. Users can also type any IANA zone (e.g. `America/Kentucky/Monticello`), a legacy name (`Asia/Calcutta`), an alias (`NYC`, `Bombay`) or an abbreviation (`PST`, `IST`).

## Selling Pro (no server)

Each sale needs a key. Create one with:

```
node tools/license_tool.mjs issue --plan lifetime     # or yearly / monthly
node tools/license_tool.mjs batch 50 --plan lifetime  # 50 unique keys to hand out one per order
```

Send each buyer their key via Ko-fi's order message. The extension checks keys offline with the public key. Yearly and monthly keys include an expiry date, so renewals need a new key.

## Project layout

| Path | What it is |
|---|---|
| `extension/` | The extension itself (this is what you zip) |
| `extension/js/app.js` | Dashboard: columns, scrubber, settings, paywall, tip banner |
| `extension/js/time.js` | Time zone math (handles DST and :30/:45 zones) |
| `extension/js/cities-data.js`, `zones.js` | Generated: 561 cities, 419 IANA zones, legacy-name aliases |
| `extension/js/cities.js` | Place lookup: cities, raw zones, legacy names, regions |
| `extension/js/search.js` | Search: names, aliases, countries, abbreviations, IANA zones |
| `extension/js/holidays.js`, `holidays-data.js` | Country-level holidays, 10 years (data generated) |
| `extension/js/patterns.js` | Doodle patterns built from Tabler Icons (MIT) |
| `extension/js/license.js` | Offline Pro key check |
| `extension/js/tips.js` | Tip reminder schedule |
| `tools/data/cities.txt`, `zone.tab` | Source data for cities and zones |
| `tools/build_data.mjs` | Validates and generates city and zone files |
| `tools/build_holidays.py` | Generates holiday data from python-holidays (MIT) |
| `tools/license_tool.mjs` | Creates and checks Pro keys |
| `tests/run_tests.mjs` | Logic, search, holiday and privacy tests |

## Keyboard

- `↑` / `↓` moves the time scrubber.
- `Esc` clears it.
- `Ctrl/⌘ + K` adds a city.
