import { useState } from 'react';
import { motion } from 'motion/react';

export default function App() {
  const [diary, setDiary] = useState('');
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  const [story, setStory] = useState('');
  const [manga, setManga] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [mangaLoading, setMangaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStoryTransform = async () => {
    setTextLoading(true);
    setError(null);
    setStory('');
    setManga(null);
    
    try {
      const response = await fetch('/api/convert-diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diary }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to convert text.');
        return;
      }

      setStory(data.story);
    } catch {
      setError('Failed to convert text.');
    } finally {
      setTextLoading(false);
    }
  };

  const handleMangaGeneration = async () => {
    setMangaLoading(true);
    setError(null);
    setManga(null);
    
    try {
      const formData = new FormData();
      formData.append('story', story);
      if (characterImage) {
        formData.append('characterImage', characterImage);
      }
      
      const mangaResponse = await fetch('/api/generate-manga', {
        method: 'POST',
        body: formData,
      });
      const mangaData = await mangaResponse.json();
      
      if (!mangaResponse.ok) {
        setError(mangaData.error || 'Failed to generate manga.');
        return;
      }

      setManga(mangaData.mangaUrl);
    } catch {
      setError('Failed to generate manga.');
    } finally {
      setMangaLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans p-6 md:p-12">
      <header className="mb-12">
        <h1 className="text-3xl font-light tracking-tight text-stone-800">Villainess Diary</h1>
      </header>

      <main className="grid md:grid-cols-2 gap-12">
        <section>
          <textarea
            value={diary}
            onChange={(e) => setDiary(e.target.value)}
            className="w-full h-40 p-4 border border-stone-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
            placeholder="Write your daily thoughts..."
          />
          <div className="my-4">
            <label className="block text-sm font-medium text-stone-700">Upload Character Image:</label>
            <input 
              type="file" 
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setCharacterImage(e.target.files?.[0] || null)}
              className="mt-2"
            />
          </div>
          <button 
            onClick={handleStoryTransform}
            className="mt-4 px-6 py-2 bg-stone-800 text-stone-50 hover:bg-stone-700 transition"
          >
            {textLoading ? 'Transforming...' : 'Transform into Villainess'}
          </button>
          
          {story && !mangaLoading && (
            <button 
                onClick={handleMangaGeneration}
                className="mt-4 ml-4 px-6 py-2 bg-stone-600 text-stone-50 hover:bg-stone-500 transition"
            >
                Generate Manga
            </button>
          )}

          {mangaLoading && <p className="mt-4 italic">Generating Manga...</p>}
          {error && <p className="mt-4 text-red-600">{error}</p>}
        </section>

        <div className="space-y-12">
        {story && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="prose prose-stone"
          >
            <h2 className="text-xl font-medium mb-4">The Villainess's Version:</h2>
            <p className="whitespace-pre-wrap">{story}</p>
          </motion.section>
        )}
        {manga && (
          <motion.img 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            src={manga}
            alt="Manga"
            referrerPolicy="no-referrer"
            className="w-full border border-stone-200"
          />
        )}
        </div>
      </main>
    </div>
  );
}
