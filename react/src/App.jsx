import IplTeamsSection from './components/IplTeamsSection'
import PlayerCareerArc from './components/PlayerCareerArc'
import './App.css'

const demoAuction = [
  {
    playerName: 'Sample Star',
    team: 'RCB',
    season: 2018,
    role: 'Batter',
    auctionPriceCr: 11.5,
  },
  {
    playerName: 'Sample Star',
    team: 'RCB',
    season: 2019,
    role: 'Batter',
    retained: true,
    retentionPriceCr: 12.25,
  },
  {
    playerName: 'Sample Star',
    team: 'RCB',
    season: 2021,
    role: 'Batter',
    auctionPriceCr: 14.25,
  },
  {
    playerName: 'Sample Star',
    team: 'RCB',
    season: 2023,
    role: 'Batter',
    auctionPriceCr: 10.75,
  },
  {
    playerName: 'Spin Wizard',
    team: 'CSK',
    season: 2022,
    role: 'Bowler',
    auctionPriceCr: 4.4,
  },
  {
    playerName: 'Spin Wizard',
    team: 'CSK',
    season: 2023,
    role: 'Bowler',
    retained: true,
    retentionPriceCr: 6.0,
  },
  {
    playerName: 'Spin Wizard',
    team: 'CSK',
    season: 2024,
    role: 'Bowler',
    auctionPriceCr: 7.25,
  },
]

const demoPerformance = [
  { playerName: 'Sample Star', season: 2018, runs: 480, matches: 14 },
  { playerName: 'Sample Star', season: 2019, runs: 412, matches: 14 },
  { playerName: 'Sample Star', season: 2021, runs: 405, matches: 14 },
  { playerName: 'Sample Star', season: 2023, runs: 639, matches: 14 },
  { playerName: 'Spin Wizard', season: 2022, wickets: 18, matches: 14 },
  { playerName: 'Spin Wizard', season: 2023, wickets: 22, matches: 14 },
  { playerName: 'Spin Wizard', season: 2024, wickets: 20, matches: 14 },
]

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

      <PlayerCareerArc auctionData={demoAuction} performanceData={demoPerformance} />

      <IplTeamsSection />
    </div>
  )
}

export default App
