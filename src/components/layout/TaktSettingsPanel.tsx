import { Info } from 'lucide-react';
import { t } from '../../i18n/text';
import { calculateStationTakts, formatNumber, getTaktFormulaNotes } from '../../lib/takt';
import type { DeviceMetrics, DeviceParameters, Language } from '../../types/factory';
import { Field, NumberField, Section } from './parameterPanelParts';

export function TaktSettingsPanel({
  params,
  metrics,
  language,
  onPatch,
}: {
  params: DeviceParameters;
  metrics: DeviceMetrics;
  language: Language;
  onPatch: (patch: Partial<DeviceParameters>) => void;
}) {
  const label = (zh: string, en: string) => (language === 'zh-CN' ? zh : en);
  const notes = getTaktFormulaNotes(params, language);
  const stationTakts = calculateStationTakts(params);
  const isCalculated = params.taktMode !== 'manual';
  const isSf = params.processFamily === 'superfinishing';
  const isGauge = params.processFamily === 'gauge';
  const isGrinding = params.processFamily === 'grinding';
  const stationFieldsEnabled = params.deviceType !== 'spin_dryer' && !isSf;

  return (
    <>
      <section className="mt-3" data-testid="takt-settings-tabs">
        <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">
          {label('节拍设置', 'Takt settings')}
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-md border border-slate-800 bg-slate-900/52 p-1">
          <button
            type="button"
            data-testid="takt-tab-calculated"
            className={`editable-field rounded px-2 py-2 text-xs font-semibold transition ${
              isCalculated
                ? 'border border-cyan-300/40 bg-cyan-300/16 text-cyan-50'
                : 'border border-transparent text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
            }`}
            data-help={label('按加工动作、修整、耗材、良率和稼动率计算节拍，并在仿真中体现停机。', 'Calculate takt from actions, dressing, consumables, yield and availability; downtime is simulated.')}
            onClick={() => onPatch({ taktMode: 'calculated' })}
          >
            {label('参数精算', 'Calculated')}
          </button>
          <button
            type="button"
            data-testid="takt-tab-manual"
            className={`editable-field rounded px-2 py-2 text-xs font-semibold transition ${
              !isCalculated
                ? 'border border-amber-300/45 bg-amber-300/16 text-amber-50'
                : 'border border-transparent text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
            }`}
            data-help={label('直接输入单件总节拍，适合快速搭线；不会仿真修整、耗材和良率损失。', 'Enter fixed single-piece takt for quick layout; dressing, consumables and yield loss are skipped.')}
            onClick={() => onPatch({ taktMode: 'manual' })}
          >
            {label('直接节拍', 'Manual takt')}
          </button>
        </div>
      </section>

      {isCalculated ? (
        <div data-testid="calculated-takt-panel">
          {isSf ? (
            <SuperfinishingCalculatedPanel params={params} language={language} onPatch={onPatch} />
          ) : (
            <Section title={label('参数精算', 'Calculated parameters')}>
              <NumberField
                label={isGauge ? label('单次检测数量', 'Inspect quantity') : label('单次加工数量', 'Batch quantity')}
                params={params}
                paramKey="batchSize"
                onPatch={onPatch}
                min={1}
              />
              <NumberField
                label={isGauge ? label('检测一轮时间 秒', 'Inspection cycle sec') : label('正常加工一轮时间 秒', 'Process cycle sec')}
                params={params}
                paramKey="processTimeSec"
                onPatch={onPatch}
                step={0.1}
                min={0.1}
              />
              <NumberField label={label('设备数量', 'Machine count')} params={params} paramKey="machineCount" onPatch={onPatch} min={1} />
              <NumberField label={label('稼动率 0-1', 'Availability 0-1')} params={params} paramKey="availability" onPatch={onPatch} step={0.01} min={0} />
              <NumberField label={label('良率 0-1', 'Yield 0-1')} params={params} paramKey="yieldRate" onPatch={onPatch} step={0.001} min={0} />
              {isGauge ? (
                <NumberField label={label('NG 比例 0-1', 'NG ratio 0-1')} params={params} paramKey="ngRate" onPatch={onPatch} step={0.001} min={0} />
              ) : null}
            </Section>
          )}
        </div>
      ) : (
        <div data-testid="manual-takt-panel">
          <Section title={label('直接节拍', 'Manual takt')}>
            <NumberField label={label('单件总节拍 秒', 'Single-piece takt sec')} params={params} paramKey="manualTaktSec" onPatch={onPatch} step={0.1} min={0.1} />
            <NumberField label={label('设备数量', 'Machine count')} params={params} paramKey="machineCount" onPatch={onPatch} min={1} />
            <div className="col-span-2 rounded border border-amber-300/18 bg-amber-300/8 px-3 py-2 text-xs text-amber-100">
              {label('简化模式只按固定单件节拍仿真，不触发修整、换耗材和良率损失。', 'Manual mode uses fixed takt only and skips dressing, consumables and yield loss.')}
            </div>
          </Section>
        </div>
      )}

      {stationFieldsEnabled && isCalculated ? (
        <Section title={label('双工位节拍', 'Dual-station takt')}>
          <Field label={label('工位1启用', 'Station 1 enabled')} type="checkbox" value={params.station1Enabled} onChange={(value) => onPatch({ station1Enabled: Boolean(value) })} />
          <Field label={label('工位2启用', 'Station 2 enabled')} type="checkbox" value={params.station2Enabled} onChange={(value) => onPatch({ station2Enabled: Boolean(value) })} />
          <NumberField label={label('工位1单次数量', 'Station 1 batch')} params={params} paramKey="station1BatchSize" onPatch={onPatch} min={1} />
          <NumberField label={label('工位1一轮时间 秒', 'Station 1 cycle sec')} params={params} paramKey="station1ProcessTimeSec" onPatch={onPatch} step={0.1} min={0.1} />
          <NumberField label={label('工位2单次数量', 'Station 2 batch')} params={params} paramKey="station2BatchSize" onPatch={onPatch} min={1} />
          <NumberField label={label('工位2一轮时间 秒', 'Station 2 cycle sec')} params={params} paramKey="station2ProcessTimeSec" onPatch={onPatch} step={0.1} min={0.1} />
          <div className="col-span-2 rounded border border-cyan-300/18 bg-cyan-300/8 px-3 py-2 text-xs text-cyan-100">
            S1 {formatNumber(stationTakts.station1Takt, 2)}s / S2 {formatNumber(stationTakts.station2Takt, 2)}s /{' '}
            {label('合成基础节拍', 'Combined base takt')} {formatNumber(stationTakts.combinedBaseTakt, 2)}s
          </div>
        </Section>
      ) : null}

      {isCalculated && (isGrinding || isSf) ? (
        <Section title={label('修整与耗材', 'Dressing and consumables')}>
          {isGrinding ? (
            <>
              <NumberField label={label('修整间隔 件', 'Dressing interval pcs')} params={params} paramKey="dressingIntervalUnits" onPatch={onPatch} min={0} />
              <NumberField label={label('修整时间 秒', 'Dressing time sec')} params={params} paramKey="dressingDurationSec" onPatch={onPatch} min={0} />
            </>
          ) : null}
          <NumberField label={label('换耗材间隔 件', 'Consumable interval pcs')} params={params} paramKey="consumableIntervalUnits" onPatch={onPatch} min={0} />
          <NumberField label={label('换耗材时间 秒', 'Consumable change sec')} params={params} paramKey="consumableChangeSec" onPatch={onPatch} min={0} />
        </Section>
      ) : null}

      <div className="mt-3 rounded border border-cyan-300/18 bg-cyan-300/8 p-3 text-xs text-cyan-100">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <Info className="h-4 w-4" />
          {t(language, 'taktCalculator')}
        </div>
        <div className="space-y-1 text-cyan-50/80">
          {notes.map((note) => (
            <div key={note}>{note}</div>
          ))}
          <div>{label('每日有效产能', 'Daily effective capacity')} = {formatNumber(metrics.dailyEffectiveCapacity, 0)} pcs/day</div>
        </div>
      </div>
    </>
  );
}

function SuperfinishingCalculatedPanel({
  params,
  language,
  onPatch,
}: {
  params: DeviceParameters;
  language: Language;
  onPatch: (patch: Partial<DeviceParameters>) => void;
}) {
  const label = (zh: string, en: string) => (language === 'zh-CN' ? zh : en);
  const stationTakts = calculateStationTakts(params);
  return (
    <>
      <Section title={label('超精结构', 'Superfinishing structure')}>
        <label
          className="editable-field col-span-2 block rounded border border-slate-800 bg-slate-900/52 px-3 py-2"
          data-help={label('选择超精内部结构；不同模式会改变输入口、工位流向和节拍计算方式。', 'Choose SF internal structure; this changes ports, station flow and takt calculation.')}
        >
          <span className="text-[11px] text-slate-500">{label('超精模式', 'Superfinishing mode')}</span>
          <select
            value={params.superfinishingMode}
            onChange={(event) => onPatch({ superfinishingMode: event.target.value as DeviceParameters['superfinishingMode'] })}
            className="mt-1 w-full bg-slate-950 text-sm font-semibold text-slate-100 outline-none"
          >
            <option value="single_station_once">{label('一次超精 / 单工位', 'Single station once')}</option>
            <option value="parallel_once">{label('一次超精 / 双工位并联', 'Parallel stations once')}</option>
            <option value="serial_twice">{label('二次超精 / 串联双工位', 'Serial stations twice')}</option>
          </select>
        </label>
        <NumberField label={label('设备数量', 'Machine count')} params={params} paramKey="machineCount" onPatch={onPatch} min={1} />
        <NumberField label={label('稼动率 0-1', 'Availability 0-1')} params={params} paramKey="availability" onPatch={onPatch} step={0.01} min={0} />
        <NumberField label={label('良率 0-1', 'Yield 0-1')} params={params} paramKey="yieldRate" onPatch={onPatch} step={0.001} min={0} />
        <NumberField label={label('NG 比例 0-1', 'NG ratio 0-1')} params={params} paramKey="ngRate" onPatch={onPatch} step={0.001} min={0} />
      </Section>

      {params.superfinishingMode === 'single_station_once' ? (
        <Section title={label('一次超精单工位', 'Single-station once')}>
          <NumberField label={label('单次加工数量', 'Batch quantity')} params={params} paramKey="station1BatchSize" onPatch={onPatch} min={1} />
          <NumberField label={label('单工位超精时间 秒', 'Superfinishing time sec')} params={params} paramKey="station1ProcessTimeSec" onPatch={onPatch} step={0.1} min={0.1} />
          <div className="col-span-2 rounded border border-cyan-300/18 bg-cyan-300/8 px-3 py-2 text-xs text-cyan-100">
            {label('参与计算：单工位超精时间 / 单次加工数量。', 'Used in calculation: station time / batch quantity.')}
          </div>
        </Section>
      ) : null}

      {params.superfinishingMode === 'parallel_once' ? (
        <Section title={label('一次超精双工位并联', 'Parallel stations once')}>
          <NumberField label={label('工位1单次数量', 'Station 1 batch')} params={params} paramKey="station1BatchSize" onPatch={onPatch} min={1} />
          <NumberField label={label('工位1超精时间 秒', 'Station 1 time sec')} params={params} paramKey="station1ProcessTimeSec" onPatch={onPatch} step={0.1} min={0.1} />
          <NumberField label={label('工位2单次数量', 'Station 2 batch')} params={params} paramKey="station2BatchSize" onPatch={onPatch} min={1} />
          <NumberField label={label('工位2超精时间 秒', 'Station 2 time sec')} params={params} paramKey="station2ProcessTimeSec" onPatch={onPatch} step={0.1} min={0.1} />
          <NumberField label={label('工位1前缓存上限', 'Station 1 input cap')} params={params} paramKey="station1InputBufferCapacity" onPatch={onPatch} min={0} />
          <NumberField label={label('工位2前缓存上限', 'Station 2 input cap')} params={params} paramKey="station2InputBufferCapacity" onPatch={onPatch} min={0} />
          <div className="col-span-2 rounded border border-cyan-300/18 bg-cyan-300/8 px-3 py-2 text-xs text-cyan-100">
            {label('两个工位独立加工，机械手默认优先给存料更低的工位。', 'Stations run independently; loader prefers the lower-WIP station.')}
          </div>
        </Section>
      ) : null}

      {params.superfinishingMode === 'serial_twice' ? (
        <Section title={label('二次超精串联', 'Serial two-pass superfinishing')}>
          <NumberField label={label('一次超精单次数量', 'First pass batch')} params={params} paramKey="station1BatchSize" onPatch={onPatch} min={1} />
          <NumberField label={label('一次超精时间 秒', 'First pass time sec')} params={params} paramKey="firstPassProcessTimeSec" onPatch={onPatch} step={0.1} min={0.1} />
          <NumberField label={label('二次超精单次数量', 'Second pass batch')} params={params} paramKey="station2BatchSize" onPatch={onPatch} min={1} />
          <NumberField label={label('二次超精时间 秒', 'Second pass time sec')} params={params} paramKey="secondPassProcessTimeSec" onPatch={onPatch} step={0.1} min={0.1} />
          <NumberField label={label('工位1前缓存上限', 'Station 1 input cap')} params={params} paramKey="station1InputBufferCapacity" onPatch={onPatch} min={0} />
          <NumberField label={label('工位2前缓存上限', 'Station 2 input cap')} params={params} paramKey="station2InputBufferCapacity" onPatch={onPatch} min={0} />
          <div className="col-span-2 rounded border border-violet-300/18 bg-violet-300/8 px-3 py-2 text-xs text-violet-100">
            {label('串联逻辑：工位1完成后进入工位2，工位2完成后才汇入机器输出。', 'Serial logic: station 1 feeds station 2; only station 2 releases final output.')}
          </div>
        </Section>
      ) : null}

      <div className="mt-3 rounded border border-cyan-300/18 bg-cyan-300/8 px-3 py-2 text-xs text-cyan-100">
        S1 {formatNumber(stationTakts.station1Takt, 2)}s / S2 {formatNumber(stationTakts.station2Takt, 2)}s /{' '}
        {label('合成基础节拍', 'Combined base takt')} {formatNumber(stationTakts.combinedBaseTakt, 2)}s
      </div>
    </>
  );
}
