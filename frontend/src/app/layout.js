import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import QueryProvider from "./QueryProvider";
import { ThemeProvider } from "./ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <ThemeProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-t-primary focus:px-4 focus:py-2 focus:text-white"
            >
              Skip to content
            </a>
            <div className="flex h-screen bg-background">
              <Sidebar />
              <main id="main-content" className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
