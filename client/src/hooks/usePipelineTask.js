import { useState, useRef, useCallback } from 'react';
import { runPipelineTask, getTaskStatus } from '../utils/api.js';

const POLL_INTERVAL = 2000;

export function usePipelineTask() {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const run = useCallback(async (type, originalTaskId, options = {}) => {
    stopPolling();
    setStatus('queued');
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const taskId = await runPipelineTask(type, originalTaskId, options);

      timerRef.current = setInterval(async () => {
        try {
          const data = await getTaskStatus(taskId);
          setStatus(data.status);
          setProgress(data.progress || 0);

          if (data.status === 'success') {
            stopPolling();
            setResult(data);
            setProgress(100);
          } else if (['failed', 'cancelled'].includes(data.status)) {
            stopPolling();
            setError('任务失败，请重试。');
          }
        } catch {
          stopPolling();
          setStatus('failed');
          setError('连接错误，请检查网络。');
        }
      }, POLL_INTERVAL);
    } catch (err) {
      setStatus('failed');
      setError(err.response?.data?.error || '任务启动失败。');
    }
  }, [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setError(null);
  }, [stopPolling]);

  return { status, progress, result, error, run, reset };
}
