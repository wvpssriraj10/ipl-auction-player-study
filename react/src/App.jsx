import IplTeamsSection from './components/IplTeamsSection'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <p className="app__eyebrow">IPL auction player study</p>
        <h1 className="app__title">Franchise reference</h1>
        <p className="app__subtitle">
          Team copy and imagery from <code>src/assets</code> — backgrounds are
          scaled to cover, lightly blurred, and dimmed so text stays clear.
        </p>
      </header>

      <IplTeamsSection />
    </div>
  )
}

export default App
