import { forwardRef, useEffect, useRef } from 'react';
import SignaturePad from 'react-signature-canvas';

const SignatureCanvas = forwardRef(function SignatureCanvas(_, ref) {
  const containerRef = useRef(null);
  const padRef = useRef(null);

  useEffect(() => {
    function resize() {
      const pad = padRef.current;
      const container = containerRef.current;
      if (!pad || !container) return;
      const canvas = pad.getCanvas();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = container.clientWidth * ratio;
      canvas.height = 220 * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      pad.clear();
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  if (ref) {
    ref.current = {
      clear: () => padRef.current?.clear(),
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      toDataURL: () => padRef.current?.getTrimmedCanvas().toDataURL('image/png'),
    };
  }

  return (
    <div ref={containerRef} className="w-full">
      <SignaturePad
        ref={padRef}
        canvasProps={{
          className: 'signature-pad-canvas w-full border border-slate-300 rounded-lg bg-white',
          style: { height: 220, touchAction: 'none' },
        }}
      />
    </div>
  );
});

export default SignatureCanvas;
