import { useState, useCallback } from 'react';
import { analyzePrompt, optimizePrompt, TEMPLATE_PROMPTS } from '../utils/promptOptimizer.js';

export default function PromptInput({ onGenerate, disabled }) {
  const [mode, setMode] = useState('text');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const analysis = analyzePrompt(prompt);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'text' && !prompt.trim()) return;
    if (mode === 'image' && !imageFile) return;
    const optimizedPrompt = mode === 'text' ? optimizePrompt(prompt) : '';
    onGenerate({ mode, prompt: optimizedPrompt, negative_prompt: negativePrompt || undefined, imageFile });
  };

  const applyTemplate = (tpl) => {
    setPrompt(tpl.prompt);
    setMode('text');
    setShowTemplates(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* Section label */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">生成模式</p>

      {/* Mode tabs */}
      <div className="flex gap-1.5 bg-gray-800/60 rounded-lg p-1">
        {['text', 'image'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
              mode === m ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            {m === 'text' ? '文字转3D' : '图片转3D'}
          </button>
        ))}
      </div>

      {/* Text mode */}
      {mode === 'text' && (
        <>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想生成的3D模型... (例如：一个带金色装饰的木制宝箱)"
            rows={4}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            disabled={disabled}
          />

          {/* Prompt quality bar */}
          {prompt.trim().length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      analysis.score >= 70 ? 'bg-emerald-500' : analysis.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${analysis.score}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">质量 {analysis.score}%</span>
              </div>
              {analysis.issues.map((issue, i) => (
                <p key={i} className="text-xs text-red-400">· {issue}</p>
              ))}
              {analysis.suggestions.map((s, i) => (
                <p key={i} className="text-xs text-yellow-500">· {s}</p>
              ))}
            </div>
          )}

          {/* Templates */}
          <div>
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              {showTemplates ? '收起模板' : '使用模板提示词'}
            </button>
            {showTemplates && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {TEMPLATE_PROMPTS.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="px-2 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-left text-gray-300 truncate transition"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Image mode */}
      {mode === 'image' && (
        <div className="space-y-2">
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-indigo-500 transition overflow-hidden">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-gray-500 px-4">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs">点击或拖拽上传图片</p>
                <p className="text-xs text-gray-600 mt-0.5">JPG · PNG · WebP (最大 20MB)</p>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
              disabled={disabled}
            />
          </label>
          {imageFile && (
            <button
              type="button"
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              className="text-xs text-red-400 hover:text-red-300 transition"
            >
              移除图片
            </button>
          )}
        </div>
      )}

      {/* Advanced */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-gray-500 hover:text-gray-400 transition"
        >
          {showAdvanced ? '收起' : '高级选项'} ▾
        </button>
        {showAdvanced && (
          <div className="mt-2">
            <label className="block text-xs text-gray-500 mb-1">负面提示词（排除元素）</label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="例如：模糊、低质量、变形"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={disabled || (mode === 'text' && !prompt.trim()) || (mode === 'image' && !imageFile)}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-xl transition"
      >
        {disabled ? '生成中...' : '生成3D模型'}
      </button>
    </form>
  );
}
