# CRAMMED

A quiet, game-touched study room for working through course material. The current study set is source-based **Applied Chemistry Modules 2–4** and **Technical English Module 1**.

The Chemistry modules are built from the supplied lecture PDFs. The English module follows the question order and task types visible in the supplied CAT-II paper and includes its word bank for definition practice. Its model answers teach the demonstrated formats; they are not a guarantee of future exam questions. Each study topic includes a worked example and quiz practice.
The default appearance uses onyx, charcoal, warm white, and restrained brass. A few tiny stars drift slowly in the negative space; they stay behind the reading surfaces and stop when reduced motion is requested. Use the sun/moon control in the header to switch themes. Your appearance choice is saved in this browser.

## Start here

```sh
npm install
npm run dev
```

Check the app before publishing:

```sh
npm test
npm run test:content
npm run build
```

`npm run test:content` validates the published module JSON, requires a worked example in every topic, and checks question references. The Vite build also validates the strongly typed content catalog.

## Add course PDFs

The upload folders are ready under [`documents/books`](./documents/books/README.md):

```text
documents/books/
  applied-chemistry/module-02/source/
  applied-chemistry/module-03/source/
  applied-chemistry/module-04/source/
  technical-english/module-01/source/
```

Put a module's PDF (or PDFs) into that module's `source/` folder. Add folders named `module-03`, `module-04`, and so on when there are more modules. Keep the subject slugs as shown above so extracted content joins the right subject. PDF filenames can be descriptive, such as `chemical-equilibrium.pdf`.

Run:

```sh
npm run ingest
```

The local ingestion command extracts text and source-page references into a `module.draft.json` beside the published module content. It does not use AI, infer missing facts, create quiz questions, or overwrite an existing draft. Scanned/image-only PDFs need OCR before extraction. Review the draft, create concise checked revision notes and questions from the source, validate with `npm run test:content`, then promote the reviewed file to `module.json`. Only `module.json` files are loaded by the site; unreviewed drafts are not published.

The frontend is data-driven: each module has an ID, title, description, topics, sections, questions, and source references. Give every topic a checked, useful worked example and give each question an explanation that teaches why its answer is right. Ground course examples in the uploaded material; label any extra illustration clearly. The release catalog is explicitly limited to Chemistry Modules 2–4 and English Module 1 in `src/data/catalog.ts`.

## Study flow

- Pick a subject and follow its module map.
- Open and mark notes as explored; progress persists in local storage.
- Take the untimed module trial and revisit missed topics from the results.
- Complete every module to unlock the full subject trial.
- Search subjects, modules, topic titles, formulas, and note text with the search button or `⌘K` / `Ctrl+K`.

Demo module tests contain the questions included with the demo content. PDF-derived drafts have no questions until a reviewer adds and verifies them.

## Deploy

The site is a static Vite build. Import the repository into Vercel with the default settings (`npm run build`, output directory `dist`). No server or runtime PDF processing is required. Commit reviewed `module.json` content to make it available in the deployed site.

Study progress is stored in the current browser only; there is no account or remote tracking.
