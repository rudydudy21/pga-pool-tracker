'use strict';
// pga-pool-tracker/app/utils/scraper.js (New getTourStatus function)
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


// --- 2. GOLFER ODDS SCRAPER ---
// This function fetches odds from the public golfodds.com page.
export async function getGolferOdds() {
    // Check if it's Mon-Wed to display odds (1=Mon, 2=Tue, 3=Wed)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek < 1 || dayOfWeek > 3) {
         return null; 
    }
    
    try {
        const response = await fetch('http://golfodds.com/weekly-odds.html');
        const html = await response.text();

        // Safe method to isolate the required text section.
        const startMarker = 'ODDS to Win:';
        const endMarker = 'Tour Links';
        
        const start = html.indexOf(startMarker);
        const end = html.indexOf(endMarker, start);

        if (start === -1 || end === -1) return null;
        
        const oddsText = html.substring(start + startMarker.length, end);
        
        // Process text into player/odds pairs
        const lines = oddsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        const oddsList = [];
        for (let i = 0; i < lines.length; i += 2) {
            if (lines[i+1] && !lines[i].includes('(')) {
                oddsList.push({
                    player: lines[i],
                    odds: lines[i+1]
                });
            }
        }
        
        return oddsList;

    } catch (error) {
        // On error, simply return null so the app doesn't crash
        console.error("Error fetching golfer odds:", error);
        return null; 
    }
    // pga-pool-tracker/app/utils/scraper.js (New getTournamentLeaderboard function)
}
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
};