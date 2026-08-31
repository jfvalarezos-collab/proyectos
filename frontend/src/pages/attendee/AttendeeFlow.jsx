import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { getParticipantToken } from '../../lib/participant.js';
import ContentView from './ContentView.jsx';
import Quiz from './Quiz.jsx';
import AttendeeForm from './AttendeeForm.jsx';
import SignatureStep from './SignatureStep.jsx';
import Success from './Success.jsx';
import Blocked from './Blocked.jsx';

export default function AttendeeFlow() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState('loading');
  const [formData, setFormData] = useState({ nombre: '', cedula: '', cargo: '' });
  const [ultimoResultado, setUltimoResultado] = useState(null);

  const participantToken = token ? getParticipantToken(token) : null;

  const bootstrap = useCallback(async () => {
    try {
      const s = await api.getPublicSession(token);
      setSession(s);

      const me = await api.attendeeMe(token, participantToken);
      if (me.registered) {
        setStep('success');
        return;
      }

      const attemptsInfo = await api.quizAttempts(token, participantToken);
      if (attemptsInfo.bloqueado) {
        setStep('blocked');
        return;
      }
      if (attemptsInfo.aprobadoAlguna) {
        setStep('form');
        return;
      }

      const contentInfo = await api.contentStatus(token, participantToken);
      setStep(contentInfo.viewed ? 'quiz' : 'content');
    } catch (err) {
      setLoadError(err.message);
    }
  }, [token, participantToken]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (loadError) {
    return (
      <CenteredCard>
        <p className="text-red-600 font-medium">{loadError}</p>
      </CenteredCard>
    );
  }

  if (step === 'loading' || !session) {
    return (
      <CenteredCard>
        <p className="text-slate-500">Cargando…</p>
      </CenteredCard>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-md mx-auto">
        <header className="mb-4">
          <h1 className="text-lg font-semibold text-slate-800">{session.temasTratados || 'Capacitación'}</h1>
          <p className="text-sm text-slate-500">
            {session.ciudad} · {session.lugar} · {session.fecha}
          </p>
        </header>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          {step === 'content' && (
            <ContentView
              session={session}
              qrToken={token}
              participantToken={participantToken}
              onContinue={() => setStep('quiz')}
            />
          )}

          {step === 'quiz' && (
            <Quiz
              session={session}
              qrToken={token}
              participantToken={participantToken}
              onAprobado={(resultado) => {
                setUltimoResultado(resultado);
                setStep('form');
              }}
              onBloqueado={() => setStep('blocked')}
            />
          )}

          {step === 'form' && (
            <AttendeeForm
              initial={formData}
              onNext={(data) => {
                setFormData(data);
                setStep('signature');
              }}
            />
          )}

          {step === 'signature' && (
            <SignatureStep
              qrToken={token}
              participantToken={participantToken}
              formData={formData}
              onBack={() => setStep('form')}
              onSuccess={() => setStep('success')}
            />
          )}

          {step === 'success' && <Success resultado={ultimoResultado} />}
          {step === 'blocked' && <Blocked />}
        </div>
      </div>
    </div>
  );
}

function CenteredCard({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full text-center">
        {children}
      </div>
    </div>
  );
}
