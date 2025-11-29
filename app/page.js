// pga-pool-tracker/app/page.js

// Force Next.js to render this page dynamically at request time
export const dynamic = 'force-dynamic'; 

import { processPoolData, getOwnerColor } from './utils/data-processor';
// Final integration of all four features: Leaderboards, Status, and Odds.
import { getTourStatus, getGolferOdds, getTournamentLeaderboard } from './utils/scraper';

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
// pga-pool-tracker/app/page.js

// Make sure getOwnerColor is imported at the top of the file!
// import { processPoolData, getOwnerColor } from './utils/data-processor'; 

const LeaderboardTable = ({ title, leaderboardData, showOwners = true }) => {
    // 1. Find the maximum winnings (Base for 100% width)
    const validData = Array.isArray(leaderboardData) ? leaderboardData : []; 

// Calculate max winnings safely
const maxWinnings = validData.length > 0 ? validData[0].winnings : 0;
    
    // 2. Calculate the square root of the max winnings for non-linear scaling
    const maxRoot = Math.sqrt(maxWinnings);

    // Helper function to render table headers based on the leaderboard type
    const TableHeaders = ({ isTeam }) => (
        <thead className="text-gray-400 uppercase text-sm border-b border-gray-700">
            <tr>
                <th className="px-6 py-3 text-left w-12">Rank</th>
                <th className="px-6 py-3 text-left w-1/3">{isTeam ? 'Team' : 'Player/Slot'}</th>
                {isTeam ? null : <th className="px-6 py-3 text-left w-1/4">Owner</th>}
                <th className="px-6 py-3 text-right">Winnings</th>
            </tr>
        </thead>
    );

    // Determine if this is the Team Leaderboard
    const isTeamLeaderboard = title.includes("Team");
    
    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-xl h-full flex flex-col">
            <h2 className="text-3xl font-extrabold text-white mb-4">
                {title}
            </h2>

            <div className="flex-grow overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <TableHeaders isTeam={isTeamLeaderboard} />
                    
                    <tbody className="divide-y divide-gray-700">
                        {validData.map((entry, index) => {
                            // --- NEW SCALING LOGIC ---
                            let barWidth = 0;
                            if (maxRoot > 0) {
                                // Calculate the width percentage based on the square roots
                                const entryRoot = Math.sqrt(entry.winnings);
                                barWidth = (entryRoot / maxRoot) * 100;
                            }
                            // -------------------------

                            // Determine the owner for color lookup
                            const ownerForColor = entry.owner || entry.name;
                            const ownerColorClass = getOwnerColor(ownerForColor);

                            return (
                                <tr 
                                    key={entry.name} 
                                    className={`hover:bg-gray-700 border-l-4 ${ownerColorClass}`} // 👈 Color Border
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-xl font-bold">
                                        {index + 1}
                                    </td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap text-xl font-bold">
                                        {/* Apply Text Color to the Team/Player Name */}
                                        <span className={`${ownerColorClass}`}>{entry.name}</span> 
                                    </td>

                                    {/* Owner Column (Only for Player Performance) */}
                                    {isTeamLeaderboard ? null : (
                                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-400">
                                            {entry.owner}
                                        </td>
                                    )}

                                    {/* Winnings Column with Bar */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="relative h-6 flex items-center">
                                            {/* Applied the scaled width */}
                                            <div 
                                                className="absolute top-0 left-0 h-full bg-green-700 opacity-60 rounded-sm" 
                                                style={{ width: `${barWidth.toFixed(2)}%` }} 
                                            />
                                            {/* Winnings text overlay */}
                                            <span className="relative z-10 w-full font-mono text-lg text-green-400">
                                                {formatCurrency(entry.winnings)}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
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
    const livePlayers = Array.isArray(liveData.players) ? liveData.players : []; 

const filteredLeaderboard = livePlayers.filter(livePlayer => {
    // Add safety checks for player name existence
    const livePlayerName = livePlayer.name ? livePlayer.name.toUpperCase() : '';
    
    return poolPlayerNames.some(poolName => 
        // Ensure poolName and livePlayerName are non-empty strings before using includes
        (livePlayerName && livePlayerName.includes(poolName)) || 
        (poolName && poolName.includes(livePlayerName))
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