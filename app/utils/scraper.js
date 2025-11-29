'use strict'; 
// pga-pool-tracker/app/utils/scraper.js
// --- 1. PGA TOUR STATUS SCRAPER (Using Highly Stable Source) ---
export async function getTourStatus() {
    try {
        // Using a highly stable backup source for event info
        const response = await fetch('https://datagolf-leaderboard-api.dg-dsm.com/api/v1/live_events', { 
            cache: 'no-store' 
        }); 
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        const currentEvent = json.data.find(e => e.tour_id === '4') || json.data[0]; // Tour ID 4 is PGA Tour

        if (currentEvent) {
            const eventName = currentEvent.event_name;
            const eventStatus = currentEvent.event_status_description || "Pre-Round";
            return `⛳ ${eventName} - Status: ${eventStatus}`;
        }
        
        return "⛳ PGA Tour Status: No Event Currently Live.";

    } catch (error) {
        console.error("Error fetching tour status:", error);
        return "⛳ PGA Tour Status: Connection Error. (New source failed)";
    }
}

// --- 2. GOLFER ODDS SCRAPER (Keep existing reliable function) ---
// ... (Keep the existing getGolferOdds function as it was not throwing an ENOTFOUND error)
// ...

// --- 3. LIVE TOURNAMENT LEADERBOARD SCRAPER (Using Highly Stable Source) ---
export async function getTournamentLeaderboard() {
    try {
        // Using the same stable source for the leaderboard data
        const response = await fetch('https://datagolf-leaderboard-api.dg-dsm.com/api/v1/leaderboard_summary', {
            cache: 'no-store' 
        }); 
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();

        // Find the current PGA Tour event leaderboard
        const currentEvent = json.data.find(e => e.tour_id === '4') || json.data[0];

        if (!currentEvent || !currentEvent.players) {
            return { 
                tournamentName: currentEvent?.event_name || null, 
                players: [], 
                status: "Data unavailable." 
            };
        }

        const tournamentName = currentEvent.event_name;
        const tournamentStatus = currentEvent.event_status_description;

        // Extract key player data (note the different JSON structure!)
        const livePlayers = currentEvent.players.map(p => ({
            name: p.player_name,
            position: p.current_position,
            score: p.total_score, 
            money: p.money_rankings?.money_event_to_date || 0 
        }));

        return {
            tournamentName,
            status: tournamentStatus,
            players: livePlayers
        };

    } catch (error) {
        console.error("Error fetching live leaderboard:", error);
        return { 
            tournamentName: null, 
            players: [], 
            status: "Error fetching live tournament data." 
        };
    }
}
// --- 3. LIVE TOURNAMENT LEADERBOARD SCRAPER ---
    export async function getTournamentLeaderboard() {
    try {
        // Using the new stable, direct leaderboard data source
        const response = await fetch('https://statdata.pgatour.com/r/current/leaderboard-v2.json', {
            cache: 'no-store' 
        }); 

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();

        // Check for required data
        if (!json.leaderboard || !json.leaderboard.players) {
            return { 
                tournamentName: json.leaderboard?.tournament_name || null, 
                players: [], 
                status: json.leaderboard?.round_state || "Data unavailable." 
            };
        }

        const tournamentName = json.leaderboard.tournament_name;
        const tournamentStatus = json.leaderboard.round_state;

        // Extract key player data: Name, Position, Score, Money
        const livePlayers = json.leaderboard.players.map(p => ({
            name: p.player_bio.full_name,
            position: p.current_position,
            score: p.total_score, 
            money: p.rankings?.money_event_to_date || 0 
        }));

        return {
            tournamentName,
            status: tournamentStatus,
            players: livePlayers
        };

    } catch (error) {
        console.error("Error fetching live leaderboard:", error);
        return { 
            tournamentName: null, 
            players: [], 
            status: "Error fetching live tournament data." 
        };
    }
};