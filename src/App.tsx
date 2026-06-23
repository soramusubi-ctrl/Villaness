import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-8 md:px-12 md:py-12">
      <section className="thorn-frame rounded-md border border-[#9f7840]/55 bg-[#f5e7cf] p-6 text-[#241322] shadow-[0_18px_60px_rgba(0,0,0,0.24)] md:p-8">
        <a href="#" className="font-sans text-sm font-semibold text-[#7b1023] underline decoration-[#b98d48] underline-offset-4">
          Villainess Diaryに戻る
        </a>
        <h2 className="mt-6 border-b border-[#b98d48]/55 pb-4 text-3xl font-semibold text-[#4b1d67]">プライバシーポリシー</h2>
        <div className="mt-6 space-y-6 font-sans leading-8">
          <section>
            <h3 className="font-serif text-xl font-semibold text-[#7b1023]">1. 取り扱う情報</h3>
            <p>
              Villainess Diaryは、入力された日記本文、任意でアップロードされたキャラクター画像、AIが生成した文章や画像を処理します。このアプリはユーザーアカウントを提供せず、リクエスト処理後に日記本文やアップロード画像をアプリ内へ意図的に保存しません。
            </p>
          </section>
          <section>
            <h3 className="font-serif text-xl font-semibold text-[#7b1023]">2. 利用目的</h3>
            <p>
              入力内容は、日記を悪役令嬢風の創作文章へ変換するため、また必要に応じて漫画風画像を生成するために利用します。サービス運用、セキュリティ、不正利用防止、障害調査のために、技術的なリクエスト情報を処理する場合があります。
            </p>
          </section>
          <section>
            <h3 className="font-serif text-xl font-semibold text-[#7b1023]">3. 外部サービス</h3>
            <p>
              このアプリは、Googleが提供するGemini APIへ日記本文、生成済み文章、任意のアップロード画像を送信します。Googleによるプロンプト、ファイル、生成結果の取り扱いは、無料枠の利用か、Cloud Billingが有効な有料プロジェクトの利用かによって異なる場合があります。また、このアプリはVercelでホストされており、サイト運用のために技術ログやリクエストメタデータが処理される場合があります。
            </p>
          </section>
          <section>
            <h3 className="font-serif text-xl font-semibold text-[#7b1023]">4. 入力しないでほしい情報</h3>
            <p>
              要配慮個人情報、秘密情報、医療情報、金融情報、パスワード、APIキー、利用許可のない画像などは入力またはアップロードしないでください。
            </p>
          </section>
          <section>
            <h3 className="font-serif text-xl font-semibold text-[#7b1023]">5. 子どもの利用について</h3>
            <p>
              このアプリは子ども向けではありません。Gemini APIの追加規約では、18歳未満の方を対象にした、または18歳未満の方がアクセスする可能性の高いAPIクライアントとして利用しないことが求められています。
            </p>
          </section>
          <section>
            <h3 className="font-serif text-xl font-semibold text-[#7b1023]">6. 改定と問い合わせ</h3>
            <p>
              アプリの変更に合わせて、このポリシーを改定する場合があります。質問がある場合は、GitHubリポジトリまたは運営者が示す連絡方法からお問い合わせください。
            </p>
          </section>
          <p className="border-t border-[#b98d48]/55 pt-4 text-sm text-[#6f4b3b]">最終更新日: 2026年6月23日</p>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => (window.location.hash === '#privacy' ? 'privacy' : 'app'));
  const [diary, setDiary] = useState('');
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  const [story, setStory] = useState('');
  const [manga, setManga] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [mangaLoading, setMangaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncRoute = () => setRoute(window.location.hash === '#privacy' ? 'privacy' : 'app');
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

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

      {route === 'privacy' ? (
        <PrivacyPolicy />
      ) : (
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
      )}

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 pb-8 font-sans text-sm text-[#d8b66b] md:px-12">
        <span>Villainess Diary</span>
        <a href="#privacy" className="underline decoration-[#b98d48] underline-offset-4 transition hover:text-[#fff5df]">
          プライバシーポリシー
        </a>
      </footer>
    </div>
  );
}
