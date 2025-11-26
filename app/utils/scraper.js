// pga-pool-tracker/app/utils/scraper.js

// --- 1. PGA TOUR STATUS SCRAPER ---
export async function getTourStatus() {
    try {
        // Fetching the JSON data directly from a known endpoint is safer than scraping HTML
        // This public endpoint provides a clean list of PGA Tour events.
        const response = await fetch('https://www.pgatour.com/data/Tours/T02'); 
        const json = await response.json();

        const currentYear = new Date().getFullYear();
        const events = json.tours[0].trns.filter(t => t.start.startsWith(currentYear));
        
        // Find the first upcoming or currently running event
        const now = new Date();
        const upcomingEvent = events.find(event => new Date(event.end) >= now);

        if (upcomingEvent) {
             const startDate = new Date(upcomingEvent.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
             const endDate = new Date(upcomingEvent.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
             const status = new Date(upcomingEvent.start) <= now ? "Live Now" : "Starts";
             
             return `⛳ ${status}: ${upcomingEvent.TName}, ${startDate} - ${endDate}`;
        }
        
        return "⛳ PGA Tour Status: Season Complete or Schedule Pending.";

    } catch (error) {
        console.error("Error fetching tour status:", error);
        return "⛳ PGA Tour Status: Could not connect to schedule source.";
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
}