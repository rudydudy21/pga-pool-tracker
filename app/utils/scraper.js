// pga-pool-tracker/app/utils/scraper.js

// --- 1. PGA TOUR STATUS SCRAPER ---
// This function fetches general tournament status.
export async function getTourStatus() {
    try {
        // Using a reliable public schedule page
        const response = await fetch('https://www.pgatour.com/schedule'); 
        const html = await response.text();

        // Simple string manipulation to find the first upcoming event (a robust method
        // requires complex library, but this handles most simple cases for now)
        const upcomingMatch = html.match(/TournamentName.*?>(.*?)<\/span>.*?<div class="date-range-desktop">(.*?)<\/div>/s);
        
        if (upcomingMatch && upcomingMatch.length >= 3) {
            const name = upcomingMatch[1].trim();
            const date = upcomingMatch[2].trim();
            return `⛳ Upcoming Event: ${name}, ${date}`;
        }
        
        return "⛳ PGA Tour Status: Data feed updating. Check back soon!";

    } catch (error) {
        console.error("Error fetching tour status:", error);
        return "⛳ PGA Tour Status: Could not connect to schedule source.";
    }
}


// --- 2. GOLFER ODDS SCRAPER ---
// This function fetches odds from the public golfodds.com page.
export async function getGolferOdds() {
    try {
        // Check if it's Mon-Wed to display odds (0=Sun, 1=Mon, 2=Tue, 3=Wed)
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek > 3 || dayOfWeek === 0) {
             return null; // Don't display odds if it's Thursday through Sunday
        }

        const response = await fetch('http://golfodds.com/weekly-odds.html');
        const html = await response.text();

        // The odds data is very clean text. We'll find the section 'ODDS to Win:'
        const start = html.indexOf('ODDS to Win:');
        if (start === -1) return null;
        
        // Find the end of the odds list (usually before the next section)
        const end = html.indexOf('Field (all others)');
        const oddsText = html.substring(start + 12, end !== -1 ? end : undefined);

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
        console.error("Error fetching golfer odds:", error);
        return null;
    }
}