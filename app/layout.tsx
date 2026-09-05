import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeSync from "./theme-sync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wedding Planner",
  description: "Wedding planning and 3D design platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('wedding-planner-theme');
                  var isDark = saved === 'dark';

                  if (isDark) {
                    document.documentElement.dataset.theme = 'dark';
                    document.documentElement.classList.add(
                      'dark',
                      'dark-mode',
                      'page-dark'
                    );
                  } else {
                    document.documentElement.dataset.theme = 'light';
                    document.documentElement.classList.remove(
                      'dark',
                      'dark-mode',
                      'page-dark'
                    );
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>

      <body className="min-h-full flex flex-col">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}