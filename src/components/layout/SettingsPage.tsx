import { Clock3, Gauge, Grid3X3, Languages, SlidersHorizontal } from 'lucide-react';
import { t } from '../../i18n/text';
import { useFactoryStore } from '../../store/factoryStore';
import type {
  AnimationIntensity,
  CardDensity,
  Language,
  SimulationTargetMode,
  ThemeMode,
} from '../../types/factory';
import { NumberStepper } from '../ui/NumberStepper';

export function SettingsPage() {
  const settings = useFactoryStore((state) => state.settings);
  const updateSettings = useFactoryStore((state) => state.updateSettings);
  const zh = settings.language === 'zh-CN';

  return (
    <main className="settings-page h-full overflow-y-auto bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-200">{t(settings.language, 'settings')}</div>
          <h2 className="mt-2 text-2xl font-semibold">{zh ? '软件设置' : 'Factory Console Settings'}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {zh
              ? '管理深色/浅色主题、动画强度、网格对齐和后台仿真目标。'
              : 'Control dark/light themes, animation intensity, snap behavior, and background simulation targets.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <SettingCard icon={<Languages className="h-5 w-5" />} title={t(settings.language, 'language')}>
            <Segmented
              value={settings.language}
              options={[
                ['zh-CN', '中文'],
                ['en', 'English'],
              ]}
              onChange={(value) => updateSettings({ language: value as Language })}
            />
          </SettingCard>

          <SettingCard icon={<SlidersHorizontal className="h-5 w-5" />} title={t(settings.language, 'themeMode')}>
            <Segmented
              value={settings.themeMode}
              options={[
                ['dark', t(settings.language, 'dark')],
                ['light', t(settings.language, 'light')],
              ]}
              onChange={(value) => updateSettings({ themeMode: value as ThemeMode })}
            />
          </SettingCard>

          <SettingCard icon={<SlidersHorizontal className="h-5 w-5" />} title={t(settings.language, 'animation')}>
            <Segmented
              value={settings.animationIntensity}
              options={[
                ['off', t(settings.language, 'off')],
                ['low', t(settings.language, 'low')],
                ['standard', t(settings.language, 'standard')],
                ['showcase', t(settings.language, 'showcase')],
              ]}
              onChange={(value) => updateSettings({ animationIntensity: value as AnimationIntensity })}
            />
          </SettingCard>

          <SettingCard icon={<Gauge className="h-5 w-5" />} title={t(settings.language, 'density')}>
            <Segmented
              value={settings.cardDensity}
              options={[
                ['compact', t(settings.language, 'compact')],
                ['standard', t(settings.language, 'standard')],
              ]}
              onChange={(value) => updateSettings({ cardDensity: value as CardDensity })}
            />
          </SettingCard>
          <SettingCard icon={<Grid3X3 className="h-5 w-5" />} title={zh ? '画布操作' : 'Canvas behavior'}>
            <Segmented
              value={settings.snapToGrid ? 'snap' : 'free'}
              options={[
                ['snap', zh ? '网格对齐' : 'Grid snap'],
                ['free', zh ? '自由放置' : 'Free'],
              ]}
              onChange={(value) => updateSettings({ snapToGrid: value === 'snap' })}
            />
            <Segmented
              className="mt-3"
              value={settings.hideText ? 'hidden' : 'shown'}
              options={[
                ['shown', zh ? '显示文字' : 'Text on'],
                ['hidden', zh ? '隐藏文字' : 'Text off'],
              ]}
              onChange={(value) => updateSettings({ hideText: value === 'hidden' })}
            />
          </SettingCard>

          <SettingCard icon={<Clock3 className="h-5 w-5" />} title={zh ? '后台仿真目标' : 'Background target'}>
            <Segmented
              value={settings.simulationTargetMode}
              options={[
                ['time', zh ? '按时间' : 'By time'],
                ['output', zh ? '按产量' : 'By output'],
              ]}
              onChange={(value) => updateSettings({ simulationTargetMode: value as SimulationTargetMode })}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <NumberStepper
                label={zh ? '目标小时' : 'Target hours'}
                value={settings.simulationTargetHours}
                min={0.1}
                step={0.5}
                onChange={(value) => updateSettings({ simulationTargetHours: value })}
              />
              <NumberStepper
                label={zh ? '目标产出' : 'Target output'}
                value={settings.simulationTargetOutput}
                min={1}
                step={100}
                onChange={(value) => updateSettings({ simulationTargetOutput: value })}
              />
              <NumberStepper
                label={zh ? '后台步长秒' : 'Step seconds'}
                value={settings.backgroundStepSec}
                min={0.1}
                max={5}
                step={0.1}
                precision={1}
                onChange={(value) => updateSettings({ backgroundStepSec: value })}
              />
            </div>
          </SettingCard>
        </div>
      </div>
    </main>
  );
}

function SettingCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="settings-card rounded border border-slate-800 bg-slate-900/55 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <span className="text-cyan-200">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function Segmented({
  value,
  options,
  onChange,
  className = '',
}: {
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          className={`editable-field rounded border px-3 py-1.5 text-xs transition ${
            value === optionValue
              ? 'border-cyan-300 bg-cyan-300/12 text-cyan-100'
              : 'border-slate-700 bg-slate-950/40 text-slate-400 hover:border-slate-500'
          }`}
          data-help={`切换为「${label}」设置。`}
          onClick={() => onChange(optionValue)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
