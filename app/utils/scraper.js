'use strict';
// pga-pool-tracker/app/utils/scraper.js (New getTourStatus function)
// --- 1. PGA TOUR STATUS SCRAPER ---
export async function getTourStatus() {
    try {
        // Using a single, known stable source for event info
        const response = await fetch('https://statdata.pgatour.com/r/current/message.json', { 
            cache: 'no-store' 
        }); 

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();

        // Extract current event name and status
        const eventName = json.Tournament.TournamentName || "PGA Tour Event";
        const eventStatus = json.Message; // e.g., 'Final', 'Round 3'

        return `⛳ ${eventName} - Status: ${eventStatus}`;

    } catch (error) {
        console.error("Error fetching tour status:", error);
        return "⛳ PGA Tour Status: Connection Error.";
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