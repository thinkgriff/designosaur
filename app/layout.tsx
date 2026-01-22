import "./globals.css";
import { Erica_One, Inter } from "next/font/google";

const erica = Erica_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-erica",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
      <body>{children}</body>
    </html>
  );
}
