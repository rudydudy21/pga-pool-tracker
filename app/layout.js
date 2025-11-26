// pga-pool-tracker/app/layout.js

import './globals.css';

// Metadata for the browser tab
export const metadata = {
  title: 'PGA Pool Tracker',
  description: 'Season-long Keeper and One-and-Done Pool Leaderboards',
};

// RootLayout is a required Next.js component that wraps the entire application
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* The body applies the Tailwind dark background and text color. 
        It ensures the background is dark gray across the entire screen.
      */}
      <body className="bg-gray-900 text-white antialiased">
        {children}
      </body>
    </html>
  );
}