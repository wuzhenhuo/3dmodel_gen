import { useCallback, useRef, useState } from 'react';
import PromptInput from './components/PromptInput.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import ModelViewer from './components/ModelViewer.jsx';
import History, { saveToHistory } from './components/History.jsx';
import PostProcessPanel from './components/PostProcessPanel.jsx';
import { useTaskPolling } from './hooks/useTaskPolling.js';
import { getDownloadUrl } from './utils/api.js';

function EmptyState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 select-none pointer-events-none">
      <div className="w-28 h-28 rounded-3xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center">
        <svg className="w-14 h-14 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
            d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      </div>
      <div className="text-center space-y-1">
        <p className="text-gray-400 font-medium">在左侧输入描述或上传图片</p>
        <p className="text-gray-600 text-sm">支持文字转3D · 图片转3D</p>
      </div>
    </div>
  );
}

export default function App() {
  const { status, progress, result, error, generate, reset } = useTaskPolling();
  const isGenerating = ['uploading', 'queued', 'running'].includes(status);

  // Pipeline result can override the viewer (e.g. animated model)
  const [pipelinePreview, setPipelinePreview] = useState(null); // { url, label }
  const localFileInputRef = useRef(null);
  const localObjectUrlRef = useRef(null);

  const handleLocalFileOpen = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke previous object URL to free memory
    if (localObjectUrlRef.current) URL.revokeObjectURL(localObjectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    localObjectUrlRef.current = objectUrl;
    const ext = file.name.split('.').pop().toLowerCase();
    setPipelinePreview({ url: objectUrl, label: file.name, fileType: ext });
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }, []);

  const handleSave = useCallback(() => {
    if (result) {
      saveToHistory({
        mode: 'generated',
        prompt: 'Generated model',
        model_url: result.model_url,
        pbr_model_url: result.pbr_model_url,
      });
    }
  }, [result]);

  const handleReset = useCallback(() => {
    reset();
    setPipelinePreview(null);
  }, [reset]);

  // Base model URL from generation result
  const baseModelUrl = result?.model_url
    ? getDownloadUrl(result.model_url)
    : result?.pbr_model_url
      ? getDownloadUrl(result.pbr_model_url)
      : null;

  // Pipeline result takes priority in the viewer
  const activeViewerUrl = pipelinePreview?.url ?? baseModelUrl;
  const activeViewerLabel = pipelinePreview?.label ?? null;
  const activeViewerFileType = pipelinePreview?.fileType ?? 'gltf';

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-gray-800 bg-gray-900/70 backdrop-blur">
        {/* Studio branding banner */}
        <div className="text-center py-1.5 border-b border-gray-800/60 bg-gray-900/40">
          <p className="text-xs font-medium tracking-widest text-gray-400 uppercase">
            吴振数字雕塑工作室 &nbsp;·&nbsp; 明日剧场 &nbsp;·&nbsp; 2026
          </p>
        </div>
        {/* App bar */}
        <div className="flex items-center justify-between px-5 py-2.5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <svg className="w-4 h-4" fill="none" stroke="white" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
            <h1 className="text-base font-bold text-white tracking-tight">
              <span className="text-indigo-400">WuZhen</span> Studio
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {pipelinePreview && (
              <button
                onClick={() => setPipelinePreview(null)}
                className="text-xs text-gray-500 hover:text-gray-300 transition"
              >
                ← 返回原始模型
              </button>
            )}
            <button
              onClick={() => localFileInputRef.current?.click()}
              className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700/50 rounded text-gray-300 hover:text-white transition"
            >
              上传文件预览
            </button>
            <input
              ref={localFileInputRef}
              type="file"
              accept=".glb,.gltf,.fbx"
              className="hidden"
              onChange={handleLocalFileOpen}
            />
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────── */}
        <aside className="w-72 flex-shrink-0 border-r border-gray-800 bg-gray-900/50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <PromptInput onGenerate={generate} disabled={isGenerating} />

            {status !== 'idle' && (
              <div className="bg-gray-800/50 rounded-xl p-3 space-y-2">
                <ProgressBar status={status} progress={progress} error={error} />
                {status === 'failed' && (
                  <button
                    onClick={handleReset}
                    className="w-full py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
                  >
                    重试
                  </button>
                )}
              </div>
            )}
          </div>

          {/* History pinned at bottom */}
          <div className="flex-shrink-0 border-t border-gray-800 p-4">
            <History />
          </div>
        </aside>

        {/* ── Main Area ────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Viewer */}
          <div className="flex-1 relative overflow-hidden bg-gray-950">
            {activeViewerUrl ? (
              <ModelViewer modelUrl={activeViewerUrl} label={activeViewerLabel} fileType={activeViewerFileType} />
            ) : (
              <EmptyState />
            )}
          </div>

          {/* Action bar after successful generation */}
          {status === 'success' && result && (
            <div className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 border-t border-gray-800 bg-gray-900/80 backdrop-blur">
              <span className="text-xs text-emerald-400 font-medium flex-1">✓ 模型生成成功</span>
              {result.model_url && (
                <a
                  href={getDownloadUrl(result.model_url)}
                  download
                  className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium transition"
                >
                  下载 GLB
                </a>
              )}
              {result.pbr_model_url && (
                <a
                  href={getDownloadUrl(result.pbr_model_url)}
                  download
                  className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white font-medium transition"
                >
                  下载 PBR
                </a>
              )}
              <button
                onClick={() => { handleSave(); handleReset(); }}
                className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition"
              >
                新建
              </button>
            </div>
          )}

          {/* Pipeline panel — only after successful generation */}
          {status === 'success' && result?.task_id && (
            <PostProcessPanel
              taskId={result.task_id}
              onPreview={setPipelinePreview}
            />
          )}
        </main>
      </div>
    </div>
  );
}
