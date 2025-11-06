# Universal Event Aggregator

The Universal Event Aggregator is a web-based application creating a federated network of servers which enable the parsing, aggregation and exchange of any type of public and private events.

To get started, first run the extractor (based on [LangExtract](https://github.com/google/langextract)), which will launch on [`http://localhost:8000`](http://localhost:8000).

```
$ cd extractor
$ cp .env.example .env     # and then insert the Google AI Studio API key
$ uv sync
$ uv run uvicorn extractor.main:app --reload
```

Then open another terminal and start the frontend, which will launch on [`http://localhost:3000`](http://localhost:3000):

```
$ cd frontend
$ pnpm install
$ pnpm dev
```

To easily test the extraction, simply click on the "Replace with demo data" button, scroll to the bottom and click on "Run extraction".
