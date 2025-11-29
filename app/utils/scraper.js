'use strict'; 
const ESPN_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard';

// --- 1. PGA TOUR STATUS SCRAPER (ESPN Source) ---
export async function getTourStatus() {
    try {
        const response = await fetch(ESPN_API_URL, { 
            cache: 'no-store' 
        }); 
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        const event = json.events[0]; // ESPN usually puts the main event first

        if (event && event.name) {
            const eventName = event.name;
            const eventStatus = event.status?.detail || "TBD";
            return `⛳ ${eventName} - Status: ${eventStatus}`;
        }
        
        return "⛳ PGA Tour Status: No Event Found.";

    } catch (error) {
        console.error("Error fetching tour status:", error);
        return "⛳ PGA Tour Status: Network Unavailable.";
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
// --- 3. LIVE TOURNAMENT LEADERBOARD SCRAPER (ESPN Source) ---
export async function getTournamentLeaderboard() {
    try {
        const response = await fetch(ESPN_API_URL, {
            cache: 'no-store' 
        }); 
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        const event = json.events[0];
        
        if (!event || !event.competitions || !event.competitions[0].competitors) {
            return { 
                tournamentName: event?.name || null, 
                players: [], 
                status: event?.status?.detail || "Data unavailable." 
            };
        }

        const competition = event.competitions[0];
        const tournamentName = event.name;
        const tournamentStatus = competition.status?.detail;

        // Extract key player data 
        const livePlayers = competition.competitors.map(c => {
            const player = c.athlete;
            const score = c.linescores?.find(s => s.type === 'total') || {};
            
            return {
                name: player.displayName,
                position: c.status?.position?.id || 'TBD',
                score: score.displayValue || 0, 
                money: 0 // ESPN API does not easily provide money, set to 0
            };
        });

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