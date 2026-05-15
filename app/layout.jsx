import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Makeup by Roko',
  description: 'Professional makeup artistry by Roqia Moshref',
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
