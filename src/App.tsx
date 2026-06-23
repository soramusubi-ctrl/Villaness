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

  const readApiResponse = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    await response.text();
    throw new Error(`API returned a non-JSON response (${response.status}).`);
  };

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
      const data = await readApiResponse(response);

      if (!response.ok) {
        setError(data.error || 'Failed to convert text.');
        return;
      }

      setStory(data.story);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to convert text.');
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
      const mangaData = await readApiResponse(mangaResponse);
      
      if (!mangaResponse.ok) {
        setError(mangaData.error || 'Failed to generate manga.');
        return;
      }

      setManga(mangaData.mangaUrl);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to generate manga.');
    } finally {
      setMangaLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#17091f] text-[#f7ead3] font-serif">
      <header className="border-b border-[#8e6c32]/45 bg-[#24102f]/92 px-5 py-6 shadow-[0_12px_38px_rgba(0,0,0,0.24)] md:px-12">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <img src="/icon.svg" alt="" className="h-12 w-12 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#d8b66b]">Courtly chronicle</p>
            <h1 className="text-3xl font-semibold text-[#fff5df] md:text-4xl">Villainess Diary</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:px-12 md:py-12">
        <section className="thorn-frame rounded-md border border-[#9f7840]/55 bg-[#2b1436]/90 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.26)]">
          <textarea
            value={diary}
            onChange={(e) => setDiary(e.target.value)}
            className="h-48 w-full resize-y rounded border border-[#b98d48]/60 bg-[#f5e7cf] p-4 font-sans text-[#241322] shadow-inner outline-none transition placeholder:text-[#755e54] focus:border-[#f0ca73] focus:ring-2 focus:ring-[#8b1e3f]/65"
            placeholder="Write your daily thoughts..."
          />
          <div className="my-5 rounded border border-[#8e6c32]/45 bg-[#1f0d29]/70 p-4">
            <label className="block text-sm font-semibold uppercase tracking-[0.12em] text-[#d8b66b]">Upload Character Image</label>
            <input 
              type="file" 
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setCharacterImage(e.target.files?.[0] || null)}
              className="mt-3 w-full cursor-pointer rounded border border-[#6f3154] bg-[#f5e7cf] text-sm font-medium text-[#2a1430] file:mr-4 file:border-0 file:bg-[#8b1e3f] file:px-4 file:py-2 file:text-[#fff5df] hover:file:bg-[#a9274f]"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleStoryTransform}
              className="rounded border border-[#e2bc72]/70 bg-[#7b1023] px-6 py-3 font-sans text-sm font-semibold text-[#fff6e4] shadow-[0_10px_24px_rgba(123,16,35,0.32)] transition hover:bg-[#951733] focus:outline-none focus:ring-2 focus:ring-[#f0ca73]"
            >
              {textLoading ? 'Transforming...' : 'Transform into Villainess'}
            </button>
          
            {story && !mangaLoading && (
              <button 
                  onClick={handleMangaGeneration}
                  className="rounded border border-[#d8b66b]/70 bg-[#4b1d67] px-6 py-3 font-sans text-sm font-semibold text-[#fff6e4] shadow-[0_10px_24px_rgba(75,29,103,0.32)] transition hover:bg-[#61227f] focus:outline-none focus:ring-2 focus:ring-[#f0ca73]"
              >
                  Generate Manga
              </button>
            )}
          </div>

          {mangaLoading && <p className="mt-4 font-sans italic text-[#d8b66b]">Generating Manga...</p>}
          {error && <p className="mt-4 rounded border border-[#e05b72]/60 bg-[#4b1326] p-3 font-sans text-sm text-[#ffd8de]">{error}</p>}
        </section>

        <div className="space-y-8">
        {story && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="thorn-frame rounded-md border border-[#9f7840]/55 bg-[#f5e7cf] p-6 text-[#241322] shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
          >
            <h2 className="mb-4 border-b border-[#b98d48]/55 pb-3 text-xl font-semibold text-[#4b1d67]">The Villainess's Version</h2>
            <p className="whitespace-pre-wrap font-sans leading-8">{story}</p>
          </motion.section>
        )}
        {manga && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="thorn-frame rounded-md"
          >
            <img
              src={manga}
              alt="Manga"
              referrerPolicy="no-referrer"
              className="w-full rounded-md border border-[#9f7840]/55 shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
            />
          </motion.div>
        )}
        </div>
      </main>
    </div>
  );
}
