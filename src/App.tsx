import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Wand2, Info, Search, Play, X } from "lucide-react";

export default function App() {
  const [verified, setVerified] = useState(false);
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);
  const [liked, setLiked] = useState(new Set<string>());
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    try {
      const flag = localStorage.getItem("bj18");
      if (flag === "1") setVerified(true);
    } catch {}
  }, []);

  const PONY_CHECKPOINTS = useMemo(
    () => [
      "Pony Realism v2.3 ultra",
      "Pony Amateur",
      "Real Dream",
      "OmniA - Multi Concept Model",
      "DaSiWa WAN 2.2 I2V 14B Lightspeed",
      "Smooth Mix Wan 2.2 (I2V/T2V 14B)",
    ].map((s) => s.toLowerCase()),
    []
  );

  async function civitai(path: string) {
    const key = (import.meta.env?.VITE_CIVITAI_API_KEY || "a65f391a67e58ab66257f96ef4568e96");
    const res = await fetch(`https://civitai.com/api${path}`, {
      headers: key ? { Authorization: `Bearer ${key}` } : undefined,
    });
    if (!res.ok) throw new Error(`Civitai ${res.status}`);
    return res.json();
  }

  async function fetchModelVersionIdsByNames(names: string[]) {
    const ids: number[] = [];
    for (const n of names) {
      try {
        const data = await civitai(`/v1/models?limit=5&query=${encodeURIComponent(n)}`);
        const picked = (data?.items || data)?.find((m: any) => (m.name || "").toLowerCase().includes(n.toLowerCase()));
        const latest = picked?.modelVersions?.[0];
        if (latest?.id) ids.push(latest.id);
      } catch (e) {
        console.warn("Model lookup failed:", n, e);
      }
    }
    return ids;
  }

  function normalizeImage(it: any) {
    const prompt = it.meta?.prompt || it.prompt || "";
    const modelName = it.model?.name || it.meta?.model || "Unknown Model";
    const type = it.type?.toLowerCase() === "video" || /mp4|webm/i.test(it?.mimeType || "") ? "video" : "image";
    return {
      id: it.id || crypto.randomUUID(),
      title: it.meta?.prompt?.slice(0, 24) || modelName,
      type,
      preview_url: it.url || it.thumbnailUrl || it.images?.[0]?.url,
      file_url: it.url || it.images?.[0]?.url,
      prompt,
      model: modelName,
      nsfw: !!it.nsfw,
      created_at: it.createdAt || it.publishedAt,
    };
  }

  async function loadPage(nextPage: number) {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const versionIds = await fetchModelVersionIdsByNames(PONY_CHECKPOINTS);
      const params = new URLSearchParams();
      params.set("limit", "32");
      params.set("page", String(nextPage));
      if (versionIds.length) params.set("modelVersionId", versionIds.join(","));
      params.set("nsfw", "true");
      const data = await civitai(`/v1/images?${params.toString()}`);
      const rawItems = data?.items || data || [];
      const normalized = rawItems.map(normalizeImage).filter((x: any) => x.preview_url && x.nsfw);
      setItems((prev) => [...prev, ...normalized]);
      setPage(nextPage);
      setHasMore(normalized.length > 0);
    } catch (e) {
      console.error("Civitai fetch failed", e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (verified) {
      setItems([]);
      setHasMore(true);
      loadPage(1);
    }
  }, [verified, query]);

  useEffect(() => {
    const onScroll = () => {
      if (!hasMore || loading) return;
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 600) {
        loadPage(page + 1);
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [page, hasMore, loading]);

  const handleVerify = () => {
    if (!dob) return setError("Please enter your date of birth");
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    if (age < 18) {
      setError("You must be 18 or older to enter this site.");
      return;
    }
    try {
      localStorage.setItem("bj18", "1");
      localStorage.setItem("bj_dob", dob);
    } catch {}
    setVerified(true);
  };

  if (!verified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center">
        <h1 className="text-4xl font-bold mb-4">Bangjourney — Adults Only</h1>
        <p className="mb-4 text-white/70">Please enter your date of birth to verify you are 18 or older.</p>
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="text-black px-4 py-2 rounded-lg mb-3"
        />
        {error && <p className="text-red-400 mb-2">{error}</p>}
        <button
          onClick={handleVerify}
          className="px-6 py-2 bg-pink-600 hover:bg-pink-700 rounded-full text-white font-semibold"
        >
          Enter Site
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#170a09] via-[#1b0f13] to-[#2a0f13] text-white">
      <div className="max-w-6xl mx-auto px-4 pb-24">
        <div className="mt-6 rounded-3xl p-6 md:p-10 backdrop-blur-xl bg-white/5 ring-1 ring-white/10 shadow-[0_0_60px_rgba(255,100,60,0.15)]">
          <div className="flex flex-col items-center">
            <Logo />
            <nav className="flex items-center justify-center gap-6 text-lg/none text-white/90 mt-4">
              {"Home Generate History Likes Account".split(" ").map((t) => (
                <a key={t} href="#" className="hover:text-white transition">{t}</a>
              ))}
            </nav>
          </div>

          <div className="pt-8 md:pt-10 text-center">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white drop-shadow-sm">
              bangjourney
            </h1>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <div className="flex flex-col gap-4 w-full max-w-xl">
              <div className="relative flex items-center rounded-full bg-white/5 ring-1 ring-white/10 px-4 py-3">
                <Search className="w-5 h-5 text-white/60" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="bg-transparent outline-none px-3 w-full placeholder:text-white/50"
                />
              </div>

              <div className="flex justify-center gap-3">
                <button onClick={() => { setItems([]); setHasMore(true); loadPage(1); }} className="px-6 py-2 rounded-full bg-gradient-to-br from-orange-500/80 to-pink-500/80 hover:from-orange-500 hover:to-pink-500 text-white font-semibold shadow-lg">Search</button>
                <button className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-white font-semibold">Generate</button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {items.map((item) => (
              <div key={item.id} className="group relative overflow-hidden rounded-2xl ring-1 ring-white/10 bg-white/5">
                <button onClick={() => setOpen(item)} className="block w-full text-left">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={item.preview_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition" />
                    {item.type === "video" && (
                      <div className="absolute inset-0 grid place-content-center">
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full text-sm"><Play className="w-4 h-4"/> Video</div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-lg font-semibold drop-shadow-sm">{item.title}</div>
                  </div>
                </button>
              </div>
            ))}
          </div>
          {loading && <div className="text-center text-white/70 mt-6">Loading more…</div>}
          {!hasMore && <div className="text-center text-white/50 mt-6">No more results.</div>}
        </div>
      </div>
      <AnimatePresence>{open && <Drawer item={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-white/90 text-[#1a0f0e] grid place-content-center font-black text-2xl shadow-lg">
        b
      </div>
    </div>
  );
}

function Drawer({ item, onClose }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <motion.div
        initial={{ x: 480 }}
        animate={{ x: 0 }}
        exit={{ x: 480 }}
        transition={{ type: "spring", stiffness: 110, damping: 20 }}
        className="w-full sm:w-[480px] h-full bg-[#160d0c] text-white ring-1 ring-white/10 shadow-2xl overflow-y-auto"
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="font-semibold">Details</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-5">
          <img src={item.preview_url} alt={item.title} className="rounded-xl ring-1 ring-white/10" />
          <div>
            <div className="text-xl font-bold">{item.title}</div>
            <div className="text-white/70 text-sm mt-1">{item.model}</div>
          </div>
          <section>
            <h3 className="font-semibold mb-2">Prompt</h3>
            <div className="bg-white/5 ring-1 ring-white/10 rounded-xl p-3 text-sm whitespace-pre-wrap">{item.prompt}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(item.prompt)} className="px-3 py-1 bg-white/10 rounded-lg">Copy prompt</button>
              <button onClick={() => navigator.clipboard.writeText(item.file_url)} className="px-3 py-1 bg-white/10 rounded-lg">Copy URL</button>
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}
