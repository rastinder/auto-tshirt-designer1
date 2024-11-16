import React, { useState, useEffect } from 'react';
import { Wand2, AlertCircle } from 'lucide-react';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  error?: string | null;
}

export const PromptInput = ({ onGenerate, isGenerating, error }: PromptInputProps) => {
  const [prompt, setPrompt] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const maxChars = 200;

  useEffect(() => {
    setCharCount(prompt.length);
  }, [prompt]);

  const validatePrompt = (text: string): boolean => {
    if (!text.trim()) {
      setLocalError('Please enter a design description');
      return false;
    }
    if (text.length > maxChars) {
      setLocalError(`Description must be ${maxChars} characters or less`);
      return false;
    }
    setLocalError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePrompt(prompt)) {
      onGenerate(prompt.trim());
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPrompt(text);
    if (text.length > maxChars) {
      setLocalError(`Description must be ${maxChars} characters or less`);
    } else {
      setLocalError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={handlePromptChange}
          placeholder="Describe your t-shirt design... (e.g., 'A cosmic galaxy with swirling nebulas')"
          className={`w-full h-32 px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent resize-none ${
            (error || localError) 
              ? 'border-red-500 focus:ring-red-200' 
              : 'border-gray-300 focus:ring-indigo-200'
          }`}
          disabled={isGenerating}
        />
        <div className="absolute bottom-2 right-2 text-sm text-gray-500">
          {charCount}/{maxChars}
        </div>
      </div>

      {(error || localError) && (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error || localError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!prompt.trim() || isGenerating || !!localError}
        className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        <Wand2 className="h-5 w-5" />
        <span>{isGenerating ? 'Generating...' : 'Generate Design'}</span>
      </button>
    </form>
  );
};