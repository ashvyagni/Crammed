import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, BookOpen,
  Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Clock3, Command, Compass, Feather, House, LockKeyhole, Menu, ChevronUp,
  Search, Sparkles, Sun, Moon, X,
} from 'lucide-react'
import { catalog } from './data/catalog'
import { moduleKey, readProgress, topicKey, writeProgress } from './lib/progress'
import type { Module, Progress, Section, Subject, Topic } from './types'

type Route =
  | { page: 'home' }
  | { page: 'subject'; subjectId: string }
  | { page: 'module'; subjectId: string; moduleId: string }
  | { page: 'learn'; subjectId: string; moduleId: string; topicId: string }
  | { page: 'trial'; subjectId: string; moduleId: string }
  | { page: 'results'; subjectId: string; moduleId: string }
  | { page: 'empty' }

function routeFromHash(): Route {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (parts.length === 0 || parts[0] === 'home') return { page: 'home' }
  if (parts[0] === 'subject' && parts[1]) return { page: 'subject', subjectId: parts[1] }
  if (parts[0] === 'module' && parts[1] && parts[2]) return { page: 'module', subjectId: parts[1], moduleId: parts[2] }
  if (parts[0] === 'learn' && parts[1] && parts[2] && parts[3]) return { page: 'learn', subjectId: parts[1], moduleId: parts[2], topicId: parts[3] }
  if (parts[0] === 'trial' && parts[1] && parts[2]) return { page: 'trial', subjectId: parts[1], moduleId: parts[2] }
  if (parts[0] === 'results' && parts[1] && parts[2]) return { page: 'results', subjectId: parts[1], moduleId: parts[2] }
  return { page: 'home' }
}

function go(path: string): void {
  window.location.hash = path
}

function getSubject(subjectId: string): Subject | undefined {
  return catalog.find((subject) => subject.id === subjectId)
}

function getModule(subject: Subject | undefined, moduleId: string): Module | undefined {
  return subject?.modules.find((module) => module.id.split('/').at(-1) === moduleId)
}

function isModuleUnlocked(subject: Subject, moduleId: string, progress: Progress): boolean {
  const index = subject.modules.findIndex((item) => item.id.split('/').at(-1) === moduleId)
  if (index < 0) return false
  if (index === 0) return true
  const previousId = subject.modules[index - 1].id.split('/').at(-1)!
  return progress.completedModules.includes(moduleKey(subject.id, previousId))
}

function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [progress, setProgress] = useState<Progress>(readProgress)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem('crammed-theme') === 'light' ? 'light' : 'dark'
    } catch (error) {
      console.error('Could not read the saved appearance preference.', error)
      return 'dark'
    }
  })
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const update = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  useEffect(() => writeProgress(progress), [progress])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const themeColor = document.querySelector('meta[name="theme-color"]')
    themeColor?.setAttribute('content', theme === 'dark' ? '#252b24' : '#f5f3ec')
    try {
      localStorage.setItem('crammed-theme', theme)
    } catch (error) {
      console.error('Could not save the appearance preference.', error)
    }
  }, [theme])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const patchProgress = (updater: (current: Progress) => Progress) => {
    setProgress((current) => updater(current))
  }

  const subject = 'subjectId' in route ? getSubject(route.subjectId) : undefined
  const module = 'moduleId' in route
    ? getModule(subject, route.moduleId) ?? (route.moduleId === 'full' ? {
      id: 'full', title: 'Full subject trial', description: 'Every chapter, together.', accent: 'clay', topics: [], questions: [],
    } satisfies Module : undefined)
    : undefined
  const routeLocked = subject && 'moduleId' in route
    ? route.moduleId === 'full'
      ? !subject.modules.every((item) => progress.completedModules.includes(moduleKey(subject.id, item.id.split('/').at(-1)!)))
      : !isModuleUnlocked(subject, route.moduleId, progress)
    : false

  if (!catalog.length || route.page === 'empty') {
    return <EmptyState />
  }

  return (
    <div className="app-shell">
      <Starfield />
      <Sidebar current={route} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} onSearch={() => setSearchOpen(true)} />
      <main className="main-panel">
        <Topbar route={route} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} onSearch={() => setSearchOpen(true)} onMenu={() => setMobileNavOpen(true)} />
        <div className="page-content">
          {route.page === 'home' && <Home progress={progress} />}
          {route.page === 'subject' && subject && <SubjectMap subject={subject} progress={progress} />}
          {route.page === 'module' && subject && module && !routeLocked && <ModulePage subject={subject} module={module} progress={progress} />}
          {route.page === 'learn' && subject && module && !routeLocked && (
            <LearnPage subject={subject} module={module} topicId={route.topicId} progress={progress} patchProgress={patchProgress} />
          )}
          {route.page === 'trial' && subject && module && !routeLocked && (
            <QuizPage subject={subject} module={module} patchProgress={patchProgress} />
          )}
          {route.page === 'results' && subject && module && !routeLocked && <ResultsPage subject={subject} module={module} progress={progress} />}
          {routeLocked && subject && 'moduleId' in route && (
            <LockedContent subject={subject} module={module} isFull={route.moduleId === 'full'} />
          )}
          {!subject && route.page !== 'home' && <MissingContent onHome={() => go('/home')} />}
        </div>
        <footer className="site-footer">
          <span>CRAMMED <span className="footer-dot">·</span> your course notes, on this device</span>
          <span>No account. No streaks.</span>
        </footer>
      </main>
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </div>
  )
}

function Starfield() {
  return (
    <div className="starfield" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => <span className={`star star-${index + 1}`} key={index} />)}
    </div>
  )
}

function Sidebar({ current, mobileOpen, onClose, onSearch }: { current: Route; mobileOpen: boolean; onClose: () => void; onSearch: () => void }) {
  const focusedSubjectId = 'subjectId' in current ? current.subjectId : ''
  return (
    <>
      {mobileOpen && <button className="nav-scrim" aria-label="Close menu" onClick={onClose} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#/home" onClick={onClose} aria-label="CRAMMED home">
          <span className="brand-mark"><BookOpen size={23} strokeWidth={1.7} /></span>
          <span className="brand-word">CRAMMED<span className="brand-period">.</span></span>
        </a>
        <div className="sidebar-rule" />
        <span className="nav-caption">Study room</span>
        <nav className="primary-nav" aria-label="Main navigation">
          <a href="#/home" onClick={onClose} className={`nav-link ${current.page === 'home' ? 'nav-active' : ''}`}>
            <House size={17} strokeWidth={1.8} /> <span>Today</span>
            {current.page === 'home' && <span className="nav-dot" />}
          </a>
          <div className="nav-section-heading"><span>Your subjects</span></div>
          {catalog.map((subject) => (
            <a
              href={`#/subject/${subject.id}`}
              onClick={onClose}
              key={subject.id}
              className={`nav-link subject-nav ${focusedSubjectId === subject.id ? 'nav-active' : ''}`}
            >
              <span className="subject-swatch" style={{ backgroundColor: subject.color }} />
              <span>{subject.name}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <button className="side-note search-note" onClick={() => {
          onSearch()
          onClose()
        }}>
          <span className="shortcut-key"><Command size={12} /> K</span>
          <span><strong>Search your notes</strong><small>Topics, terms, formulas</small></span>
          <ArrowUpRight size={14} />
        </button>
        <div className="sidebar-foot"><span>Progress stays on this device</span></div>
      </aside>
    </>
  )
}

function Topbar({ route, theme, onToggleTheme, onSearch, onMenu }: {
  route: Route; theme: 'dark' | 'light'; onToggleTheme: () => void; onSearch: () => void; onMenu: () => void
}) {
  const title = route.page === 'home'
    ? 'Study room'
    : route.page === 'subject'
      ? getSubject(route.subjectId)?.name ?? 'Subject'
      : route.page === 'learn' || route.page === 'module' || route.page === 'trial' || route.page === 'results'
        ? route.moduleId === 'full'
          ? 'Full subject trial'
          : getModule(getSubject(route.subjectId), route.moduleId)?.title ?? 'Study session'
        : 'Study room'
  return (
    <header className="topbar">
      <button className="mobile-menu icon-button" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
      <div className="topbar-context"><span className="breadcrumb-kicker">CRAMMED</span><span className="crumb-divider">/</span><span>{title}</span></div>
      <div className="topbar-actions">
        <button className="search-trigger" onClick={onSearch} aria-label="Search subjects, modules, and notes">
          <Search size={15} /><span>Find something...</span><kbd><Command size={10} /> K</kbd>
        </button>
        <button className="theme-toggle icon-button" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  )
}

function Home({ progress }: { progress: Progress }) {
  const lastStudied = progress.lastStudied
  const lastStudiedSubject = lastStudied ? getSubject(lastStudied.subjectId) : undefined
  const continueSubject = lastStudiedSubject ?? catalog[0]
  const continueModule = (lastStudiedSubject && lastStudied
    ? getModule(lastStudiedSubject, lastStudied.moduleId)
    : undefined) ?? continueSubject?.modules[0]
  const continueTopic = continueModule?.topics.find((topic) =>
    lastStudiedSubject?.id === continueSubject?.id && topic.id === lastStudied?.topicId,
  ) ?? continueModule?.topics[0]
  const totalTopics = catalog.flatMap((item) => item.modules.flatMap((entry) => entry.topics)).length
  const totalModules = catalog.reduce((sum, item) => sum + item.modules.length, 0)
  const continueSketch = continueTopic?.sections.find((section) => section.kind === 'example' && section.visual)?.visual
  return (
    <div className="home-page">
      <section className="welcome-row">
        <div>
          <span className="eyebrow">A quieter place to study</span>
          <h1>One thing at a time.</h1>
          <p className="welcome-copy">Choose a subject. Work through an example. See what stuck.</p>
        </div>
      </section>

      {continueSubject && continueModule && continueTopic ? (
        <section
          className="home-spotlight"
          aria-label="Suggested note"
          onPointerMove={(event) => {
            if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
            const bounds = event.currentTarget.getBoundingClientRect()
            const x = (event.clientX - bounds.left) / bounds.width - 0.5
            const y = (event.clientY - bounds.top) / bounds.height - 0.5
            event.currentTarget.style.setProperty('--tilt-x', `${-y * 1.2}deg`)
            event.currentTarget.style.setProperty('--tilt-y', `${x * 1.6}deg`)
          }}
          onPointerLeave={(event) => {
            event.currentTarget.style.setProperty('--tilt-x', '0deg')
            event.currentTarget.style.setProperty('--tilt-y', '0deg')
          }}
        >
          <div className="home-spotlight-copy">
            <div className="home-spotlight-topline">
              <span>{lastStudied ? 'Pick up where you left off' : 'A page to start with'}</span>
              {continueTopic && <span>{continueTopic.minutes} minutes</span>}
            </div>
            <p className="home-spotlight-path">{continueSubject.name}<span>/</span>{continueModule.title}</p>
            <h2>{continueTopic.title}</h2>
            <p className="home-spotlight-description">
              {continueTopic.sections.find((section) => section.kind === 'paragraph')?.body ?? continueModule.description}
            </p>
            <a className="home-spotlight-link" href={`#/learn/${continueSubject.id}/${continueModule.id.split('/').at(-1)}/${continueTopic.id}`}>
              Open the note <ArrowRight size={16} />
            </a>
          </div>
          {continueSketch && (
            <div className="home-spotlight-illustration" aria-label="A sketch from this note">
              <span>From the worked example</span>
              <ExampleSketch visual={continueSketch} />
            </div>
          )}
          <span className="home-paper-edge" aria-hidden="true" />
        </section>
      ) : <p>No study notes have been added yet.</p>}

      <section className="home-subjects" aria-labelledby="home-subjects-title">
        <div className="home-subjects-heading">
          <h2 id="home-subjects-title">Your subjects</h2>
          <span>{totalTopics} notes · {totalModules} chapters</span>
        </div>
        <div className="home-subject-list">
          {catalog.map((subject, index) => {
            const topicCount = subject.modules.reduce((sum, item) => sum + item.topics.length, 0)
            const doneCount = subject.modules.reduce((sum, item) => sum + item.topics.filter((topic) => progress.completedTopics.includes(topicKey(subject.id, item.id.split('/').at(-1)!, topic.id))).length, 0)
            const nextModule = subject.modules.find((item) => !progress.completedModules.includes(moduleKey(subject.id, item.id.split('/').at(-1)!)))
            return (
              <a className="home-subject-row" href={`#/subject/${subject.id}`} key={subject.id}>
                <span className="home-subject-number">{String(index + 1).padStart(2, '0')}</span>
                <SubjectGlyph subject={subject} />
                <span className="home-subject-name">
                  <strong>{subject.name}</strong>
                  <small>{nextModule ? nextModule.title : 'All chapter trials passed'}</small>
                </span>
                <span className="home-subject-count">{doneCount}/{topicCount} notes</span>
                <ArrowRight className="home-subject-arrow" size={16} />
              </a>
            )
          })}
        </div>
      </section>
      <p className="home-progress-note">
        {progress.completedTopics.length} of {totalTopics} notes explored
        <span>·</span>
        {progress.completedModules.length} of {totalModules} chapter trials passed
        <span>·</span>
        Saved on this device
      </p>
    </div>
  )
}

function SubjectGlyph({ subject }: { subject: Subject }) {
  return (
    <span className="home-subject-glyph" style={{ '--subject-color': subject.color } as React.CSSProperties} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        {subject.id === 'applied-chemistry' && <>
          <ellipse cx="20" cy="20" rx="15" ry="7" />
          <ellipse cx="20" cy="20" rx="15" ry="7" transform="rotate(60 20 20)" />
          <ellipse cx="20" cy="20" rx="15" ry="7" transform="rotate(120 20 20)" />
          <circle cx="20" cy="20" r="2.4" fill="currentColor" />
        </>}
        {subject.id === 'basic-engineering' && <>
          <path d="M9 30h22M11 30l13-21 8 21" />
          <path d="m18 19 7-10 3 11" />
          <circle cx="25" cy="9" r="2" fill="currentColor" />
        </>}
        {subject.id === 'technical-english' && <>
          <path d="M9 13h22M9 18h16M9 23h22M9 28h13" />
          <path d="M6 10v22h28V10" />
        </>}
        {subject.id === 'multivariable-calculus' && <>
          <ellipse cx="17" cy="22" rx="13" ry="9" />
          <ellipse cx="17" cy="22" rx="8" ry="5" />
          <path d="m17 22 13-13m-5 1h5v5" />
        </>}
      </svg>
    </span>
  )
}

function SubjectMap({ subject, progress }: { subject: Subject; progress: Progress }) {
  const completed = subject.modules.filter((item) => progress.completedModules.includes(moduleKey(subject.id, item.id.split('/').at(-1)!))).length
  const nextIndex = subject.modules.findIndex((item) => !progress.completedModules.includes(moduleKey(subject.id, item.id.split('/').at(-1)!)))
  const allComplete = nextIndex === -1
  const nextModule = subject.modules[nextIndex]
  const mapDescription = allComplete
    ? 'All chapters passed. The full-subject trial is now open.'
    : nextIndex === 0
      ? 'Start with Chapter 01. The next chapter opens after its trial.'
      : `Finish ${subject.modules[nextIndex - 1].title} trial to open ${nextModule.title}.`
  return (
    <div className="map-page">
      <a href="#/home" className="back-link"><ArrowLeft size={14} /> All subjects</a>
      <div className="map-heading">
        <span className="eyebrow"><span className="subject-swatch" style={{ backgroundColor: subject.color }} /> YOUR SUBJECT MAP</span>
        <h1>{subject.name}<span className="heading-period">.</span></h1>
        <p>{mapDescription}</p>
      </div>
      <div className="map-overview">
        <span><strong>{completed.toString().padStart(2, '0')}</strong><small>CHAPTERS COMPLETE</small></span>
        <div className="map-overview-line"><span style={{ width: `${Math.round(completed / subject.modules.length * 100)}%`, backgroundColor: subject.color }} /></div>
        <span><strong>{subject.modules.length.toString().padStart(2, '0')}</strong><small>IN THIS SUBJECT</small></span>
      </div>
      <div className="chapter-map">
        {subject.modules.map((module, index) => {
          const key = moduleKey(subject.id, module.id.split('/').at(-1)!)
          const isDone = progress.completedModules.includes(key)
          const unlocked = index === 0 || progress.completedModules.includes(moduleKey(subject.id, subject.modules[index - 1].id.split('/').at(-1)!))
          const isCurrent = !isDone && index === nextIndex
          const moduleDoneTopics = module.topics.filter((topic) => progress.completedTopics.includes(topicKey(subject.id, module.id.split('/').at(-1)!, topic.id))).length
          return (
            <div className={`chapter-node ${isDone ? 'chapter-done' : ''} ${isCurrent ? 'chapter-current' : ''} ${!unlocked ? 'chapter-locked' : ''}`} key={module.id}>
              {index > 0 && <div className={`map-path ${isDone || isCurrent ? 'path-lit' : ''}`} />}
              <div className="chapter-marker">{isDone ? <Check size={15} /> : !unlocked ? <LockKeyhole size={14} /> : <span>0{index + 1}</span>}</div>
              <div className="chapter-copy">
                <span className="eyebrow">CHAPTER 0{index + 1}{isDone ? ' · COMPLETE' : isCurrent ? ' · UP NEXT' : !unlocked ? ' · NOT YET' : ''}</span>
                <h2>{module.title}</h2>
                <p>{module.description}</p>
                <div className="chapter-meta"><span><BookOpen size={13} /> {module.topics.length} notes</span><span>·</span><span>{moduleDoneTopics} explored</span></div>
              </div>
              <div className="chapter-action">
                {isDone ? <a className="button button-light" href={`#/module/${subject.id}/${module.id.split('/').at(-1)}`}>Revisit <ArrowRight size={14} /></a>
                  : unlocked ? <a className={`button ${isCurrent ? 'button-dark' : 'button-light'}`} href={`#/module/${subject.id}/${module.id.split('/').at(-1)}`}>{isCurrent ? 'Step inside' : 'Explore'} <ArrowRight size={14} /></a>
                    : <span className="locked-caption"><LockKeyhole size={12} /> Finish the chapter before this</span>}
              </div>
            </div>
          )
        })}
        <div className={`final-trial ${allComplete ? 'final-trial-open' : ''}`}>
          <span className="final-seal">{allComplete ? <Sparkles size={17} /> : <LockKeyhole size={16} />}</span>
          <div><span className="eyebrow">THE LAST PAGE</span><h3>Full subject trial</h3><p>{allComplete ? 'Bring it all together. Every chapter, one sitting.' : 'Finish every chapter to open this trial.'}</p></div>
          {allComplete && <a className="button button-dark" href={`#/trial/${subject.id}/full`}>Begin trial <ArrowRight size={14} /></a>}
        </div>
      </div>
    </div>
  )
}

function ModulePage({ subject, module, progress }: { subject: Subject; module: Module; progress: Progress }) {
  const moduleId = module.id.split('/').at(-1)!
  const doneCount = module.topics.filter((topic) => progress.completedTopics.includes(topicKey(subject.id, moduleId, topic.id))).length
  const result = progress.testResults[moduleKey(subject.id, moduleId)]
  return (
    <div className="module-page">
      <a href={`#/subject/${subject.id}`} className="back-link"><ArrowLeft size={14} /> {subject.name} map</a>
      <div className="module-hero">
        <span className="eyebrow"><span className="subject-swatch" style={{ backgroundColor: subject.color }} /> {subject.name.toUpperCase()} <span className="slash">/</span> CHAPTER {moduleId.replace('module-', '')}</span>
        <h1>{module.title}<span className="heading-period">.</span></h1>
        <p>{module.description}</p>
        <div className="module-progress">
          <div className="module-progress-head"><span>YOUR FIELD NOTES</span><span>{doneCount} OF {module.topics.length} EXPLORED</span></div>
          <div className="progress-tickline"><span style={{ width: `${doneCount / module.topics.length * 100}%` }} /></div>
        </div>
      </div>
      <section className="topic-section">
        <div className="section-heading topic-heading"><div><span className="eyebrow">THE NOTES</span><h2>Take a look around</h2></div><span className="topic-count">{module.topics.length.toString().padStart(2, '0')} ENTRIES</span></div>
        <div className="topic-list">
          {module.topics.map((topic, index) => {
            const isDone = progress.completedTopics.includes(topicKey(subject.id, moduleId, topic.id))
            return <a href={`#/learn/${subject.id}/${moduleId}/${topic.id}`} className="topic-row" key={topic.id}>
              <span className={`topic-state ${isDone ? 'topic-state-done' : ''}`}>{isDone ? <Check size={13} /> : <span>{String(index + 1).padStart(2, '0')}</span>}</span>
              <span className="topic-name">{topic.title}{isDone && <small>YOU'VE BEEN HERE</small>}</span>
              <span className="topic-time"><Clock3 size={13} /> {topic.minutes} min</span>
              <ArrowRight className="topic-arrow" size={15} />
            </a>
          })}
        </div>
      </section>
      <section className={`trial-callout ${result ? 'trial-callout-done' : ''}`}>
        <div className="trial-stamp">{result ? <CheckCircle2 size={19} /> : <Compass size={18} />}</div>
        <div className="trial-copy"><span className="eyebrow">{result ? 'CHAPTER TRIAL COMPLETE' : 'WHEN YOU FEEL READY'}</span><h3>{result ? 'You have a score to build on.' : 'Put the pieces together.'}</h3><p>{result ? `Last time: ${result.score} of ${result.total} correct. The notes are always here if you want another pass.` : `${module.questions.length} questions, written from these notes. No timer, no pressure.`}</p></div>
        {module.questions.length > 0
          ? <a className="button button-clay" href={`#/trial/${subject.id}/${moduleId}`}>{result ? 'Try again' : 'Take the trial'} <ArrowRight size={14} /></a>
          : <span className="trial-unavailable">Questions are added after the source notes are reviewed.</span>}
      </section>
    </div>
  )
}

function LearnPage({ subject, module, topicId, progress, patchProgress }: {
  subject: Subject; module: Module; topicId: string; progress: Progress; patchProgress: (update: (current: Progress) => Progress) => void
}) {
  const topicIndex = module.topics.findIndex((topic) => topic.id === topicId)
  const topic = module.topics[topicIndex]
  const [cramMode, setCramMode] = useState(false)
  if (!topic) return <MissingContent onHome={() => go(`/module/${subject.id}/${module.id.split('/').at(-1)}`)} />
  const moduleId = module.id.split('/').at(-1)!
  const isComplete = progress.completedTopics.includes(topicKey(subject.id, moduleId, topic.id))
  const previous = module.topics[topicIndex - 1]
  const next = module.topics[topicIndex + 1]
  const completeTopic = () => {
    patchProgress((current) => ({
      ...current,
      completedTopics: current.completedTopics.includes(topicKey(subject.id, moduleId, topic.id))
        ? current.completedTopics
        : [...current.completedTopics, topicKey(subject.id, moduleId, topic.id)],
      lastStudied: { subjectId: subject.id, moduleId, topicId: topic.id },
    }))
  }
  return (
    <div className="learn-layout">
      <aside className="learn-sidebar">
        <a href={`#/module/${subject.id}/${moduleId}`} className="learn-module-back"><ArrowLeft size={13} /> CHAPTER {moduleId.replace('module-', '')}</a>
        <span className="learn-sidebar-title">{module.title}</span>
        <div className="learn-nav-list">
          {module.topics.map((item, index) => {
            const done = progress.completedTopics.includes(topicKey(subject.id, moduleId, item.id))
            return <a key={item.id} href={`#/learn/${subject.id}/${moduleId}/${item.id}`} className={`learn-nav-item ${item.id === topicId ? 'learn-nav-current' : ''}`}>
              <span className={`learn-nav-num ${done ? 'learn-nav-done' : ''}`}>{done ? <Check size={11} /> : String(index + 1).padStart(2, '0')}</span>
              <span>{item.title}</span>
            </a>
          })}
        </div>
        <button className="cram-toggle" type="button" aria-pressed={cramMode} onClick={() => setCramMode((current) => !current)}>
          <BookOpen size={14} /><span>{cramMode ? 'Full field notes' : 'Quick revision'}</span>{cramMode ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </aside>
      <article className="notes-column">
        <div className="notes-breadcrumb"><a href={`#/subject/${subject.id}`}>{subject.name}</a><span>/</span><a href={`#/module/${subject.id}/${moduleId}`}>{module.title}</a><span>/</span><span>Field notes</span></div>
        <div className="notes-title-block">
          <span className="eyebrow">Note {String(topicIndex + 1).padStart(2, '0')} of {module.topics.length} · {topic.minutes} min</span>
          <h1>{topic.title}<span className="heading-period">.</span></h1>
          <p>{module.description}</p>
          {module.sourceFiles?.some((file) => file.startsWith('CRAMMED demonstration') || file.startsWith('Sample course notes')) && (
            <span className="demo-disclosure">Demo notes · not a course PDF</span>
          )}
        </div>
        {cramMode
          ? <CramSheet topic={topic} />
          : <div className="notes-sections">
            {topic.sections.map((section) => <NoteSection key={section.id} section={section} />)}
          </div>}
        <div className="notes-complete">
          <span className={`complete-check ${isComplete ? 'complete-check-done' : ''}`}>{isComplete ? <Check size={16} /> : <Bookmark size={15} />}</span>
          <div><strong>{isComplete ? 'This note is in the bank.' : 'Got the gist?'}</strong><p>{isComplete ? 'Nice work. It counts toward your chapter.' : 'Mark this one as explored, then take the next small step.'}</p></div>
          <button className={`button ${isComplete ? 'button-light' : 'button-dark'}`} onClick={completeTopic}>{isComplete ? 'Explored' : 'Mark explored'} {isComplete ? <Check size={14} /> : <ArrowRight size={14} />}</button>
        </div>
        <div className="topic-pager">
          {previous ? <a href={`#/learn/${subject.id}/${moduleId}/${previous.id}`}><ChevronLeft size={15} /><span><small>PREVIOUS NOTE</small>{previous.title}</span></a> : <a href={`#/module/${subject.id}/${moduleId}`}><ChevronLeft size={15} /><span><small>BACK TO CHAPTER</small>All field notes</span></a>}
          {next ? <a className="pager-next" href={`#/learn/${subject.id}/${moduleId}/${next.id}`}><span><small>NEXT NOTE</small>{next.title}</span><ChevronRight size={15} /></a> : <a className="pager-next" href={`#/module/${subject.id}/${moduleId}`}><span><small>UP NEXT</small>Chapter trial</span><ChevronRight size={15} /></a>}
        </div>
      </article>
    </div>
  )
}

function NoteSection({ section }: { section: Section }) {
  if (section.kind === 'paragraph') return <section className="note-block"><h2>{section.title}</h2><p className="note-prose">{section.body}</p><SourceLine source={section.source} /></section>
  if (section.kind === 'definition') return <section className="definition-note"><span className="note-label">In one sentence</span><h2>{section.title}</h2><p>{section.body}</p><SourceLine source={section.source} /></section>
  if (section.kind === 'formula') return <section className="formula-note"><span className="note-label">Useful relation</span><h2>{section.title}</h2><pre>{section.body}</pre><SourceLine source={section.source} /></section>
  if (section.kind === 'example') return <section className="example-note"><div><span className="note-label">Worked example</span><p>{section.body}</p>{section.visual && <ExampleSketch visual={section.visual} />}<SourceLine source={section.source} /></div></section>
  if (section.kind === 'trap') return <section className="trap-note"><div><span className="note-label">Common pitfall</span><h2>{section.title}</h2><p>{section.body}</p><SourceLine source={section.source} /></div></section>
  if (section.kind === 'recap') return <section className="recap-note"><h2>Remember</h2><p>{section.body}</p><SourceLine source={section.source} /></section>
  return <section className="note-block"><h2>{section.title}</h2><ul className="note-list">{section.items?.map((item) => <li key={item}><span className="list-dash">—</span>{item}</li>)}</ul><SourceLine source={section.source} /></section>
}

function ExampleSketch({ visual }: { visual: NonNullable<Section['visual']> }) {
  const title = {
    atom: 'A simplified atom: a dense nucleus inside a much larger electron cloud',
    ionic: 'An electron moves from sodium to chlorine, forming oppositely charged ions',
    force: 'A diagonal force split into horizontal and vertical components',
    report: 'A clear report moves from purpose to evidence, meaning, and next step',
    gradient: 'Contour lines and a vector pointing toward the steepest increase',
  }[visual]

  return (
    <figure className={`example-sketch example-sketch-${visual}`}>
      <svg viewBox="0 0 360 132" role="img" aria-label={title}>
        {visual === 'atom' && <>
          <ellipse cx="162" cy="65" rx="75" ry="42" fill="none" stroke="currentColor" strokeDasharray="2 6" />
          <ellipse cx="162" cy="65" rx="54" ry="30" fill="none" stroke="currentColor" strokeDasharray="1 7" opacity=".6" />
          <circle cx="151" cy="65" r="7" fill="currentColor" />
          <circle cx="166" cy="59" r="6" fill="currentColor" opacity=".72" />
          <circle cx="168" cy="72" r="5" fill="currentColor" opacity=".48" />
          <circle cx="224" cy="43" r="3.5" fill="currentColor" />
          <circle cx="104" cy="87" r="3.5" fill="currentColor" />
          <path d="M239 36h38l12-11" fill="none" stroke="currentColor" />
          <path d="M146 78l-18 20H91" fill="none" stroke="currentColor" />
          <text x="292" y="23">electron</text>
          <text x="52" y="106">nucleus</text>
          <text x="275" y="111">not to scale</text>
        </>}
        {visual === 'ionic' && <>
          <text x="33" y="57">Na</text><text x="112" y="57">Cl</text>
          <circle cx="78" cy="47" r="4" fill="currentColor" />
          <path d="M55 79h46" fill="none" stroke="currentColor" strokeDasharray="3 5" />
          <path d="m96 74 7 5-7 5" fill="none" stroke="currentColor" />
          <text x="35" y="103">one electron moves</text>
          <path d="M201 44h55" fill="none" stroke="currentColor" opacity=".4" />
          <text x="205" y="35">attract</text>
          <circle cx="219" cy="77" r="25" fill="none" stroke="currentColor" />
          <circle cx="288" cy="77" r="25" fill="none" stroke="currentColor" />
          <text x="210" y="82">Na⁺</text><text x="279" y="82">Cl⁻</text>
        </>}
        {visual === 'force' && <>
          <path d="M65 105H294M86 115V22" fill="none" stroke="currentColor" opacity=".45" />
          <path d="M96 102 223 37" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m215 37 11-2-4 10" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M96 102H223M223 102V37" fill="none" stroke="currentColor" strokeDasharray="4 5" />
          <text x="147" y="119">Fₓ</text><text x="230" y="76">Fᵧ</text><text x="171" y="54">F</text>
          <text x="100" y="90">30°</text>
        </>}
        {visual === 'report' && <>
          <path d="M37 66H320" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {[37, 127, 217, 307].map((x) => <circle key={x} cx={x} cy="66" r="5" fill="currentColor" />)}
          <text x="19" y="39">Purpose</text><text x="100" y="39">Evidence</text>
          <text x="204" y="39">Meaning</text><text x="287" y="39">Next step</text>
          <text x="20" y="98">why</text><text x="108" y="98">what</text>
          <text x="204" y="98">so what</text><text x="285" y="98">now what</text>
        </>}
        {visual === 'gradient' && <>
          <ellipse cx="145" cy="71" rx="102" ry="45" fill="none" stroke="currentColor" opacity=".35" />
          <ellipse cx="145" cy="71" rx="72" ry="32" fill="none" stroke="currentColor" opacity=".55" />
          <ellipse cx="145" cy="71" rx="42" ry="19" fill="none" stroke="currentColor" />
          <path d="M145 71 251 25" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m242 25 12-2-4 11" fill="none" stroke="currentColor" strokeWidth="2" />
          <text x="262" y="22">steepest rise</text><text x="120" y="76">you are here</text>
        </>}
      </svg>
      <figcaption>{visual === 'atom' ? 'Not to scale' : visual === 'report' ? 'A useful order, not a required template' : 'Sketch of the relationship'}</figcaption>
    </figure>
  )
}

function SourceLine({ source }: { source?: { file: string; page?: number } }) {
  return source ? <span className="source-line">Source · {source.file}{source.page ? ` · p. ${source.page}` : ''}</span> : null
}

function CramSheet({ topic }: { topic: Topic }) {
  const recap = topic.sections.find((section) => section.kind === 'recap')
  const example = topic.sections.find((section) => section.kind === 'example')
  const bullets = topic.sections.filter((section) => section.kind === 'bullets').flatMap((section) => section.items ?? [])
  const formulas = topic.sections.filter((section) => section.kind === 'formula')
  const traps = topic.sections.filter((section) => section.kind === 'trap')
  const core = topic.sections.find((section) => section.kind === 'paragraph')
  return <section className="cram-sheet">
    <div className="cram-sheet-head"><span className="eyebrow">Quick revision</span></div>
    {core && <div className="cram-core"><span className="note-label">Core idea</span><p>{core.body}</p></div>}
    {bullets.length > 0 && <div className="cram-bullets"><span className="note-label">Keep in mind</span><ul>{bullets.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul></div>}
    {formulas.length > 0 && <div className="cram-formula"><span className="note-label">Formula</span>{formulas.map((item) => <pre key={item.id}>{item.body}</pre>)}</div>}
    {example && <div className="cram-example"><span className="note-label">Worked example</span><p>{example.body}</p>{example.visual && <ExampleSketch visual={example.visual} />}</div>}
    {traps.length > 0 && <div className="cram-warning"><span className="note-label">Common pitfall</span>{traps.map((item) => <p key={item.id}>{item.body}</p>)}</div>}
    {recap && <div className="cram-recap"><span className="note-label">Remember</span><p>{recap.body}</p></div>}
  </section>
}

function QuizPage({ subject, module, patchProgress }: { subject: Subject; module: Module; patchProgress: (update: (current: Progress) => Progress) => void }) {
  const isFull = module.id === 'full'
  const modules = isFull ? subject.modules : [module]
  const questions = useMemo(() => modules.flatMap((item) => item.questions.map((question) => ({ ...question, moduleId: item.id.split('/').at(-1)! }))), [modules])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const current = questions[index]
  if (!current) return <MissingContent onHome={() => go('/home')} />
  const isCorrect = selected === current.answer
  const score = Object.entries(answers).filter(([questionId, answer]) => questions.find((question) => question.id === questionId)?.answer === answer).length
  const confirm = () => {
    if (selected === null || answered) return
    const nextAnswers = { ...answers, [current.id]: selected }
    setAnswers(nextAnswers)
    setAnswered(true)
    if (index === questions.length - 1) {
      const finalScore = Object.entries(nextAnswers).filter(([questionId, answer]) => questions.find((question) => question.id === questionId)?.answer === answer).length
      const testId = isFull ? `${subject.id}/full` : moduleKey(subject.id, module.id.split('/').at(-1)!)
      patchProgress((previous) => {
        const completedModules = new Set(previous.completedModules)
        if (!isFull && finalScore / questions.length >= 0.6) completedModules.add(moduleKey(subject.id, module.id.split('/').at(-1)!))
        return {
          ...previous,
          completedModules: [...completedModules],
          testResults: {
            ...previous.testResults,
            [testId]: { score: finalScore, total: questions.length, completedAt: new Date().toISOString(), answers: nextAnswers },
          },
        }
      })
      window.setTimeout(() => go(`/results/${subject.id}/${isFull ? 'full' : module.id.split('/').at(-1)}`), 320)
    }
  }
  const next = () => {
    if (!answered) return
    setIndex((currentIndex) => currentIndex + 1)
    setSelected(null)
    setAnswered(false)
  }
  const title = isFull ? 'Full subject trial' : `${module.title} trial`
  return (
    <div className="quiz-page">
      <a href={isFull ? `#/subject/${subject.id}` : `#/module/${subject.id}/${module.id.split('/').at(-1)}`} className="back-link"><ArrowLeft size={14} /> Leave the trial</a>
      <div className="quiz-kicker"><span className="trial-seal"><Compass size={17} /></span><div><span className="eyebrow">{isFull ? subject.name.toUpperCase() : 'CHAPTER TRIAL'} <span className="slash">/</span> {questions.length} QUESTIONS · NO TIMER</span><h1>{title}<span className="heading-period">.</span></h1></div></div>
      <div className="quiz-progress-meta"><span>QUESTION <strong>{String(index + 1).padStart(2, '0')}</strong> <span className="slash">/</span> {String(questions.length).padStart(2, '0')}</span><span>{score} so far <span className="quiz-meta-dot">·</span> take your time</span></div>
      <div className="quiz-progress-track">{questions.map((question, i) => <span key={question.id} className={`${i < index ? 'quiz-segment-past' : ''} ${i === index ? 'quiz-segment-current' : ''}`} />)}</div>
      <div className="question-origin"><span className="origin-pin" />{subject.name} <span>/</span> {questions.find((question) => question.id === current.id) && modules.find((item) => item.id.endsWith(current.moduleId))?.title} <span>/</span> {getTopicTitle(modules, current.topicId)}</div>
      <section className="question-card" aria-live="polite">
        <span className="question-number">Q{String(index + 1).padStart(2, '0')}</span>
        <h2>{current.prompt}</h2>
        <div className="answer-options">
          {current.options.map((option, optionIndex) => {
            const chosen = selected === optionIndex
            const correct = answered && optionIndex === current.answer
            const wrong = answered && chosen && !isCorrect
            return <button key={option} className={`answer-option ${chosen ? 'answer-selected' : ''} ${correct ? 'answer-correct' : ''} ${wrong ? 'answer-wrong' : ''}`} onClick={() => !answered && setSelected(optionIndex)} disabled={answered}>
              <span className="answer-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>
              {correct && <CheckCircle2 className="answer-check" size={17} />}
            </button>
          })}
        </div>
        {answered && <div className={`answer-explanation ${isCorrect ? 'explanation-correct' : 'explanation-wrong'}`}><span>{isCorrect ? 'That’s it.' : 'Not quite — keep this bit.'}</span><p>{current.explanation}</p></div>}
        <div className="question-actions">
          <span className="quiz-hint">{answered ? 'One question at a time.' : 'Trust your first instinct.'}</span>
          {!answered ? <button className="button button-dark" disabled={selected === null} onClick={confirm}>Lock it in <ArrowRight size={14} /></button>
            : index < questions.length - 1 ? <button className="button button-dark" onClick={next}>Next question <ArrowRight size={14} /></button>
              : <span className="last-answer-note"><Check size={14} /> All done. Gathering your notes…</span>}
        </div>
      </section>
      <div className="quiz-bottom-note">Missed questions link back to the note they came from.</div>
    </div>
  )
}

function getTopicTitle(modules: Module[], topicId: string): string {
  return modules.flatMap((item) => item.topics).find((topic) => topic.id === topicId)?.title ?? 'Field notes'
}

function ResultsPage({ subject, module, progress }: { subject: Subject; module: Module; progress: Progress }) {
  const isFull = module.id === 'full'
  const modules = isFull ? subject.modules : [module]
  const key = isFull ? `${subject.id}/full` : moduleKey(subject.id, module.id.split('/').at(-1)!)
  const result = progress.testResults[key]
  if (!result) return <MissingContent onHome={() => go(isFull ? `/subject/${subject.id}` : `/module/${subject.id}/${module.id.split('/').at(-1)}`)} />
  const allQuestions = modules.flatMap((item) => item.questions)
  const incorrectIds = Object.entries(result.answers).filter(([id, answer]) => allQuestions.find((question) => question.id === id)?.answer !== answer).map(([id]) => id)
  const weakTopics = [...new Set(incorrectIds.map((id) => allQuestions.find((question) => question.id === id)?.topicId).filter((topicId): topicId is string => !!topicId))]
  const percent = Math.round(result.score / result.total * 100)
  const pass = percent >= 60
  return (
    <div className="results-page">
      <a href={isFull ? `#/subject/${subject.id}` : `#/module/${subject.id}/${module.id.split('/').at(-1)}`} className="back-link"><ArrowLeft size={14} /> {isFull ? 'Subject map' : 'Back to chapter'}</a>
      <div className="results-main">
        <span className="eyebrow"><span className="eyebrow-mark">✳</span> {isFull ? 'SUBJECT TRIAL' : 'CHAPTER TRIAL'} · WRAPPED UP</span>
        <h1>{percent === 100 ? 'Beautifully done' : pass ? 'That’s a solid start' : 'A good first pass'}<span className="heading-period">.</span></h1>
        <p className="results-subtitle">The useful part is knowing what to look at next.</p>
        <div className="results-score">
          <div className="score-figure"><strong>{result.score}</strong><span>/ {result.total}</span></div>
          <div className="score-divider" />
          <div className="score-detail"><span className="eyebrow">YOUR SCORE</span><strong>{percent}%</strong><small>{pass ? 'Chapter unlocked' : 'One more pass will open the next chapter'}</small></div>
          <div className={`score-stamp ${pass ? '' : 'score-stamp-soft'}`}>{pass ? <CheckCircle2 size={23} /> : <Feather size={21} />}</div>
        </div>
        {weakTopics.length > 0 ? <section className="weak-section"><div className="section-heading"><div><span className="eyebrow">A PLACE TO RETURN TO</span><h2>Revisit these notes</h2></div><span className="weak-count">{weakTopics.length} {weakTopics.length === 1 ? 'NOTE' : 'NOTES'}</span></div>
          <div className="weak-list">{weakTopics.map((topicId) => {
            const sourceModule = modules.find((item) => item.topics.some((topic) => topic.id === topicId))
            const topic = sourceModule?.topics.find((item) => item.id === topicId)
            const slug = sourceModule?.id.split('/').at(-1)
            return topic && slug ? <a href={`#/learn/${subject.id}/${slug}/${topic.id}`} key={topicId}><span className="weak-leaf">↗</span><span>{topic.title}<small>{sourceModule?.title}</small></span><ArrowRight size={14} /></a> : null
          })}</div>
        </section> : <div className="all-correct-note"><Sparkles size={16} /> Nothing to revisit this round. Let it settle in.</div>}
        <div className="results-actions">
          <a className="button button-dark" href={isFull ? `#/subject/${subject.id}` : `#/module/${subject.id}/${module.id.split('/').at(-1)}`}>{isFull ? 'Back to the map' : 'Keep exploring'} <ArrowRight size={14} /></a>
          <a className="button button-light" href={`#/trial/${subject.id}/${isFull ? 'full' : module.id.split('/').at(-1)}`}>Another go <ChevronRight size={14} /></a>
        </div>
      </div>
    </div>
  )
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const dialogRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const normalized = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!normalized) return []
    const matches: { label: string; detail: string; href: string; kind: string }[] = []
    for (const subject of catalog) {
      if (subject.name.toLowerCase().includes(normalized)) matches.push({ label: subject.name, detail: 'Subject map', href: `#/subject/${subject.id}`, kind: 'SUBJECT' })
      for (const module of subject.modules) {
        const moduleId = module.id.split('/').at(-1)!
        if (module.title.toLowerCase().includes(normalized)) matches.push({ label: module.title, detail: `${subject.name} · Chapter`, href: `#/module/${subject.id}/${moduleId}`, kind: 'CHAPTER' })
        for (const topic of module.topics) {
          const sectionMatches = topic.sections.filter((section) => `${section.title} ${section.body ?? ''} ${(section.items ?? []).join(' ')}`.toLowerCase().includes(normalized))
          if (topic.title.toLowerCase().includes(normalized) || sectionMatches.length) matches.push({ label: topic.title, detail: `${subject.name} · ${module.title}${sectionMatches[0] ? ` · ${sectionMatches[0].title}` : ''}`, href: `#/learn/${subject.id}/${moduleId}/${topic.id}`, kind: sectionMatches.length ? 'NOTE' : 'TOPIC' })
        }
      }
    }
    return matches.slice(0, 8)
  }, [normalized])
  useEffect(() => {
    const previousFocus = document.activeElement
    inputRef.current?.focus()
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', keepFocusInside)
    return () => {
      document.removeEventListener('keydown', keepFocusInside)
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])
  return <div className="search-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className="search-dialog" role="dialog" aria-modal="true" aria-label="Search the study shelf">
      <div className="search-input-row"><Search size={19} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “isotopes” or “resultant force”…" aria-label="Search study notes" /><kbd>ESC</kbd><button className="icon-button search-close" onClick={onClose} aria-label="Close search"><X size={17} /></button></div>
      <div className="search-results">
        {!normalized && <div className="search-empty"><span className="search-empty-flower">✳</span><p>Find a subject, a chapter, or a little thing you half-remember.</p><small>NOTES ARE SEARCHED BY THEIR CONTENT, TOO</small></div>}
        {normalized && results.length === 0 && <div className="search-empty"><p>Nothing on the shelf for “{query}” just yet.</p><small>TRY ANOTHER WORD OR FORMULA</small></div>}
        {results.map((result) => <a className="search-result" href={result.href} key={result.href} onClick={onClose}><span className="search-result-kind">{result.kind}</span><span className="search-result-copy"><strong>{result.label}</strong><small>{result.detail}</small></span><ArrowUpRight size={15} /></a>)}
      </div>
      <div className="search-foot"><span><Command size={11} /> K to open</span><span>LOOKING THROUGH YOUR FIELD NOTES</span></div>
    </section>
  </div>
}

function EmptyState() {
  return <div className="empty-screen"><div className="empty-card"><span className="empty-flower">✳</span><span className="eyebrow">A FRESH PAGE</span><h1>Your shelf is waiting.</h1><p>Add a subject folder to <code>content/subjects</code> and place PDFs in each module's <code>source/</code> folder. Run <code>npm run ingest</code> to make a reviewable module draft from the extracted text.</p><p className="empty-foot">No notes are generated or published until they have been reviewed and added to the content folder.</p></div></div>
}

function MissingContent({ onHome }: { onHome: () => void }) {
  return <div className="missing-content"><span className="eyebrow">THIS PAGE ISN'T IN THE NOTES</span><h2>Looks like a page went missing.</h2><p>It may have moved, or the content hasn't been added yet.</p><button className="button button-dark" onClick={onHome}>Back to the study nook <ArrowRight size={14} /></button></div>
}

function LockedContent({ subject, module, isFull }: { subject: Subject; module?: Module; isFull: boolean }) {
  return <div className="missing-content">
    <span className="eyebrow">A LITTLE FURTHER DOWN THE PATH</span>
    <h2>{isFull ? 'The final trial is still resting.' : module ? `${module.title} is not open yet.` : 'That chapter is not on the map yet.'}</h2>
    <p>{isFull ? 'Finish each chapter trial to bring the full subject together.' : 'Complete the previous chapter trial to open this part of the map.'}</p>
    <a className="button button-dark" href={`#/subject/${subject.id}`}>Back to {subject.name} map <ArrowRight size={14} /></a>
  </div>
}

export default App
