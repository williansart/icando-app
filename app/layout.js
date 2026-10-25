import "./globals.css";

export const metadata = {
  title: "I Can Do",
  description: "Inteligência para decisões melhores.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  appleWebApp: { capable: true, title: "I Can Do", statusBarStyle: "default" }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E3EDFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1220" }
  ]
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
