// pga-pool-tracker/app/utils/scraper.js (New getTourStatus function)

// --- 1. PGA TOUR STATUS SCRAPER ---
export async function getTourStatus() {
    try {
        // Switching to a reliable endpoint known to work well with Vercel/Next.js
        const response = await fetch('https://www.pgatour.com/data/current/schedule.json', { 
            // Crucial cache control to ensure we get fresh data
            cache: 'no-store' 
        }); 
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        
        // The structure requires filtering the schedule to find the next event
        const now = new Date().getTime();
        
        // Flatten all events and find the next one chronologically
        const nextEvent = json.schedule.flatMap(s => s.events)
            .find(event => new Date(event.startDate).getTime() >= now);

        if (nextEvent) {
             const startDate = new Date(nextEvent.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
             const endDate = new Date(nextEvent.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
             const status = new Date(nextEvent.startDate).getTime() <= now ? "Live Now" : "Starts";
             
             return `⛳ ${status}: ${nextEvent.tournamentName}, ${startDate} - ${endDate}`;
        }
        
        return "⛳ PGA Tour Status: Season Complete or Schedule Pending.";

    } catch (error) {
        console.error("Error fetching tour status:", error);
        // Return a benign error message for the user
        return "⛳ PGA Tour Status: Error connecting to schedule source.";
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