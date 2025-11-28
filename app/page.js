// pga-pool-tracker/app/page.js
// Final integration of all four features: Leaderboards, Status, and Odds.

import { processPoolData } from './utils/data-processor';
import { getTourStatus, getGolferOdds } from './utils/scraper';

// --- HELPER FUNCTION: Format currency for display (e.g., $10,500,000)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// --- LEADERBOARD COMPONENT (Displays the data in a table)
// (This component is unchanged from the last step)
const LeaderboardTable = ({ data, type, maxWinnings }) => {
  const isTeam = type === 'team';

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
        {isTeam ? '🥇 Season Team Leaderboard' : '🏌️ Player Performance Leaderboard'}
      </h2>
      <table className="min-w-full divide-y divide-gray-700">
        <thead>
          <tr className="text-gray-400 uppercase text-xs">
            <th className="px-3 py-2 text-left">Rank</th>
            <th className="px-3 py-2 text-left">{isTeam ? 'Owner (Team)' : 'Player/Slot'}</th>
            <th className="px-3 py-2 text-right">Winnings</th>
            {!isTeam && <th className="px-3 py-2 text-left hidden sm:table-cell">Owner</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {data.map((item, index) => {
            const rank = index + 1;
            const winnings = item.winnings;
            const barWidth = isTeam ? item.winnings_pct * 100 : (winnings / maxWinnings) * 100;
            const rankColor = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-white';
            const bgColor = isTeam ? 'bg-indigo-600' : 'bg-green-600';

            return (
              <tr key={index} className="hover:bg-gray-700">
                <td className={`px-3 py-2 whitespace-nowrap text-lg font-extrabold ${rankColor}`}>{rank}</td>
                <td className="px-3 py-2 whitespace-nowrap font-medium text-white">
                  {isTeam ? item.owner : item.player}
                  {/* Visual Bar - Only for Team Leaderboard for impact */}
                  {isTeam && (
                    <div className="mt-1 h-2 bg-gray-600 rounded-full">
                      <div 
                        className={`h-2 rounded-full ${bgColor}`} 
                        style={{ width: `${barWidth}%` }}
                        aria-label={`Progress: ${Math.round(barWidth)}%`}
                      ></div>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-lg text-green-400">
                  {formatCurrency(winnings)}
                </td>
                {!isTeam && (
                  <td className="px-3 py-2 whitespace-nowrap text-gray-400 hidden sm:table-cell">
                    {item.owner}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};


// --- ODDS DISPLAY COMPONENT ---
const OddsDisplay = ({ odds, playerLeaderboard }) => {
    if (!odds || odds.length === 0) return null;

    // Filter odds to only show players who are currently in the user's pool (Keepers or OAD slots)
    const poolPlayerNames = playerLeaderboard.map(p => p.player);
    const filteredOdds = odds.filter(odd => poolPlayerNames.includes(odd.player));

    if (filteredOdds.length === 0) return null;

    return (
        <div className="mt-8 max-w-7xl mx-auto">
            <h3 className="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-700 pb-2">
                💰 Winnings Odds for Selected Players
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredOdds.slice(0, 18).map((odd, index) => ( // Display top 18 relevant odds
                    <div key={index} className="bg-gray-700 p-3 rounded-lg text-center shadow-md">
                        <p className="font-semibold text-white">{odd.player}</p>
                        <p className="text-lg font-mono text-red-400">{odd.odds}</p>
                    </div>
                ))}
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">Odds shown are typically updated Mon-Wed and provided by GolfOdds.com.</p>
        </div>
    );
};

// pga-pool-tracker/app/page.js (Add this component before the Home function)

// --- LIVE LEADERBOARD DISPLAY COMPONENT ---
const LiveLeaderboardDisplay = ({ liveData, poolPlayers }) => {
    if (!liveData.tournamentName || liveData.players.length === 0) {
        // Display status message if no data is available
        return (
            <div className="bg-gray-800 p-4 rounded-lg text-center my-8 shadow-xl">
                <p className="text-lg text-gray-400">
                    {liveData.status === "Error fetching live tournament data." 
                        ? liveData.status 
                        : "Tournament Leaderboard will appear here when an event is live."}
                </p>
            </div>
        );
    }

    // 1. Create a simple array of all player names in the pool (Owners/Keepers/OADs)
    const poolPlayerNames = poolPlayers.map(p => p.player.toUpperCase());
    
    // 2. Filter the live leaderboard to include only players in the pool
    // Note: We need a robust check, as names like "TYLER OAD" won't match "Scottie Scheffler".
    // For now, we rely on the owner to update the OAD slot name in the CSV to match the player's name.
    const filteredLeaderboard = liveData.players.filter(livePlayer => {
        // Use a simple partial match for robustness
        return poolPlayerNames.some(poolName => 
            livePlayer.name.toUpperCase().includes(poolName) || 
            poolName.includes(livePlayer.name.toUpperCase())
        );
    });

    if (filteredLeaderboard.length === 0) {
        return (
            <div className="bg-gray-800 p-4 rounded-lg text-center my-8 shadow-xl">
                <p className="text-lg text-gray-400">
                    {liveData.tournamentName} is {liveData.status}. None of your players are active yet.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto my-8">
            <h2 className="text-3xl font-extrabold text-white mb-2">
                🏆 Live Tournament: {liveData.tournamentName}
            </h2>
            <p className="text-lg text-gray-400 mb-4">
                Status: <span className="font-semibold text-green-400">{liveData.status}</span> 
                (Updates with every page load)
            </p>
            
            <div className="bg-gray-800 p-4 rounded-lg shadow-xl">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                        <tr className="text-gray-400 uppercase text-xs">
                            <th className="px-3 py-2 text-left">Pos</th>
                            <th className="px-3 py-2 text-left">Player</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">Score</th>
                            <th className="px-3 py-2 text-right">Money</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredLeaderboard.map((player, index) => (
                            <tr key={index} className="hover:bg-gray-700">
                                <td className="px-3 py-2 whitespace-nowrap text-lg font-bold text-yellow-400">{player.position}</td>
                                <td className="px-3 py-2 whitespace-nowrap font-medium text-white">{player.name}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-center hidden sm:table-cell">{player.score}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-lg text-green-400">
                                    {formatCurrency(player.money)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT (Runs the data fetching)
export default async function Home() {
  // --- Next.js Server-Side Data Fetching ---

// Run all four data processes concurrently for speed!
const [data, tourStatus, golferOdds, liveLeaderboardData] = await Promise.all([ // <--- ADD liveLeaderboardData HERE
    processPoolData(),
    getTourStatus(),
    getGolferOdds(),
    getTournamentLeaderboard(), // <--- ADD NEW FUNCTION HERE
]);

  // Find the highest winnings for the bar chart scaling
  const maxTeamWinnings = data.teamLeaderboard.length > 0 ? data.teamLeaderboard[0].winnings : 1;
  const maxPlayerWinnings = data.playerLeaderboard.length > 0 ? data.playerLeaderboard[0].winnings : 1;
  
  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      
      {/* --- STATUS BANNER (PGA Tour Status) --- */}
      <div className="bg-blue-600 p-3 rounded-lg text-center font-semibold mb-8 shadow-lg">
        {tourStatus}
      </div>

{/* --- HEADER --- */}
      <header className="mb-10 text-center">
        {/* ... existing header code ... */}
      </header>

      {/* --- NEW LIVE TOURNAMENT LEADERBOARD --- */}
      <LiveLeaderboardDisplay 
        liveData={liveLeaderboardData} 
        poolPlayers={data.playerLeaderboard} 
      />

      {/* --- LEADERBOARD GRIDS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {/* ... existing LeaderboardTable components ... */}
      </div>

      {/* --- HEADER --- */}
      <header className="mb-10 text-center">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
          PGA Pool Tracker 🏆
        </h1>
        <p className="text-gray-400 mt-2">
          Tracking {data.teamLeaderboard.length} Owners across {formatCurrency(data.totalPoolWinnings)} in winnings.
        </p>
      </header>

      {/* --- LEADERBOARD GRIDS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        
        {/* Team Leaderboard (Left/Top) */}
        <LeaderboardTable 
          data={data.teamLeaderboard} 
          type="team" 
          maxWinnings={maxTeamWinnings} 
        />
        
        {/* Player Leaderboard (Right/Bottom) */}
        <LeaderboardTable 
          data={data.playerLeaderboard} 
          type="player" 
          maxWinnings={maxPlayerWinnings} 
        />

      </div>

      {/* --- ODDS SECTION --- */}
      <OddsDisplay odds={golferOdds} playerLeaderboard={data.playerLeaderboard} />

      <div className="max-w-7xl mx-auto mt-8 p-4 text-center">
        <p className="text-xs text-gray-500">Last Data Pull: {new Date().toLocaleTimeString()} (Data is updated with every page load)</p>
      </div>
    </main>
  );
}