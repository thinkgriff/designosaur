import { Erica_One, Inter } from "next/font/google";

const erica = Erica_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-erica",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Designosaur Me",
  description: "Turn yourself into a Designosaur.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${erica.variable} ${inter.variable}`}>
      <body
        style={{
          margin: 0,
          fontFamily:
            "var(--font-inter), system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
