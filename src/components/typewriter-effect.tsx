
"use client";

import { useState, useEffect, useContext } from 'react';
import { LanguageContext } from '@/context/language-context';

interface TypewriterEffectProps {
  strings: string[];
}

export function TypewriterEffect({ strings }: TypewriterEffectProps) {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);
  const { language } = useContext(LanguageContext);

  useEffect(() => {
    // Reset state when strings (language) change
    setText('');
    setLoopNum(0);
    setIsDeleting(false);
  }, [strings]);

  useEffect(() => {
    const handleType = () => {
      const i = loopNum % strings.length;
      const fullText = strings[i];

      setText(
        isDeleting
          ? fullText.substring(0, text.length - 1)
          : fullText.substring(0, text.length + 1)
      );

      setTypingSpeed(isDeleting ? 30 : 150);

      if (!isDeleting && text === fullText) {
        setTimeout(() => setIsDeleting(true), 1500);
      } else if (isDeleting && text === '') {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, typingSpeed, loopNum, strings]);

  return (
    <div className="h-6 text-lg font-medium text-muted-foreground" dir="ltr">
      <span className="typewriter">{text}</span>
      <span className="animate-ping">|</span>
    </div>
  );
}
