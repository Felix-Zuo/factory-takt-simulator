import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const releaseDir = join(root, 'release');
const unpackedDir = join(releaseDir, 'win-unpacked');
const portableExe = join(releaseDir, `Factory_Takt_Simulator_Portable_${pkg.version}_x64.exe`);
const appAsar = join(unpackedDir, 'resources', 'app.asar');
const workDir = join(releaseDir, 'single-exe-update-work');
const buildId = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '_');
const updateName = `Factory_Takt_Simulator_SingleExe_Update_${pkg.version}_${buildId}.exe`;
const updateExe = join(releaseDir, updateName);

function fail(message) {
  console.error(`[single-exe-update] ${message}`);
  process.exit(1);
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase();
}

function ensureFile(path, label) {
  if (!existsSync(path)) fail(`${label} not found: ${path}`);
}

function cleanDir(path) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function writeUtf8Bom(path, content) {
  writeFileSync(path, `\uFEFF${content.replace(/\n/g, '\r\n')}`, 'utf8');
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
    windowsHide: true,
  });
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForFile(path, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (existsSync(path)) return true;
    sleep(250);
  }
  return existsSync(path);
}

ensureFile(portableExe, 'Portable exe payload');
ensureFile(appAsar, 'Folder portable app.asar payload');

cleanDir(workDir);
copyFileSync(portableExe, join(workDir, 'Factory Takt Simulator.exe'));
copyFileSync(appAsar, join(workDir, 'app.asar'));

const manifest = {
  app: pkg.name,
  productName: pkg.build?.productName || 'Factory Takt Simulator',
  version: pkg.version,
  buildId,
  generatedAt: new Date().toISOString(),
  payloads: {
    portableExe: {
      file: 'Factory Takt Simulator.exe',
      sha256: sha256(portableExe),
      size: readFileSync(portableExe).byteLength,
    },
    appAsar: {
      file: 'app.asar',
      sha256: sha256(appAsar),
      size: readFileSync(appAsar).byteLength,
    },
  },
};
writeFileSync(join(workDir, 'update-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

const ps = String.raw`
$ErrorActionPreference = "Stop"
$quiet = $env:FACTORY_TAKT_UPDATE_QUIET -eq "1"
$noLaunch = $env:FACTORY_TAKT_UPDATE_NO_LAUNCH -eq "1"

function Show-Info([string]$Message) {
  if ($quiet) { Write-Host $Message; return }
  Add-Type -AssemblyName System.Windows.Forms | Out-Null
  [System.Windows.Forms.MessageBox]::Show($Message, "Factory Takt Simulator 更新完成", "OK", "Information") | Out-Null
}

function Show-Fail([string]$Message) {
  if ($quiet) { Write-Error $Message; return }
  Add-Type -AssemblyName System.Windows.Forms | Out-Null
  [System.Windows.Forms.MessageBox]::Show($Message, "Factory Takt Simulator 更新失败", "OK", "Error") | Out-Null
}

function Get-ScriptDir {
  if ($PSScriptRoot) { return $PSScriptRoot }
  if ($PSCommandPath) { return (Split-Path -Parent $PSCommandPath) }
  return (Get-Location).Path
}

function Add-Candidate([System.Collections.Generic.List[string]]$List, [string]$Path) {
  if (-not $Path) { return }
  try {
    $full = [System.IO.Path]::GetFullPath($Path)
    if (-not $List.Contains($full)) { $List.Add($full) | Out-Null }
  } catch {}
}

function Get-ParentLaunchDir {
  try {
    $pidToCheck = $PID
    for ($i = 0; $i -lt 8; $i++) {
      $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $pidToCheck" -ErrorAction SilentlyContinue
      if (-not $proc -or -not $proc.ParentProcessId) { break }
      $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.ParentProcessId)" -ErrorAction SilentlyContinue
      if (-not $parent) { break }
      if ($parent.ExecutablePath -and (Test-Path -LiteralPath $parent.ExecutablePath)) {
        $name = [System.IO.Path]::GetFileName($parent.ExecutablePath)
        if ($name -like "Factory_Takt_Simulator*Update*.exe" -or $name -eq "Factory_Takt_Simulator_Update_Latest.exe") {
          return (Split-Path -Parent $parent.ExecutablePath)
        }
      }
      $pidToCheck = $parent.ProcessId
    }
  } catch {}
  return $null
}

function Test-FolderPortable([string]$Path) {
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return $false }
  return (Test-Path -LiteralPath (Join-Path $Path "Factory Takt Simulator.exe")) -and
    (Test-Path -LiteralPath (Join-Path $Path "resources\app.asar"))
}

function Find-SinglePortableExe([string]$Path) {
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return $null }
  $preferred = Join-Path $Path "Factory Takt Simulator.exe"
  if ((Test-Path -LiteralPath $preferred) -and -not (Test-Path -LiteralPath (Join-Path $Path "resources\app.asar"))) {
    return $preferred
  }
  $matches = Get-ChildItem -LiteralPath $Path -Filter "Factory_Takt_Simulator_Portable*.exe" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending
  if ($matches -and $matches.Count -gt 0) { return $matches[0].FullName }
  return $null
}

function Select-Target {
  $scriptDir = Get-ScriptDir
  $launchDir = Get-ParentLaunchDir
  $currentDir = (Get-Location).Path
  $candidates = New-Object 'System.Collections.Generic.List[string]'
  Add-Candidate $candidates $launchDir
  Add-Candidate $candidates $currentDir
  Add-Candidate $candidates $scriptDir
  Add-Candidate $candidates (Join-Path $launchDir "Factory_Takt_Simulator_Portable_Folder")
  Add-Candidate $candidates (Join-Path $currentDir "Factory_Takt_Simulator_Portable_Folder")
  Add-Candidate $candidates (Join-Path (Split-Path -Parent $launchDir) "Factory_Takt_Simulator_Portable_Folder")

  foreach ($candidate in $candidates) {
    if (Test-FolderPortable $candidate) { return @{ Kind = "folder"; Dir = $candidate; Exe = (Join-Path $candidate "Factory Takt Simulator.exe") } }
    $single = Find-SinglePortableExe $candidate
    if ($single) { return @{ Kind = "single"; Dir = (Split-Path -Parent $single); Exe = $single } }
  }

  Add-Type -AssemblyName System.Windows.Forms | Out-Null
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = "请选择包含 Factory Takt Simulator.exe 的旧版目录，或选择 Factory_Takt_Simulator_Portable_Folder"
  $dialog.ShowNewFolderButton = $false
  if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { throw "已取消更新。" }
  if (Test-FolderPortable $dialog.SelectedPath) {
    return @{ Kind = "folder"; Dir = $dialog.SelectedPath; Exe = (Join-Path $dialog.SelectedPath "Factory Takt Simulator.exe") }
  }
  $single = Find-SinglePortableExe $dialog.SelectedPath
  if ($single) { return @{ Kind = "single"; Dir = (Split-Path -Parent $single); Exe = $single } }
  throw "所选目录不是可更新目录：未找到单文件 Factory Takt Simulator.exe，或文件夹版 resources\app.asar。"
}

function Stop-TargetProcess([string]$ExePath) {
  try { $resolved = (Resolve-Path -LiteralPath $ExePath).Path } catch { return }
  $processes = Get-CimInstance Win32_Process -Filter "name = 'Factory Takt Simulator.exe'" -ErrorAction SilentlyContinue
  foreach ($process in $processes) {
    if (-not $process.ExecutablePath) { continue }
    try {
      if ((Resolve-Path -LiteralPath $process.ExecutablePath).Path -eq $resolved) {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 800
      }
    } catch {}
  }
}

try {
  $scriptDir = Get-ScriptDir
  $payloadExe = Join-Path $scriptDir "Factory Takt Simulator.exe"
  $payloadAsar = Join-Path $scriptDir "app.asar"
  $manifestPath = Join-Path $scriptDir "update-manifest.json"
  if (-not (Test-Path -LiteralPath $payloadExe)) { throw "更新包缺少新版 Factory Takt Simulator.exe。" }
  if (-not (Test-Path -LiteralPath $payloadAsar)) { throw "更新包缺少 app.asar。" }
  if (-not (Test-Path -LiteralPath $manifestPath)) { throw "更新包缺少 update-manifest.json。" }

  $target = Select-Target
  $backupRoot = Join-Path $target.Dir "updates"
  $backupDir = Join-Path $backupRoot ("backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  Stop-TargetProcess $target.Exe

  if ($target.Kind -eq "folder") {
    $targetAsar = Join-Path $target.Dir "resources\app.asar"
    Copy-Item -LiteralPath $targetAsar -Destination (Join-Path $backupDir "app.asar") -Force
    Copy-Item -LiteralPath $payloadAsar -Destination $targetAsar -Force
  } else {
    Copy-Item -LiteralPath $target.Exe -Destination (Join-Path $backupDir ([System.IO.Path]::GetFileName($target.Exe))) -Force
    Copy-Item -LiteralPath $payloadExe -Destination $target.Exe -Force
  }

  Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $backupRoot "last-update.json") -Force
  Show-Info ("更新完成。" + [Environment]::NewLine + "目标目录: " + $target.Dir + [Environment]::NewLine + "模式: " + $target.Kind)
  if (-not $noLaunch) {
    Start-Process -FilePath $target.Exe -WorkingDirectory $target.Dir | Out-Null
  }
} catch {
  Show-Fail $_.Exception.Message
  exit 1
}
`;
writeUtf8Bom(join(workDir, 'update-single.ps1'), ps);

const sedPath = join(workDir, 'iexpress.sed');
const workDirWithSlash = `${resolve(workDir)}\\`;
const sed = [
  '[Version]',
  'Class=IEXPRESS',
  'SEDVersion=3',
  '[Options]',
  'PackagePurpose=InstallApp',
  'ShowInstallProgramWindow=0',
  'HideExtractAnimation=1',
  'UseLongFileName=1',
  'InsideCompressed=0',
  'CAB_FixedSize=0',
  'CAB_ResvCodeSigning=0',
  'RebootMode=N',
  'InstallPrompt=',
  'DisplayLicense=',
  'FinishMessage=',
  `TargetName=${resolve(updateExe)}`,
  'FriendlyName=Factory Takt Simulator Single Exe Update',
  'AppLaunched=powershell.exe -NoProfile -ExecutionPolicy Bypass -File update-single.ps1',
  'PostInstallCmd=<None>',
  'AdminQuietInstCmd=',
  'UserQuietInstCmd=',
  'SourceFiles=SourceFiles',
  '[Strings]',
  'FILE0="Factory Takt Simulator.exe"',
  'FILE1="app.asar"',
  'FILE2="update-single.ps1"',
  'FILE3="update-manifest.json"',
  '[SourceFiles]',
  `SourceFiles0=${workDirWithSlash}`,
  '[SourceFiles0]',
  '%FILE0%=',
  '%FILE1%=',
  '%FILE2%=',
  '%FILE3%=',
  '',
].join('\r\n');
writeFileSync(sedPath, sed, 'utf8');

const iexpress = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'iexpress.exe');
if (!existsSync(iexpress)) fail(`iexpress.exe not found: ${iexpress}`);
rmSync(updateExe, { force: true });
const iexpressSed = 'release\\single-exe-update-work\\iexpress.sed';
const command = `& '${iexpress.replace(/'/g, "''")}' /N /Q '${iexpressSed}'`;
const result = run('powershell.exe', ['-NoProfile', '-Command', command]);
if (!waitForFile(updateExe)) {
  if (result.stdout) console.error(result.stdout);
  if (result.stderr) console.error(result.stderr);
  fail('Unable to create single-exe update artifact.');
}

const hash = sha256(updateExe);
writeFileSync(`${updateExe}.sha256.txt`, `${hash}  ${basename(updateExe)}\r\n`, 'utf8');
console.log(`[single-exe-update] ${updateExe}`);
console.log(`[single-exe-update] SHA256 ${hash}`);
