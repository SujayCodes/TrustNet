import { useEffect, useState } from 'react';
import api from '../api/client';
import Modal from './Modal';
import { PrimaryButton } from './ui';

export default function ChallengeModal({ skillName, onClose, onDone }) {
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get(`/challenges/${encodeURIComponent(skillName)}`).then(({ data }) => setQuestions(data.questions));
  }, [skillName]);

  const submit = async () => {
    const { data } = await api.post(`/challenges/${encodeURIComponent(skillName)}/submit`, { answers });
    setResult(data);
    onDone?.();
  };

  return (
    <Modal title={`${skillName} verification challenge`} onClose={onClose}>
      {!questions && <p className="text-mist text-sm">Loading questions...</p>}
      {result ? (
        <div className="text-center py-4">
          <div className={`font-mono text-3xl font-bold ${result.passed ? 'text-teal-bright' : 'text-rose'}`}>{result.score}%</div>
          <p className="text-mist text-sm mt-2">{result.correct} of {result.total} correct</p>
          <p className="text-sm mt-2">{result.passed ? 'Passed — this skill is now marked as challenge-verified.' : 'Not quite — score 60% or higher to pass. Try again anytime.'}</p>
          <PrimaryButton onClick={onClose} className="mt-4">Close</PrimaryButton>
        </div>
      ) : (
        questions && (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {questions.map((q) => (
              <div key={q.id}>
                <p className="text-sm text-paper mb-1.5">{q.q}</p>
                <div className="space-y-1">
                  {q.options.map((opt, i) => (
                    <label key={i} className="flex items-center gap-2 text-xs text-mist cursor-pointer">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === i}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <PrimaryButton onClick={submit} className="w-full" disabled={Object.keys(answers).length < questions.length}>
              Submit answers
            </PrimaryButton>
          </div>
        )
      )}
    </Modal>
  );
}
