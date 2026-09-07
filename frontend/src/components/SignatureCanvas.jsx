import { forwardRef, useEffect, useRef } from 'react';
import SignaturePad from 'react-signature-canvas';

const SignatureCanvas = forwardRef(function SignatureCanvas(_, ref) {
  const containerRef = useRef(null);
  const padRef = useRef(null);
  const lastWidthRef = useRef(0);

  useEffect(() => {
    function resize() {
      const pad = padRef.current;
      const container = containerRef.current;
      if (!pad || !container) return;
      const width = container.clientWidth;
      // Solo redimensionamos si el ancho cambió (ej. rotación de pantalla). En celular,
      // mostrar/ocultar la barra de direcciones dispara "resize" cambiando solo el alto; si
      // borráramos el canvas en cada uno de esos eventos se perdería la firma a mitad de trazo.
      if (width === lastWidthRef.current) return;
      lastWidthRef.current = width;

      const height = Math.round(Math.min(Math.max(window.innerHeight * 0.45, 280), 460));
      const canvas = pad.getCanvas();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.height = `${height}px`;
      canvas.getContext('2d').scale(ratio, ratio);
      pad.clear();
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
    };
  }, []);

  if (ref) {
    ref.current = {
      clear: () => padRef.current?.clear(),
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      toDataURL: () => padRef.current?.getTrimmedCanvas().toDataURL('image/png'),
    };
  }

  return (
    <div className="w-full">
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 text-center">
        Firma con el dedo (no funciona con bolígrafo o lápiz).
      </p>
      <div ref={containerRef} className="w-full">
        <SignaturePad
          ref={padRef}
          // react-signature-canvas trae su propio listener de "resize" que borra el canvas
          // (clearOnResize por defecto en true) además del nuestro de arriba. En celular, el
          // "resize" que dispara mostrar/ocultar la barra de direcciones del navegador activaba
          // ese borrado automático de la librería a mitad de la firma — deshabilitado acá porque
          // nosotros ya controlamos el resize manualmente.
          clearOnResize={false}
          penColor="#1e293b"
          minWidth={1.2}
          maxWidth={3.2}
          canvasProps={{
            className:
              'signature-pad-canvas w-full min-h-[280px] border-2 border-dashed border-slate-300 rounded-lg bg-white',
            style: { touchAction: 'none' },
          }}
        />
      </div>
    </div>
  );
});

export default SignatureCanvas;
