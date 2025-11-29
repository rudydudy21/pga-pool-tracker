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
        
        // A. Calculate Owner Totals (Team Leaderboard) - FINAL FIX FOR 8 ENTRIES
        let ownerKey = owner;
        
        // CHECK 1: If the owner's name includes " OAD", strip it to group totals.
        // This handles cases where an Owner is named 'CAM OAD' or 'TYLER OAD' in the raw data.
        if (ownerKey.toUpperCase().includes(" OAD")) {
            // Trim the " OAD" part from the key
            ownerKey = ownerKey.substring(0, ownerKey.toUpperCase().lastIndexOf(" OAD"));
        }
        
        // CHECK 2: If the player name is an OAD placeholder, ensure we still use the correct ownerKey
        // (This handles keepers, which already have the correct owner name)
        
        ownerTotals[ownerKey] = (ownerTotals[ownerKey] || 0) + winnings;

        // B. Calculate Player Totals (Golfer Performance Leaderboard) - FIXED TO REMOVE OLD OAD PICKS
        // Only aggregate if it is NOT an old, bracketed OAD pick
            if (!isOldOAD) {
                playerTotals[player] = {
                    winnings: (playerTotals[player]?.winnings || 0) + winnings,
                    owner: owner
                };
            }
        }); // <--- The loop closes cleanly here.
        // The rest of the function (step 4, 5) continues below the loop... 
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