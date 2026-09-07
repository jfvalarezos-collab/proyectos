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

// Antes el aviso de "debes esperar N segundos" era un texto gris pequeño, fácil de no ver —
// varios trabajadores se iban de la pantalla pensando que estaba trabada (sobre todo con un
// video sin URL configurada, que se ve como un recuadro negro sin nada) y como el temporizador
// vive en el estado del componente, salir/recargar la página lo reinicia desde cero, por lo que
// el botón de continuar nunca llegaba a aparecer. Ahora el aviso es imposible de no notar.
function EsperaBadge({ remaining }) {
  if (remaining <= 0) {
    return (
      <p className="text-center text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-2">
        Contenido visto.
      </p>
    );
  }
  return (
    <div className="text-center bg-amber-50 border-2 border-amber-300 rounded-lg py-3 px-3">
      <p className="text-2xl font-bold text-amber-800 tabular-nums">{remaining}s</p>
      <p className="text-sm font-medium text-amber-800">
        No cierres ni recargues esta pantalla — espera aquí para poder continuar
      </p>
    </div>
  );
}

export default function ContentEmbed({ materialTipo, materialPayload, qrToken, participantToken, onViewed }) {
  const [error, setError] = useState('');
  const completedRef = useRef(false);

  useEffect(() => {
    startWithRetry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrToken, participantToken]);

  function startWithRetry(attempt = 0) {
    // Si esta llamada nunca llega a completarse, cada intento posterior de contentComplete
    // fallará para siempre con "Debes iniciar la visualización primero" (el backend exige
    // started_at). Se reintenta con el mismo backoff para que no quede huérfano.
    api
      .contentStart(qrToken, participantToken)
      .then(() => setError(''))
      .catch(() => {
        const delay = Math.min(30000, 1000 * 2 ** attempt);
        setTimeout(() => startWithRetry(attempt + 1), delay);
      });
  }

  function complete(evidence) {
    if (completedRef.current) return;
    completedRef.current = true;
    // El botón "Continuar" debe aparecer apenas se cumple la condición de visualización en
    // esta pantalla (timer, video terminado, diapositivas vistas), sin esperar la respuesta
    // del backend: si la llamada falla o tarda, el participante no debe quedar bloqueado.
    // La confirmación al servidor se reintenta en segundo plano (backoff exponencial hasta
    // 30s) hasta que se registre, ya que el backend exige content_progress.viewed antes de
    // aceptar el intento de quiz.
    onViewed();
    syncComplete(evidence);
  }

  function syncComplete(evidence, attempt = 0) {
    api
      .contentComplete(qrToken, participantToken, evidence)
      .then(() => setError(''))
      .catch(() => {
        setError('No se pudo confirmar con el servidor todavía. Puedes continuar; se reintentará automáticamente.');
        const delay = Math.min(30000, 1000 * 2 ** attempt);
        setTimeout(() => syncComplete(evidence, attempt + 1), delay);
      });
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
      {materialTipo === 'imagenes' && materialPayload.archivoUrl && (
        <DocumentoTimerViewer payload={materialPayload} onReady={() => complete({})} />
      )}
      {materialTipo === 'imagenes' && !materialPayload.archivoUrl && (
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
      <EsperaBadge remaining={remaining} />
    </div>
  );
}

function TextoViewer({ payload, onReady }) {
  const elapsed = useElapsedSeconds();
  const requiredSeconds = payload.texto ? minDwellSecondsForTexto(payload.texto) : 30;
  // El control real es el tiempo mínimo de permanencia, validado también en el backend.
  // Antes esto además exigía detectar scroll hasta el final, lo que en celular fallaba seguido
  // (contenedores cortos, zoom, documentos embebidos) y encima mostraba un botón interno propio
  // ("Ya terminé de ver...") que duplicaba al botón grande de ContentView un paso más abajo —
  // el trabajador hacía clic ahí y no entendía por qué tenía que volver a hacer clic en otro
  // botón casi idéntico. Ahora solo existe UN punto de continuación, en ContentView.
  const ready = elapsed >= requiredSeconds;

  useEffect(() => {
    if (ready) onReady({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="space-y-3">
      {payload.archivoUrl && (
        <iframe src={payload.archivoUrl} title="Documento" className="w-full h-96 border rounded-lg" />
      )}
      {payload.texto && (
        <div className="h-64 overflow-y-auto border border-slate-300 rounded-lg p-4 whitespace-pre-wrap text-sm text-slate-700">
          {payload.texto}
        </div>
      )}
      <EsperaBadge remaining={Math.max(0, requiredSeconds - elapsed)} />
    </div>
  );
}

const VIDEO_FILE_RE = /\.(mp4|wmv|mov|avi)$/i;

function DocumentoTimerViewer({ payload, onReady }) {
  const elapsed = useElapsedSeconds();
  const requiredSeconds = Math.max(10, (Number(payload.duracionEstimadaMin) || 1) * 60 - 5);
  const remaining = Math.max(0, requiredSeconds - elapsed);
  const ready = remaining === 0;
  const esVideo = VIDEO_FILE_RE.test(payload.archivoUrl || '');

  useEffect(() => {
    if (ready) onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="space-y-3">
      {esVideo ? (
        // Un <iframe> apuntando directo a un archivo de video no se reproduce de forma
        // confiable en todos los navegadores/celulares — un <video> nativo sí.
        <video src={payload.archivoUrl} controls className="w-full rounded-lg border bg-black" />
      ) : (
        <iframe src={payload.archivoUrl} title="Presentación" className="w-full h-96 border rounded-lg" />
      )}
      <EsperaBadge remaining={remaining} />
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
