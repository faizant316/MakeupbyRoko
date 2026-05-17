import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Makeup by Roko',
  description: 'Professional makeup artistry by Roqia Moshref',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
