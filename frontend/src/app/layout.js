import { Instrument_Serif, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import QueryProvider from "./QueryProvider";
import { ThemeProvider } from "./ThemeProvider";

/*
 Both faces are variables that have to land on <html>: the CSS custom
 properties next/font generates only inherit downwards, so declaring the base
 family against a <body>-scoped variable silently falls back to the browser's
 default. Schibsted Grotesk is a variable face (one file covers 400–700);
 Instrument Serif ships a single weight, which is exactly what the wordmark,
 hero and empty states use.
*/
const uiSans = Schibsted_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const displaySerif = Instrument_Serif({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata = {
  title: "Convoia",
  description: "This app helps people come together and have meaningful conversations.",
};

const themeInitScript = `
try {
  var t = localStorage.getItem("convoia-theme");
  if (!t || ["light", "light-saturated", "dark", "dark-neon"].indexOf(t) === -1) {
    t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${uiSans.variable} ${displaySerif.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-t-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-t-on-primary"
            >
              Skip to content
            </a>
            {/* One shell, two shapes: a row with the rail on desktop, a column
                with a top bar and bottom tabs on phones. */}
            <div className="flex h-dvh flex-col bg-background md:flex-row">
              <Sidebar />
              <main
                id="main-content"
                className="min-h-0 flex-1 overflow-y-auto pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
              >
                {children}
              </main>
            </div>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
