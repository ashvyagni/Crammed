# Source PDFs

Drop the PDF for each module into its matching `source/` folder. Keep one module per folder; add another `module-03/source/` folder when a subject has more modules.

```text
documents/books/
  applied-chemistry/module-01/source/
  applied-chemistry/module-02/source/
  applied-chemistry/module-03/source/
  applied-chemistry/module-04/source/
  basic-engineering/module-01/source/
  technical-english/module-01/source/
  multivariable-calculus/module-01/source/
```

Use the subject and module names above as the folder names. PDF filenames can describe the chapter (for example, `atomic-structure.pdf`). Then run `npm run ingest`. The command extracts text page by page into a reviewable draft and retains PDF page references; it does not generate facts, questions, or publish content automatically. While reviewing, write a clear worked example for every topic and make sure each question explanation teaches the reasoning. Keep examples faithful to the source, and label any added illustration that is not in the PDF. Promote reviewed content to `content/subjects/<subject>/<module>/module.json` when ready.

The first CRAMMED release includes Applied Chemistry Modules 2–4 and Technical English Module 1. The earlier Applied Chemistry Module 1 and the Basic Engineering/Multivariable Calculus samples are not part of the release catalog. Technical English Module 1 is based on the supplied CAT-II paper images and word bank; its practice follows the question types and order visible in that one paper, not a guarantee that a future exam will repeat its wording.
