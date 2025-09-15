
      
import {NextFont} from 'next/dist/compiled/@next/font';
import {Inter, Noto_Kufi_Arabic} from 'next/font/google';

export const fontSans: NextFont = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const fontArabic: NextFont = Noto_Kufi_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
});

    