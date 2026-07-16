import { Cable, Check, LockKeyhole, Server, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { normalizeGatewayUrl, previewIndustrialCommand } from '../../lib/industrial/gatewayClient';
import { useFactoryStore } from '../../store/factoryStore';
import { useTwinStore } from '../../store/twinStore';
import type { IndustrialCommandPreview } from '../../types/industrial';

export function TwinConnectionPanel() {
  const language = useFactoryStore((state) => state.settings.language);
  const zh = language === 'zh-CN';
  const twin = useTwinStore();
  const [urlDraft, setUrlDraft] = useState(twin.gatewayUrl);
  const [urlError, setUrlError] = useState('');
  const [preview, setPreview] = useState<IndustrialCommandPreview | null>(null);
  const [error, setError] = useState('');
  const asset = twin.snapshot.assets.find((item) => item.assetId === twin.selectedAssetId) ?? twin.snapshot.assets[0];

  const commitGatewayUrl = () => {
    try {
      const normalized = normalizeGatewayUrl(urlDraft);
      twin.setGatewayUrl(normalized);
      setUrlDraft(normalized);
      setUrlError('');
      return true;
    } catch (commitError) {
      setUrlError(commitError instanceof Error ? commitError.message : 'Invalid gateway URL');
      return false;
    }
  };

  const requestPreview = async (command: IndustrialCommandPreview['command']) => {
    if (!asset || twin.mode !== 'gateway') return;
    setError('');
    setPreview(null);
    try {
      setPreview(
        await previewIndustrialCommand(twin.gatewayUrl, {
          assetId: asset.assetId,
          command,
          requestedValue: true,
        }),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Command preview unavailable');
    }
  };

  return (
    <div className="p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
        <Cable className="h-4 w-4 text-cyan-200" />
        {zh ? '工业接入' : 'Industrial connection'}
      </div>
      <p className="mt-1 text-[10px] leading-5 text-slate-500">
        {zh ? '预设 Ignition / Sepasoft、OPC UA 与 MQTT Sparkplug B 的归一化接入口。' : 'Preset normalization boundary for Ignition / Sepasoft, OPC UA, and MQTT Sparkplug B.'}
      </p>

      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded border border-slate-800">
        <button
          type="button"
          className={`h-10 border-r border-slate-800 text-[10px] font-semibold ${twin.mode === 'demo' ? 'bg-cyan-300/10 text-cyan-100' : 'text-slate-500'}`}
          onClick={() => twin.setMode('demo')}
        >
          {zh ? '合成演示' : 'Synthetic demo'}
        </button>
        <button
          type="button"
          className={`h-10 text-[10px] font-semibold ${twin.mode === 'gateway' ? 'bg-cyan-300/10 text-cyan-100' : 'text-slate-500'}`}
          onClick={() => {
            if (commitGatewayUrl()) twin.setMode('gateway');
          }}
        >
          {zh ? '现场网关' : 'Plant gateway'}
        </button>
      </div>

      <label className="mt-4 block text-[10px] font-semibold text-slate-500" htmlFor="industrial-gateway-url">
        {zh ? '网关地址（不保存密钥）' : 'Gateway URL (no secrets stored)'}
      </label>
      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_36px] gap-1.5">
        <input
          id="industrial-gateway-url"
          type="url"
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
          onBlur={() => commitGatewayUrl()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          className="h-9 min-w-0 rounded border border-slate-700 bg-slate-900/72 px-2.5 text-[10px] text-slate-100 outline-none focus:border-cyan-300/60"
          spellCheck={false}
        />
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded border border-slate-700 text-slate-400 hover:border-cyan-300/60 hover:text-cyan-100 disabled:opacity-35"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => commitGatewayUrl()}
          disabled={urlDraft.trim() === twin.gatewayUrl}
          title={zh ? '应用网关地址' : 'Apply gateway URL'}
          aria-label={zh ? '应用网关地址' : 'Apply gateway URL'}
        >
          <Check className="h-4 w-4" />
        </button>
      </div>
      {urlError ? <div className="mt-1 text-[9px] leading-4 text-rose-200">{urlError}</div> : null}
      <div className="mt-2 flex items-center gap-2 text-[9px] text-slate-600">
        <span className={`h-1.5 w-1.5 rounded-full ${twin.connectionState === 'connected' || twin.connectionState === 'demo' ? 'bg-emerald-300' : twin.connectionState === 'connecting' ? 'bg-amber-300' : 'bg-rose-300'}`} />
        {twin.connectionMessage}
      </div>

      <div className="mt-5 border-t border-slate-800 pt-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-300">
          <Server className="h-3.5 w-3.5 text-sky-200" />
          {zh ? '参考数据路径' : 'Reference data path'}
        </div>
        <div className="mt-2 space-y-2 text-[9px] leading-5 text-slate-500">
          <div>PLC / sensors → OPC UA subscriptions → Ignition tags</div>
          <div>Ignition / Sepasoft → HTTPS or Sparkplug B → local gateway</div>
          <div>Gateway → normalized SSE snapshot → this canvas</div>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-800 pt-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-300">
          <LockKeyhole className="h-3.5 w-3.5 text-amber-200" />
          {zh ? '命令预演' : 'Command preview'}
        </div>
        <p className="mt-1 text-[9px] leading-5 text-slate-600">
          {zh ? '真实命令默认禁用。网关只为白名单资产生成短时预演凭证，执行还需独立操作员令牌与二次确认。' : 'Real commands are disabled by default. The gateway only issues short-lived previews for allowlisted assets; execution still requires a separate operator token and confirmation.'}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="h-8 rounded border border-slate-700 px-2 text-[9px] font-semibold text-slate-300 disabled:opacity-40"
            disabled={twin.mode !== 'gateway' || !asset}
            onClick={() => void requestPreview('request_hold')}
          >
            {zh ? '预演保持' : 'Preview hold'}
          </button>
          <button
            type="button"
            className="h-8 rounded border border-slate-700 px-2 text-[9px] font-semibold text-slate-300 disabled:opacity-40"
            disabled={twin.mode !== 'gateway' || !asset}
            onClick={() => void requestPreview('request_resume')}
          >
            {zh ? '预演恢复' : 'Preview resume'}
          </button>
        </div>
        {error ? <div className="mt-2 text-[9px] leading-5 text-rose-200">{error}</div> : null}
        {preview ? (
          <div className="mt-3 rounded border border-amber-300/25 bg-amber-300/8 p-2.5 text-[9px] leading-5 text-amber-50">
            <div className="font-semibold">{preview.command} · {preview.assetId}</div>
            <div className="mt-1 text-amber-100/70">{preview.impact}</div>
            <div className="mt-1 text-amber-100/55">{preview.interlocks.join(' · ')}</div>
            <div className="mt-1 text-amber-100/55">{zh ? '预演止于这里，不会执行。' : 'Preview stops here; no command is executed.'}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex gap-2 border-t border-slate-800 pt-4 text-[9px] leading-5 text-slate-600">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
        {zh ? 'API 密钥只存在网关环境变量中；浏览器、场景 JSON、日志和 GitHub Pages 都不会接触密钥。' : 'API keys remain in gateway environment variables; the browser, scenarios, logs, and GitHub Pages never receive them.'}
      </div>
    </div>
  );
}
