// pga-pool-tracker/src/app/utils/data-processor.js

// NOTE: This function requires the 'papaparse' library, which we will install next.
import Papa from 'papaparse';

// Your public Google Sheet CSV link
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQRtmSFzVsj_BXPJacbEZuRNGb6YVM0Y4xJrD0zpPecznFWc1SILPo4zfobFcPehMGd-ZVo-XA9nALT/pub?gid=1729998417&single=true&output=csv';

/**
 * Fetches and processes the raw CSV data into two sorted leaderboards.
 * @returns {{teamLeaderboard: Array, playerLeaderboard: Array, totalPoolWinnings: number}}
 */
export async function processPoolData() {
    try {
        // 1. Fetch the CSV data
        const response = await fetch(CSV_URL);
        const csvText = await response.text();

        // 2. Parse the CSV text into structured JavaScript objects
        // The Papa.parse library is designed to handle this efficiently.
        const parsedResult = Papa.parse(csvText, { 
            header: true, 
            skipEmptyLines: true,
            // Custom transform to clean the WINNINGS column immediately
            transform: (value, field) => {
                if (field === 'WINNINGS') {
                    // Remove '$' and ',' then parse as a float (number)
                    return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
                }
                return value.trim();
            }
        });

        const rawData = parsedResult.data;

        // Initialize accumulators
        const ownerTotals = {};
        const playerTotals = {};
        let totalPoolWinnings = 0;
        
        // 3. Process each raw data entry
        rawData.forEach(entry => {
            const winnings = entry.WINNINGS;
            
            // Skip entries with zero winnings or missing owner/player data
            if (winnings === 0 || !entry.OWNER || !entry.PLAYER) return;

            totalPoolWinnings += winnings;
            const owner = entry.OWNER;
            const player = entry.PLAYER;

            // A. Calculate Owner Totals (Team Leaderboard)
            // Keeper Winnings and OAD Slot Winnings are all summed under the Owner's name.
            ownerTotals[owner] = (ownerTotals[owner] || 0) + winnings;

            // B. Calculate Player Totals (Golfer Performance Leaderboard)
            // Each unique player/slot is its own entry (e.g., 'TYLER OAD' is one entry)
            playerTotals[player] = {
                winnings: (playerTotals[player]?.winnings || 0) + winnings,
                owner: owner
            };
        });

        // 4. Transform accumulated objects into sorted arrays for display

        // --- Team Leaderboard ---
        const teamLeaderboard = Object.keys(ownerTotals).map(owner => ({
            owner,
            winnings: ownerTotals[owner],
            // Calculate percentage for the visual bar charts
            winnings_pct: ownerTotals[owner] / totalPoolWinnings 
        })).sort((a, b) => b.winnings - a.winnings); // Sort by highest winnings

        // --- Player Leaderboard ---
        const playerLeaderboard = Object.keys(playerTotals).map(player => ({
            player,
            winnings: playerTotals[player].winnings,
            owner: playerTotals[player].owner
        })).sort((a, b) => b.winnings - a.winnings); // Sort by highest winnings

        // 5. Return the structured data
        return {
            teamLeaderboard,
            playerLeaderboard,
            totalPoolWinnings,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error processing pool data:", error);
        return { teamLeaderboard: [], playerLeaderboard: [], totalPoolWinnings: 0 };
    }
}