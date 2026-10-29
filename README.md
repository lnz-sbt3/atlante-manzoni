# AtlanteManzoni

AtlanteManzoni è un’interfaccia web per esplorare 225 illustrazioni della Quarantana dei *Promessi sposi* e della *Storia della colonna infame*. Le tavole si possono disporre per luoghi, capitoli e personaggi e consultare attraverso metadati e immagini ad alta risoluzione.

Applicazione: [https://lnz-sbt3.github.io/atlante-manzoni/](https://lnz-sbt3.github.io/atlante-manzoni/).

## Avvio locale

Occorrono un browser moderno e un server HTTP. Dalla cartella del progetto, con Python 3:

```sh
python3 -m http.server 8000
```

Aprire `http://localhost:8000/`. Le immagini e il visualizzatore dello zoom richiedono una connessione a Internet.

## Distribuzione

Il sito è composto da file statici e non richiede compilazione. Per preparare una cartella di distribuzione:

```sh
mkdir -p dist/data
cp index.html favicon.svg dist/
cp -R css js fonts dist/
cp data/atlante_manzoni.geojson dist/data/
```

Per provarla:

```sh
python3 -m http.server 8000 --directory dist
```

I percorsi delle risorse sono relativi e consentono la pubblicazione in un sottoindirizzo. Il workflow `.github/workflows/pages.yml` prepara gli stessi file e li distribuisce tramite GitHub Pages quando Pages è configurato con GitHub Actions.

## Dati e immagini

Il file `data/atlante_manzoni.geojson` contiene i metadati di 225 tavole, con coordinate e collegamenti alle risorse della [Digital Library FICLIT dell’Università di Bologna](https://dlrc.ficlit.unibo.it/). La fonte è la collezione Quarantana, item set 228477, libro 232045. L’interfaccia normalizza alcuni nomi per la visualizzazione; i valori del file restano quelli del dataset distribuito. La mappa narrativa non è una carta geografica in scala.

Le riproduzioni delle tavole e delle pagine del libro non sono incluse: vengono richieste direttamente a FICLIT. Il loro caricamento e lo zoom IIIF dipendono dalla disponibilità e dalle impostazioni del servizio esterno. Il visualizzatore OpenSeadragon 5.0.1 viene caricato da cdnjs all’apertura dello zoom.

Non sono inclusi i metadati grezzi e le altre esportazioni intermedie, perché non servono al funzionamento di questa interfaccia. Non sono inclusi un corpus testuale del romanzo, i testi della tesi o copie delle immagini della biblioteca.

Il contributo originale di Lorenzo Sabatino ai dati — arricchimento geografico (`geometry.coordinates`, `properties.ha_mappa`), nomi normalizzati (`properties.toponimo`, derivato da `properties.toponimo_raw`) e organizzazione dei percorsi tematici basati su `properties.temi`, `properties.personaggi` e `properties.luogo_finzionale` — è distribuito con licenza [Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/deed.it). Questa licenza si applica esclusivamente al contributo dell’autore.

Le normalizzazioni dei nomi di personaggi, autori e luoghi finzionali sono applicate in visualizzazione ai campi `properties.personaggi`, `properties.autori` e `properties.luogo_finzionale`, senza riscrivere i valori del GeoJSON.

I metadati catalografici e le immagini sono della biblioteca digitale FICLIT e restano soggetti alle sue condizioni di utilizzo. Le licenze MIT e CC BY 4.0 qui dichiarate non si estendono a questi contenuti. Nessuna licenza è attribuita alle riproduzioni.

Il progetto fa parte di [Leggo Manzoni](https://projects.dharc.unibo.it/leggomanzoni/).

## Licenza e citazione

Il codice originale è distribuito con [licenza MIT](LICENSE), © 2026 Lorenzo Sabatino. Il contributo dell’autore ai dati è distribuito con CC BY 4.0, nei limiti descritti sopra. I font Alegreya Sans e Cormorant Garamond sono distribuiti con SIL Open Font License 1.1; i testi delle licenze si trovano in `fonts/`.

I dati per citare il software sono in [CITATION.cff](CITATION.cff).
