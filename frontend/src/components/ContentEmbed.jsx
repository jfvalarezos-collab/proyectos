import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/i;

function minDwellSecondsForTexto(texto = '') {
  return Math.max(15, Math.ceil((texto.length / 1000) * 60));
}

function useElapsedSeconds() {
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return elapsed;
}

export default function ContentEmbed({ materialTipo, materialPayload, qrToken, participantToken, onViewed }) {
  const [error, setError] = useState('');
  const completedRef = useRef(false);

  useEffect(() => {
    api.contentStart(qrToken, participantToken).catch((err) => setError(err.message));
  }, [qrToken, participantToken]);

  async function complete(evidence) {
    if (completedRef.current) return;
    completedRef.current = true;
    try {
      await api.contentComplete(qrToken, participantToken, evidence);
      onViewed();
    } catch (err) {
      completedRef.current = false;
      setError(err.message);
    }
  }

  const isYoutube = materialTipo === 'video' && YOUTUBE_RE.test(materialPayload.url || '');

  return (
    <div>
      {isYoutube && (
        <YoutubeViewer url={materialPayload.url} onEnded={() => complete({ youtubeEnded: true })} />
      )}
      {!isYoutube && (materialTipo === 'video' || materialTipo === 'presentacion') && (
        <VideoTimerViewer payload={materialPayload} onReady={() => complete({})} />
      )}
      {materialTipo === 'texto' && (
        <TextoViewer payload={materialPayload} onReady={(evidence) => complete(evidence)} />
      )}
      {materialTipo === 'imagenes' && (
        <ImagenesViewer payload={materialPayload} onReady={(evidence) => complete(evidence)} />
      )}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}

function YoutubeViewer({ url, onEnded }) {
  const containerId = useRef(`yt-${Math.random().toString(36).slice(2)}`).current;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const videoId = url.match(YOUTUBE_RE)?.[1];
    if (!videoId) return;

    function createPlayer() {
      // eslint-disable-next-line no-undef
      new YT.Player(containerId, {
        videoId,
        events: {
          onStateChange: (e) => {
            // eslint-disable-next-line no-undef
            if (e.data === YT.PlayerState.ENDED) onEnded();
          },
        },
      });
      setReady(true);
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = createPlayer;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
        <div id={containerId} className="w-full h-full" />
      </div>
      <p className="text-sm text-slate-500">
        {ready ? 'Debes reproducir el video completo para continuar.' : 'Cargando reproductor…'}
      </p>
    </div>
  );
}

function VideoTimerViewer({ payload, onReady }) {
  const elapsed = useElapsedSeconds();
  const requiredSeconds = Math.max(10, (Number(payload.duracionEstimadaMin) || 1) * 60 - 5);
  const remaining = Math.max(0, requiredSeconds - elapsed);

  useEffect(() => {
    if (remaining === 0) onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining === 0]);

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
        <iframe
          src={payload.url}
          title="Contenido de la capacitación"
          className="w-full h-full"
          allow="autoplay; fullscreen"
        />
      </div>
      <p className="text-sm text-slate-500">
        {remaining > 0
          ? `Debes permanecer en esta pantalla ${remaining}s más antes de poder continuar.`
          : 'Contenido visualizado. Ya puedes continuar.'}
      </p>
    </div>
  );
}

function TextoViewer({ payload, onReady }) {
  const elapsed = useElapsedSeconds();
  const [scrolledToEnd, setScrolledToEnd] = useState(!payload.texto);
  const scrollRef = useRef(null);
  const requiredSeconds = payload.texto ? minDwellSecondsForTexto(payload.texto) : 30;
  const ready = scrolledToEnd && elapsed >= requiredSeconds;

  function checkScrolled(el) {
    // Si el texto cabe completo sin necesitar scroll (textos cortos, o pantallas altas),
    // no existe ningún gesto de scroll que el usuario pueda hacer — scrollHeight es igual
    // a clientHeight y el evento "scroll" nunca se dispara. En ese caso ya se ve el 100%
    // del contenido de entrada, así que se da por leído de una vez.
    if (el.scrollHeight - el.clientHeight <= 20 || el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setScrolledToEnd(true);
    }
  }

  function onScroll(e) {
    checkScrolled(e.target);
  }

  useEffect(() => {
    if (scrollRef.current) checkScrolled(scrollRef.current);
    // Reintento breve por si el layout cambia después del primer render (fuentes, wrap).
    const id = setTimeout(() => scrollRef.current && checkScrolled(scrollRef.current), 300);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (ready) onReady({ scrolledToEnd: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="space-y-3">
      {payload.archivoUrl && (
        <iframe src={payload.archivoUrl} title="Documento" className="w-full h-96 border rounded-lg" />
      )}
      {payload.texto && (
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-64 overflow-y-auto border border-slate-300 rounded-lg p-4 whitespace-pre-wrap text-sm text-slate-700"
        >
          {payload.texto}
        </div>
      )}
      <p className="text-sm text-slate-500">
        {ready
          ? 'Contenido leído. Ya puedes continuar.'
          : `Lee hasta el final${payload.texto ? ' (desplázate hasta abajo)' : ''}. Tiempo restante estimado: ${Math.max(
              0,
              requiredSeconds - elapsed
            )}s.`}
      </p>
    </div>
  );
}

function ImagenesViewer({ payload, onReady }) {
  const imagenes = payload.imagenes || [];
  const segundos = Number(payload.segundosPorDiapositiva) || 3;
  const [index, setIndex] = useState(0);
  const [slideElapsed, setSlideElapsed] = useState(0);

  useEffect(() => {
    setSlideElapsed(0);
    const id = setInterval(() => setSlideElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [index]);

  const canAdvance = slideElapsed >= segundos;
  const isLast = index === imagenes.length - 1;

  function next() {
    if (!canAdvance) return;
    if (isLast) {
      onReady({ allSlidesViewed: true, slideCount: imagenes.length });
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (imagenes.length === 0) return <p className="text-sm text-red-600">No hay diapositivas cargadas.</p>;

  return (
    <div className="space-y-3">
      <img src={imagenes[index]} alt={`Diapositiva ${index + 1}`} className="w-full rounded-lg border" />
      <div className="flex items-center justify-between">
        <button
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="text-sm text-slate-500">
          {index + 1} / {imagenes.length}
        </span>
        <button
          disabled={!canAdvance}
          onClick={next}
          className="text-sm px-3 py-1.5 rounded-lg bg-brand-600 text-white disabled:opacity-40"
        >
          {isLast ? 'Finalizar' : 'Siguiente'}
          {!canAdvance ? ` (${segundos - slideElapsed}s)` : ''}
        </button>
      </div>
    </div>
  );
}
