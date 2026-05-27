import { useState, useEffect, useRef, useCallback } from "react";
import { Disc3, QrCode, Music, Download, LogIn, LogOut, Camera, X, Play, Pause, ArrowLeft, Settings } from "lucide-react";

// ============ CONFIG ============
// O utilizador tem que substituir isto pelo seu Client ID do Spotify
// (https://developer.spotify.com/dashboard)
const DEFAULT_CLIENT_ID = ""; // Vazio = a app pede para configurar
const REDIRECT_URI = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
const SCOPES = "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative";

// ============ HELPERS ============
async function generatePKCE() {
  const generateRandomString = (length) => {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
  };
  const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return crypto.subtle.digest("SHA-256", data);
  };
  const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  };
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);
  return { codeVerifier, codeChallenge };
}

function extractTrackId(text) {
  if (!text) return null;
  // spotify:track:XXX
  let m = text.match(/spotify:track:([a-zA-Z0-9]+)/);
  if (m) return m[1];
  // https://open.spotify.com/track/XXX
  m = text.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (m) return m[1];
  // só o ID (22 chars alfanuméricos)
  if (/^[a-zA-Z0-9]{22}$/.test(text.trim())) return text.trim();
  return null;
}

function extractPlaylistId(text) {
  if (!text) return null;
  let m = text.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  if (m) return m[1];
  m = text.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9]{22}$/.test(text.trim())) return text.trim();
  return null;
}

// ============ MAIN APP ============
export default function App() {
  const [view, setView] = useState("home"); // home | generate | play | settings
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [clientId, setClientId] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_CLIENT_ID;
    return localStorage.getItem("spotify_client_id") || DEFAULT_CLIENT_ID;
  });

  // ============ AUTH FLOW (PKCE) ============
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const storedToken = localStorage.getItem("spotify_token");
    const tokenExpiry = localStorage.getItem("spotify_token_expiry");

    if (code) {
      // Trocar code por token
      const verifier = localStorage.getItem("spotify_verifier");
      const cid = localStorage.getItem("spotify_client_id") || clientId;
      (async () => {
        try {
          const res = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: cid,
              grant_type: "authorization_code",
              code,
              redirect_uri: REDIRECT_URI,
              code_verifier: verifier,
            }),
          });
          const data = await res.json();
          if (data.access_token) {
            localStorage.setItem("spotify_token", data.access_token);
            localStorage.setItem("spotify_token_expiry", String(Date.now() + data.expires_in * 1000));
            if (data.refresh_token) localStorage.setItem("spotify_refresh", data.refresh_token);
            setToken(data.access_token);
            window.history.replaceState({}, "", REDIRECT_URI);
          }
        } catch (e) {
          console.error("Token exchange failed", e);
        }
      })();
    } else if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
      setToken(storedToken);
    } else if (storedToken) {
      // Token expirou — tentar refresh
      const refresh = localStorage.getItem("spotify_refresh");
      const cid = localStorage.getItem("spotify_client_id") || clientId;
      if (refresh && cid) {
        (async () => {
          try {
            const res = await fetch("https://accounts.spotify.com/api/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: cid,
                grant_type: "refresh_token",
                refresh_token: refresh,
              }),
            });
            const data = await res.json();
            if (data.access_token) {
              localStorage.setItem("spotify_token", data.access_token);
              localStorage.setItem("spotify_token_expiry", String(Date.now() + data.expires_in * 1000));
              setToken(data.access_token);
            }
          } catch (e) { console.error("Refresh failed", e); }
        })();
      }
    }
  }, []);

  // Fetch user profile
  useEffect(() => {
    if (!token) return;
    fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setUser)
      .catch(console.error);
  }, [token]);

  const login = async () => {
    if (!clientId) {
      setView("settings");
      return;
    }
    const { codeVerifier, codeChallenge } = await generatePKCE();
    localStorage.setItem("spotify_verifier", codeVerifier);
    localStorage.setItem("spotify_client_id", clientId);
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  };

  const logout = () => {
    localStorage.removeItem("spotify_token");
    localStorage.removeItem("spotify_token_expiry");
    localStorage.removeItem("spotify_refresh");
    setToken(null);
    setUser(null);
  };

  return (
    <div className="min-h-screen w-full" style={{
      background: "radial-gradient(ellipse at top, #2a0845 0%, #1a0033 40%, #0a0014 100%)",
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      color: "#fff",
    }}>
      {/* Decorative grain */}
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        mixBlendMode: "overlay",
      }} />

      <div className="relative max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <Header user={user} onLogout={logout} onSettings={() => setView("settings")} />

        {view === "home" && <HomeView token={token} onLogin={login} onGenerate={() => setView("generate")} onPlay={() => setView("play")} hasClientId={!!clientId} onSetup={() => setView("settings")} />}
        {view === "generate" && <GenerateView token={token} onBack={() => setView("home")} onLogin={login} />}
        {view === "play" && <PlayView token={token} onBack={() => setView("home")} onLogin={login} />}
        {view === "settings" && <SettingsView clientId={clientId} setClientId={setClientId} onBack={() => setView("home")} />}

        <Footer />
      </div>
    </div>
  );
}

// ============ HEADER ============
function Header({ user, onLogout, onSettings }) {
  return (
    <header className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Disc3 className="w-10 h-10 text-pink-400 animate-spin" style={{ animationDuration: "8s" }} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>
            DISCOTECA
          </h1>
          <p className="text-xs text-pink-200/60 -mt-1">Cartas musicais à tua maneira</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/80">{user.display_name}</span>
          </div>
        )}
        <button onClick={onSettings} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition" title="Definições">
          <Settings className="w-4 h-4" />
        </button>
        {user && (
          <button onClick={onLogout} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition" title="Sair">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}

// ============ HOME ============
function HomeView({ token, onLogin, onGenerate, onPlay, hasClientId, onSetup }) {
  return (
    <div className="space-y-12">
      <section className="text-center py-8 sm:py-12">
        <h2 className="text-5xl sm:text-7xl font-black leading-none mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.02em" }}>
          O JOGO DOS <span className="text-pink-400">HITS</span>
          <br />FEITO POR <span className="text-yellow-300">TI</span>
        </h2>
        <p className="max-w-xl mx-auto text-pink-100/70 text-lg">
          Cria cartas com QR codes a partir de qualquer playlist do Spotify. Escaneia, ouve, adivinha o ano.
        </p>
      </section>

      {!hasClientId && (
        <div className="rounded-xl bg-yellow-400/10 border border-yellow-400/30 p-6 max-w-2xl mx-auto">
          <h3 className="font-bold text-yellow-200 mb-2">⚙️ Configuração necessária</h3>
          <p className="text-sm text-yellow-100/80 mb-3">
            Antes de começar, precisas de configurar uma app gratuita no Spotify Developer Dashboard. Demora 2 minutos.
          </p>
          <button onClick={onSetup} className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-bold hover:bg-yellow-300 transition">
            Configurar agora →
          </button>
        </div>
      )}

      {hasClientId && !token && (
        <div className="text-center">
          <button onClick={onLogin} className="inline-flex items-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold text-lg rounded-full transition shadow-lg shadow-green-500/30">
            <LogIn className="w-5 h-5" /> Entrar com Spotify
          </button>
          <p className="text-xs text-white/40 mt-3">Precisas de Spotify Premium para tocar músicas completas</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <ActionCard
          icon={<QrCode className="w-8 h-8" />}
          title="Gerar cartas"
          desc="Pega numa playlist do Spotify e gera um PDF imprimível com QR codes."
          color="pink"
          onClick={onGenerate}
          disabled={!token}
        />
        <ActionCard
          icon={<Camera className="w-8 h-8" />}
          title="Tocar / Escanear"
          desc="Escaneia um QR code de uma carta para tocar a música."
          color="yellow"
          onClick={onPlay}
          disabled={!token}
        />
      </div>
    </div>
  );
}

function ActionCard({ icon, title, desc, color, onClick, disabled }) {
  const colorMap = {
    pink: { bg: "from-pink-500/20 to-purple-500/10", border: "border-pink-400/30", text: "text-pink-300", hover: "hover:border-pink-400/60" },
    yellow: { bg: "from-yellow-400/20 to-orange-500/10", border: "border-yellow-400/30", text: "text-yellow-300", hover: "hover:border-yellow-400/60" },
  };
  const c = colorMap[color];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-left p-6 rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} ${!disabled ? c.hover : ""} transition group ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className={`${c.text} mb-4 transition group-hover:scale-110 origin-left`}>{icon}</div>
      <h3 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}>{title}</h3>
      <p className="text-sm text-white/60">{desc}</p>
    </button>
  );
}

// ============ GENERATE VIEW ============
function GenerateView({ token, onBack, onLogin }) {
  const [playlistInput, setPlaylistInput] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const loadPlaylist = async () => {
    setError("");
    const id = extractPlaylistId(playlistInput);
    if (!id) {
      setError("Não reconheço esse link. Cola um link do tipo https://open.spotify.com/playlist/...");
      return;
    }
    setLoading(true);
    try {
      const allTracks = await fetchPlaylistTracks(id, token);
      if (allTracks.length === 0) {
        setError("A playlist parece estar vazia ou inacessível.");
      } else {
        setTracks(allTracks);
      }
    } catch (e) {
      setError("Erro ao carregar playlist: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Tenta várias estratégias para contornar restrições da API
  async function fetchPlaylistTracks(id, token) {
    const headers = { Authorization: `Bearer ${token}` };

    // Estratégia 1: endpoint /playlists/{id} (mais permissivo)
    try {
      const res = await fetch(`https://api.spotify.com/v1/playlists/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const items = data.tracks?.items || [];
        let tracks = items
          .filter(it => it.track && it.track.id)
          .map(it => mapTrack(it.track));
        // Se tem mais páginas, tentar buscar o resto
        let nextUrl = data.tracks?.next;
        while (nextUrl) {
          try {
            const r2 = await fetch(nextUrl, { headers });
            if (!r2.ok) break;
            const d2 = await r2.json();
            tracks.push(...(d2.items || [])
              .filter(it => it.track && it.track.id)
              .map(it => mapTrack(it.track)));
            nextUrl = d2.next;
          } catch { break; }
        }
        if (tracks.length > 0) return tracks;
      }
    } catch (e) { /* tentar próxima estratégia */ }

    // Estratégia 2: endpoint /playlists/{id}/tracks (o tradicional)
    try {
      let allTracks = [];
      let url = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`;
      while (url) {
        const res = await fetch(url, { headers });
        if (!res.ok) {
          if (allTracks.length > 0) return allTracks;
          const body = await res.text();
          throw new Error(`${res.status} — ${body.slice(0, 200)}`);
        }
        const data = await res.json();
        allTracks.push(...(data.items || [])
          .filter(it => it.track && it.track.id)
          .map(it => mapTrack(it.track)));
        url = data.next;
      }
      return allTracks;
    } catch (e) {
      throw new Error(
        `Não consegui aceder à playlist. O Spotify mudou regras em Nov 2024 e algumas playlists ficaram inacessíveis a apps em modo Development.\n\n` +
        `Tenta:\n` +
        `1) Criar uma playlist NOVA, pública, e copiar as músicas para lá\n` +
        `2) Pedir Extension Request no Spotify Developer Dashboard\n\n` +
        `Detalhe técnico: ${e.message}`
      );
    }
  }

  function mapTrack(track) {
    return {
      id: track.id,
      name: track.name,
      artists: track.artists.map(a => a.name).join(", "),
      year: track.album?.release_date ? track.album.release_date.slice(0, 4) : "?",
    };
  }

  const generatePDF = async () => {
    setGeneratingPDF(true);
    try {
      // Carregar libs dinamicamente
      const QRCode = (await import("https://esm.sh/qrcode@1.5.3")).default;
      const { jsPDF } = await import("https://esm.sh/jspdf@2.5.1");

      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = 210, pageH = 297;
      const cols = 3, rows = 3;
      const cardsPerPage = cols * rows;
      const cardW = 60, cardH = 85;
      const marginX = (pageW - cols * cardW) / 2;
      const marginY = (pageH - rows * cardH) / 2;

      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        const indexInPage = i % cardsPerPage;
        if (i > 0 && indexInPage === 0) pdf.addPage();
        const col = indexInPage % cols;
        const row = Math.floor(indexInPage / cols);
        const x = marginX + col * cardW;
        const y = marginY + row * cardH;

        // Carta — frente: QR
        pdf.setDrawColor(180);
        pdf.roundedRect(x + 2, y + 2, cardW - 4, cardH - 4, 3, 3);

        const qrUrl = `https://open.spotify.com/track/${t.id}`;
        const qrDataURL = await QRCode.toDataURL(qrUrl, { width: 400, margin: 1 });
        pdf.addImage(qrDataURL, "PNG", x + 10, y + 10, 40, 40);

        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text("DISCOTECA", x + cardW / 2, y + 58, { align: "center" });
        pdf.setFontSize(7);
        pdf.text(`#${i + 1}`, x + cardW / 2, y + 64, { align: "center" });

        // Texto pequeno com nome+ano (para virar a carta ou usar como confirmação)
        pdf.setFontSize(8);
        pdf.setTextColor(40);
        const nameLines = pdf.splitTextToSize(t.name, cardW - 10);
        pdf.text(nameLines.slice(0, 2), x + cardW / 2, y + 70, { align: "center" });
        pdf.setFontSize(7);
        pdf.setTextColor(100);
        const artistLines = pdf.splitTextToSize(t.artists, cardW - 10);
        pdf.text(artistLines.slice(0, 1), x + cardW / 2, y + 76, { align: "center" });
        pdf.setFontSize(11);
        pdf.setTextColor(220, 30, 100);
        pdf.text(String(t.year), x + cardW / 2, y + 82, { align: "center" });
      }

      pdf.save("discoteca-cartas.pdf");
    } catch (e) {
      setError("Erro ao gerar PDF: " + e.message);
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (!token) return (
    <div className="text-center py-12">
      <p className="mb-4 text-white/70">Precisas de iniciar sessão no Spotify primeiro.</p>
      <button onClick={onLogin} className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-full transition">Entrar</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-pink-200/70 hover:text-pink-200 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div>
        <h2 className="text-3xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}>Gerar cartas</h2>
        <p className="text-sm text-white/60 mt-1">Cola o link de uma playlist do Spotify (tua, pública ou seguida).</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={playlistInput}
          onChange={e => setPlaylistInput(e.target.value)}
          placeholder="https://open.spotify.com/playlist/..."
          className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-pink-400/60 focus:outline-none text-sm"
        />
        <button onClick={loadPlaylist} disabled={loading || !playlistInput} className="px-6 py-3 bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-white/40 text-white font-bold rounded-lg transition">
          {loading ? "A carregar..." : "Carregar"}
        </button>
      </div>

      {error && <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-400/30 text-red-200 text-sm whitespace-pre-line">{error}</div>}

      {tracks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-white/70">{tracks.length} músicas carregadas</p>
            <button onClick={generatePDF} disabled={generatingPDF} className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-300 disabled:bg-white/10 disabled:text-white/40 text-black font-bold rounded-lg transition">
              <Download className="w-4 h-4" /> {generatingPDF ? "A gerar PDF..." : "Descarregar PDF"}
            </button>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 max-h-96 overflow-y-auto">
            {tracks.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2 border-b border-white/5 last:border-0 text-sm">
                <span className="text-white/30 w-8">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{t.name}</div>
                  <div className="truncate text-white/50 text-xs">{t.artists}</div>
                </div>
                <span className="text-pink-300 font-bold">{t.year}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ PLAY VIEW (QR Scanner + Spotify Connect) ============
function PlayView({ token, onBack, onLogin }) {
  const [scanning, setScanning] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanFrameRef = useRef(null);

  // Carregar lista de dispositivos disponíveis
  const fetchDevices = useCallback(async () => {
    if (!token) return;
    setLoadingDevices(true);
    try {
      const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao buscar dispositivos");
      const data = await res.json();
      setDevices(data.devices || []);
      // Auto-selecionar dispositivo ativo, ou o primeiro disponível
      const active = data.devices.find(d => d.is_active);
      if (active) setSelectedDevice(active.id);
      else if (data.devices.length > 0 && !selectedDevice) setSelectedDevice(data.devices[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDevices(false);
    }
  }, [token, selectedDevice]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  // Refresh do estado de playback periodicamente
  useEffect(() => {
    if (!token) return;
    const checkState = async () => {
      try {
        const res = await fetch("https://api.spotify.com/v1/me/player", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 204) { setIsPlaying(false); return; }
        if (!res.ok) return;
        const data = await res.json();
        setIsPlaying(data.is_playing);
      } catch (e) { /* silent */ }
    };
    const interval = setInterval(checkState, 2000);
    return () => clearInterval(interval);
  }, [token]);

  // QR Scanner com jsQR
  const startScan = async () => {
    setError("");
    setRevealed(false);
    setCurrentTrack(null);
    if (!selectedDevice) {
      await fetchDevices();
    }
    setScanning(true); // setar primeiro para o <video> existir no DOM
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;

      // Esperar um tick para o <video> estar montado
      await new Promise(r => setTimeout(r, 50));

      const video = videoRef.current;
      if (!video) {
        setError("Erro: elemento de vídeo não encontrado.");
        return;
      }

      video.setAttribute("playsinline", "true");
      video.setAttribute("autoplay", "true");
      video.muted = true;
      video.srcObject = stream;

      // Esperar metadata para garantir que o vídeo tem dimensões
      await new Promise((resolve) => {
        if (video.readyState >= 1) resolve();
        else video.onloadedmetadata = () => resolve();
      });

      try {
        await video.play();
      } catch (playErr) {
        // Alguns browsers requerem interação do utilizador
        console.warn("Play falhou, a tentar mesmo assim:", playErr);
      }

      const jsQR = (await import("https://esm.sh/jsqr@1.4.0")).default;
      const tick = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const v = videoRef.current;
        if (v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth > 0) {
          const canvas = canvasRef.current;
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code) {
            const trackId = extractTrackId(code.data);
            if (trackId) {
              stopScan();
              handleTrack(trackId);
              return;
            }
          }
        }
        scanFrameRef.current = requestAnimationFrame(tick);
      };
      scanFrameRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setScanning(false);
      if (e.name === "NotAllowedError") {
        setError("Permissão da câmara negada. Vai a Definições do Safari → discoteca-ochre.vercel.app → ativa a câmara.");
      } else if (e.name === "NotFoundError") {
        setError("Não foi encontrada nenhuma câmara neste dispositivo.");
      } else {
        setError("Não consegui aceder à câmara: " + e.message);
      }
    }
  };

  const stopScan = useCallback(() => {
    if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => () => stopScan(), [stopScan]);

  const handleTrack = async (trackId) => {
    try {
      // Buscar info da track
      const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Track não encontrada no Spotify");
      const t = await res.json();
      setCurrentTrack({
        id: t.id,
        name: t.name,
        artists: t.artists.map(a => a.name).join(", "),
        year: t.album.release_date ? t.album.release_date.slice(0, 4) : "?",
        image: t.album.images[0]?.url,
      });
      // Tocar no dispositivo selecionado (ou ativo)
      await playTrack(trackId);
    } catch (e) {
      setError("Erro: " + e.message);
    }
  };

  const playTrack = async (trackId) => {
    if (!selectedDevice) {
      // Tentar refresh dos dispositivos
      await fetchDevices();
      if (!selectedDevice) {
        setError("Nenhum dispositivo Spotify ativo. Abre o Spotify no telemóvel/computador/coluna e tenta de novo.");
        return;
      }
    }
    try {
      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${selectedDevice}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) {
          setError("Dispositivo não está ativo. Abre o Spotify e toca qualquer música para o ativar, depois volta cá.");
        } else if (res.status === 403) {
          setError("Erro: Precisas de Spotify Premium para controlar o playback. " + (data.error?.message || ""));
        } else {
          setError("Erro Spotify: " + (data.error?.message || res.status));
        }
      } else {
        setIsPlaying(true);
      }
    } catch (e) {
      setError("Erro: " + e.message);
    }
  };

  const togglePlay = async () => {
    try {
      const endpoint = isPlaying ? "pause" : "play";
      const res = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}${selectedDevice ? `?device_id=${selectedDevice}` : ""}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) setIsPlaying(!isPlaying);
    } catch (e) { /* silent */ }
  };

  if (!token) return (
    <div className="text-center py-12">
      <p className="mb-4 text-white/70">Precisas de iniciar sessão no Spotify primeiro.</p>
      <button onClick={onLogin} className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-full transition">Entrar</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-pink-200/70 hover:text-pink-200 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div>
        <h2 className="text-3xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}>Tocar</h2>
        <p className="text-sm text-white/60 mt-1">
          A música toca no dispositivo onde o Spotify estiver aberto.
        </p>
      </div>

      {/* Seletor de dispositivo */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h3 className="text-sm font-bold text-pink-300">Dispositivo de saída</h3>
          <button onClick={fetchDevices} disabled={loadingDevices} className="text-xs text-white/60 hover:text-white">
            {loadingDevices ? "A atualizar..." : "🔄 Atualizar"}
          </button>
        </div>
        {devices.length === 0 ? (
          <div className="text-sm text-yellow-200/80 bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-3">
            ⚠️ Nenhum dispositivo encontrado. Abre o <strong>Spotify</strong> no telemóvel, computador ou coluna, toca qualquer música, e clica em "Atualizar".
          </div>
        ) : (
          <div className="space-y-1">
            {devices.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDevice(d.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center justify-between ${selectedDevice === d.id ? "bg-pink-500/30 border border-pink-400/50" : "bg-white/5 hover:bg-white/10 border border-transparent"}`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{deviceIcon(d.type)}</span>
                  <span>{d.name}</span>
                  {d.is_active && <span className="text-xs text-green-400">● ativo</span>}
                </span>
                {selectedDevice === d.id && <span className="text-pink-300 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-400/30 text-red-200 text-sm whitespace-pre-line">{error}</div>}

      {!scanning && !currentTrack && (
        <div className="text-center py-8">
          <button onClick={startScan} className="inline-flex items-center gap-3 px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-lg rounded-full transition shadow-lg shadow-yellow-400/30">
            <Camera className="w-5 h-5" /> Escanear QR
          </button>
        </div>
      )}

      {scanning && (
        <div className="relative">
          <div className="relative aspect-square max-w-md mx-auto rounded-2xl overflow-hidden border-2 border-yellow-400/50 shadow-2xl shadow-yellow-400/20">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 border-2 border-yellow-300 rounded-xl animate-pulse" />
            </div>
            <button onClick={stopScan} className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-white/60 text-sm mt-3">Aponta para o QR code da carta</p>
        </div>
      )}

      {currentTrack && (
        <div className="max-w-md mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-pink-500/20 to-purple-600/10 border border-pink-400/30 p-6 backdrop-blur">
            {!revealed ? (
              <div className="text-center py-8">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <Disc3 className="w-16 h-16 animate-spin" style={{ animationDuration: "4s" }} />
                </div>
                <p className="text-white/80 mb-2 text-lg">A tocar...</p>
                <p className="text-white/50 text-sm mb-6">Adivinha o ano antes de revelar!</p>
                <div className="flex flex-col gap-2 items-center">
                  <button onClick={togglePlay} className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full transition">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlaying ? "Pausa" : "Tocar"}
                  </button>
                  <button onClick={() => setRevealed(true)} className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-full transition mt-2">
                    Revelar resposta
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                {currentTrack.image && (
                  <img src={currentTrack.image} alt="" className="w-48 h-48 mx-auto mb-4 rounded-2xl shadow-2xl" />
                )}
                <h3 className="text-2xl font-bold mb-1">{currentTrack.name}</h3>
                <p className="text-white/60 mb-4">{currentTrack.artists}</p>
                <div className="inline-block px-6 py-3 rounded-full bg-yellow-400/20 border border-yellow-400/50">
                  <span className="text-3xl font-black text-yellow-300" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{currentTrack.year}</span>
                </div>
                <div className="mt-6 flex gap-2 justify-center">
                  <button onClick={togglePlay} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition text-sm">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlaying ? "Pausa" : "Tocar"}
                  </button>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => { setCurrentTrack(null); setRevealed(false); startScan(); }} className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 bg-pink-500 hover:bg-pink-400 text-white font-bold rounded-full transition">
            <Camera className="w-4 h-4" /> Próxima carta
          </button>
        </div>
      )}
    </div>
  );
}

function deviceIcon(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("smartphone")) return "📱";
  if (t.includes("computer")) return "💻";
  if (t.includes("speaker")) return "🔊";
  if (t.includes("tv")) return "📺";
  if (t.includes("game")) return "🎮";
  return "🎵";
}

// ============ SETTINGS ============
function SettingsView({ clientId, setClientId, onBack }) {
  const [draft, setDraft] = useState(clientId || "");
  const save = () => {
    localStorage.setItem("spotify_client_id", draft);
    setClientId(draft);
    onBack();
  };
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-pink-200/70 hover:text-pink-200 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <h2 className="text-3xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}>Definições</h2>

      <div className="rounded-xl bg-white/5 border border-white/10 p-6 space-y-4">
        <div>
          <h3 className="font-bold text-pink-300 mb-2">Spotify Client ID</h3>
          <p className="text-sm text-white/60 mb-3">
            Para usar a app, precisas de criar uma app gratuita no Spotify Developer Dashboard. É necessário só uma vez.
          </p>
          <ol className="text-sm text-white/70 space-y-1 mb-4 list-decimal list-inside">
            <li>Vai a <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-pink-300 underline">developer.spotify.com/dashboard</a></li>
            <li>Clica em "Create app"</li>
            <li>Dá um nome qualquer (ex: "O meu Hitster")</li>
            <li>Em "Redirect URI" cola: <code className="bg-black/40 px-2 py-1 rounded text-xs">{REDIRECT_URI}</code></li>
            <li>Em "APIs/SDKs" escolhe <strong>Web API</strong></li>
            <li>Aceita os termos e cria. Copia o "Client ID" que aparece.</li>
          </ol>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Cola aqui o Client ID"
            className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 focus:border-pink-400/60 focus:outline-none text-sm font-mono"
          />
          <button onClick={save} disabled={!draft} className="mt-3 px-6 py-2 bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-white/40 text-white font-bold rounded-lg transition">
            Guardar
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <h3 className="font-bold text-pink-300 mb-2">Como funciona?</h3>
        <ul className="text-sm text-white/70 space-y-2 list-disc list-inside">
          <li><strong>Cria cartas</strong> a partir de qualquer playlist Spotify (tua, pública ou de outra pessoa).</li>
          <li>O PDF gerado tem QR codes que apontam para tracks reais do Spotify.</li>
          <li>Funcionam <strong>quaisquer QR codes</strong> que apontem para tracks Spotify, não só os que tu gerares.</li>
          <li>O modo <strong>Tocar</strong> precisa de Spotify Premium e que tenhas o Spotify aberto em algum dispositivo (telemóvel, computador, coluna).</li>
          <li>A música toca onde o Spotify estiver ativo — escolhes o dispositivo na lista.</li>
          <li>Funciona em iPhone, Android, computador — qualquer browser moderno.</li>
          <li>Os QR codes oficiais do Hitster <strong>não funcionam</strong> aqui (usam formato proprietário deles).</li>
          <li className="text-yellow-200/80"><strong>💡 Dica iPhone:</strong> abre o Spotify no telemóvel e toca qualquer música. Volta cá, atualiza dispositivos, e o teu iPhone aparece. As cartas vão tocar no Spotify do telemóvel (ou na coluna se estiveres ligada a uma).</li>
        </ul>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 text-center text-xs text-white/30">
      <p>Discoteca · Construído com Spotify Web API</p>
    </footer>
  );
}
