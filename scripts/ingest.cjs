const fs = require('node:fs/promises')
const path = require('node:path')
const pdfParse = require('pdf-parse')

const root = path.resolve(__dirname, '..')
const sourceRoot = path.join(root, 'documents', 'books')
const contentRoot = path.join(root, 'content', 'subjects')

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function titleize(value) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

async function listDirectories(directory) {
  try {
    return (await fs.readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

async function extractPdf(pdfPath) {
  const buffer = await fs.readFile(pdfPath)
  const document = await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      })
      let lastY
      let text = ''
      for (const item of content.items) {
        if (lastY === item.transform[5] || !lastY) text += item.str
        else text += `\n${item.str}`
        lastY = item.transform[5]
      }
      return `${text}\f`
    },
  })
  const pages = document.text
    .split(/\f/)
    .map((text, index) => ({ number: index + 1, text: text.trim() }))
    .filter((page) => page.text)
  if (pages.length === 0) {
    throw new Error(`No extractable text found in ${path.relative(root, pdfPath)}. Scanned PDFs need OCR before ingestion.`)
  }
  return pages
}

async function createDraft(subjectId, moduleId, pdfFiles) {
  const topics = []
  for (const pdfFile of pdfFiles) {
    const pages = await extractPdf(pdfFile)
    const relativePdf = path.relative(root, pdfFile).split(path.sep).join('/')
    const extractedText = pages.map((page) => page.text).join(' ')
    topics.push({
      id: slugify(path.basename(pdfFile, path.extname(pdfFile))),
      title: titleize(path.basename(pdfFile, path.extname(pdfFile))),
      minutes: Math.max(1, Math.ceil(extractedText.split(/\s+/).filter(Boolean).length / 220)),
      source: { file: relativePdf },
      sections: pages.map(({ number, text }) => ({
        id: `page-${number}`,
        title: `Extracted page ${number}`,
        kind: 'paragraph',
        body: text,
        source: { file: relativePdf, page: number },
      })),
    })
  }

  if (topics.length === 0) return false
  const module = {
    id: `${subjectId}/${moduleId}`,
    title: titleize(moduleId),
    description: 'Review this source-grounded extraction and add verified revision notes before publishing.',
    accent: 'clay',
    sourceFiles: [...new Set(topics.map((topic) => topic.source.file))],
    topics,
    questions: [],
  }
  const targetDirectory = path.join(contentRoot, subjectId, moduleId)
  await fs.mkdir(targetDirectory, { recursive: true })
  const targetPath = path.join(targetDirectory, 'module.draft.json')
  try {
    await fs.access(targetPath)
    throw new Error(`Draft already exists at ${path.relative(root, targetPath)}. Review or rename it before re-ingesting so edits are not overwritten.`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  await fs.writeFile(targetPath, `${JSON.stringify(module, null, 2)}\n`, { flag: 'wx' })
  process.stdout.write(`Drafted ${path.relative(root, targetPath)} from ${pdfFiles.length} PDF(s); review before publishing.\n`)
  return true
}

async function main() {
  let draftCount = 0
  const subjects = await listDirectories(sourceRoot)
  for (const subjectFolder of subjects) {
    const subjectId = slugify(subjectFolder)
    const subjectPath = path.join(sourceRoot, subjectFolder)
    const moduleFolders = await listDirectories(subjectPath)
    for (const moduleFolder of moduleFolders) {
      const moduleId = slugify(moduleFolder)
      const sourcePath = path.join(subjectPath, moduleFolder, 'source')
      let entries
      try {
        entries = await fs.readdir(sourcePath, { withFileTypes: true })
      } catch (error) {
        if (error.code === 'ENOENT') continue
        throw error
      }
      const pdfFiles = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
        .map((entry) => path.join(sourcePath, entry.name))
        .sort()
      if (pdfFiles.length === 0) continue
      if (!/^module-\d{2}$/.test(moduleId)) {
        throw new Error(`Module folder must use module-01 naming: ${path.relative(root, path.join(subjectPath, moduleFolder))}`)
      }
      if (await createDraft(subjectId, moduleId, pdfFiles)) draftCount += 1
    }
  }
  if (draftCount === 0) {
    process.stdout.write('No PDFs found. Add a PDF under documents/books/<subject>/module-01/source/ and run npm run ingest again.\n')
  } else {
    process.stdout.write(`Finished: ${draftCount} review draft(s). Sample module.json files were left untouched.\n`)
  }
}

main().catch((error) => {
  process.stderr.write(`Ingestion failed: ${error.message}\n`)
  process.exitCode = 1
})
