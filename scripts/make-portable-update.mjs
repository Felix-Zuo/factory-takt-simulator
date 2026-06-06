import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync, cpSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const releaseDir = join(root, 'release')
const unpackedDir = join(releaseDir, 'win-unpacked')
const folderPortableDir = join(releaseDir, 'Factory_Takt_Simulator_Portable_Folder')
const workDir = join(releaseDir, 'update-work')
const appAsar = join(unpackedDir, 'resources', 'app.asar')
const buildId = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '_')
const safeVersion = String(pkg.version || '0.0.0').replace(/[^\w.-]/g, '_')
const updateBaseName = `Factory_Takt_Simulator_Update_${safeVersion}_${buildId}`
const updateExe = join(releaseDir, `${updateBaseName}.exe`)
const updateZip = join(releaseDir, `${updateBaseName}.zip`)
const oneClickCmd = join(releaseDir, `${updateBaseName}_OneClick.cmd`)

function fail(message) {
  console.error(`\n[update-packager] ${message}`)
  process.exit(1)
}

function ensureFile(path, label) {
  if (!existsSync(path)) fail(`${label} not found: ${path}`)
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase()
}

function sizeOf(path) {
  return readFileSync(path).byteLength
}

function writeHashFile(path) {
  const hash = sha256(path)
  writeFileSync(`${path}.sha256.txt`, `${hash}  ${basename(path)}\r\n`, 'utf8')
  return hash
}

function cleanDir(path) {
  rmSync(path, { recursive: true, force: true })
  mkdirSync(path, { recursive: true })
}

function writeUtf8BomFile(path, content) {
  writeFileSync(path, `\uFEFF${content}`, 'utf8')
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
    windowsHide: true,
    ...options,
  })
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function waitForFile(path, timeoutMs = 8000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (existsSync(path)) return true
    sleep(200)
  }
  return existsSync(path)
}

function createOneClickCmd(manifest) {
  const appAsarBytes = readFileSync(appAsar)
  const appAsarBase64 = appAsarBytes.toString('base64').match(/.{1,7600}/g) ?? []
  const payload = {
    app: manifest.app,
    productName: manifest.productName,
    version: manifest.version,
    buildId: manifest.buildId,
    generatedAt: manifest.generatedAt,
    sha256: manifest.payload.sha256,
    manifest,
    appAsar: appAsarBase64,
  }
  const scriptMarker = '__FACTORY_TAKT_UPDATE_SCRIPT__'
  const marker = '__FACTORY_TAKT_UPDATE_PAYLOAD__'
  const ps = String.raw`$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
$marker='__FACTORY_TAKT_UPDATE_PAYLOAD__'
$self=$env:UPDATE_SELF
$launchDir=$env:UPDATE_LAUNCH_DIR
$quiet=$env:FACTORY_TAKT_UPDATE_QUIET -eq '1'
$noLaunch=$env:FACTORY_TAKT_UPDATE_NO_LAUNCH -eq '1'
function Info($m){if($quiet){Write-Host $m}else{[System.Windows.Forms.MessageBox]::Show($m,'Factory Takt Simulator Update','OK','Information')|Out-Null}}
function Fail($m){if($quiet){Write-Error $m}else{[System.Windows.Forms.MessageBox]::Show($m,'Factory Takt Simulator Update Failed','OK','Error')|Out-Null}}
function TestPortable($p){
  if(-not $p -or -not (Test-Path -LiteralPath $p)){return $false}
  return (Test-Path -LiteralPath (Join-Path $p 'Factory Takt Simulator.exe')) -and (Test-Path -LiteralPath (Join-Path $p 'resources\app.asar'))
}
function AddCandidate($list,$p){
  if(-not $p){return}
  try{$x=[IO.Path]::GetFullPath($p);if(-not $list.Contains($x)){$list.Add($x)|Out-Null}}catch{}
}
try{
  $raw=[IO.File]::ReadAllText($self,[Text.Encoding]::UTF8)
  $idx=$raw.LastIndexOf($marker)
  if($idx -lt 0){throw 'Update payload marker not found.'}
  $payload=$raw.Substring($idx+$marker.Length).Trim()|ConvertFrom-Json
  $c=New-Object 'System.Collections.Generic.List[string]'
  AddCandidate $c $launchDir
  AddCandidate $c (Join-Path $launchDir 'Factory_Takt_Simulator_Portable_Folder')
  AddCandidate $c (Join-Path (Split-Path -Parent $launchDir) 'Factory_Takt_Simulator_Portable_Folder')
  AddCandidate $c ((Get-Location).Path)
  AddCandidate $c (Join-Path ((Get-Location).Path) 'Factory_Takt_Simulator_Portable_Folder')
  $target=$null
  foreach($p in $c){if(TestPortable $p){$target=$p;break}}
  if(-not $target){
    $d=New-Object System.Windows.Forms.FolderBrowserDialog
    $d.Description='Select Factory_Takt_Simulator_Portable_Folder or the folder containing Factory Takt Simulator.exe'
    $d.ShowNewFolderButton=$false
    if($d.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK){throw 'Update cancelled.'}
    if(-not (TestPortable $d.SelectedPath)){throw 'Selected folder is not a Factory Takt Simulator portable folder.'}
    $target=$d.SelectedPath
  }
  $exe=Join-Path $target 'Factory Takt Simulator.exe'
  $asar=Join-Path $target 'resources\app.asar'
  $exeResolved=(Resolve-Path -LiteralPath $exe).Path
  $procs=Get-CimInstance Win32_Process -Filter "name = 'Factory Takt Simulator.exe'" -ErrorAction SilentlyContinue
  foreach($p in $procs){
    if($p.ExecutablePath){
      try{if((Resolve-Path -LiteralPath $p.ExecutablePath).Path -eq $exeResolved){Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue;Start-Sleep -Milliseconds 600}}catch{}
    }
  }
  $backupRoot=Join-Path $target 'updates'
  $backupDir=Join-Path $backupRoot ('backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
  New-Item -ItemType Directory -Force -Path $backupDir|Out-Null
  Copy-Item -LiteralPath $asar -Destination (Join-Path $backupDir 'app.asar') -Force
  $bytes=[Convert]::FromBase64String(($payload.appAsar -join ''))
  $sha=[BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($bytes)).Replace('-','')
  if($sha -ne $payload.sha256){throw 'Payload checksum mismatch.'}
  [IO.File]::WriteAllBytes($asar,$bytes)
  [IO.File]::WriteAllText((Join-Path $backupRoot 'last-update.json'),($payload.manifest|ConvertTo-Json -Depth 8),[Text.Encoding]::UTF8)
  Info ("Update completed."+[Environment]::NewLine+"Target: "+$target+[Environment]::NewLine+"Version: "+$payload.version)
  if(-not $noLaunch){Start-Process -FilePath $exe -WorkingDirectory $target|Out-Null}
}catch{Fail $_.Exception.Message;exit 1}`
  const launchPs = `$r=[IO.File]::ReadAllText($env:UPDATE_SELF,[Text.Encoding]::UTF8);$sm='${scriptMarker}';$pm='${marker}';$s=$r.Substring($r.LastIndexOf($sm)+$sm.Length);$s=$s.Substring(0,$s.LastIndexOf($pm));Invoke-Expression $s`
  const cmd = [
    '@echo off',
    'setlocal',
    'set "UPDATE_SELF=%~f0"',
    'set "UPDATE_LAUNCH_DIR=%~dp0"',
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${launchPs}"`,
    'exit /b %ERRORLEVEL%',
    scriptMarker,
    ps,
    marker,
    JSON.stringify(payload),
    '',
  ].join('\r\n')
  writeFileSync(oneClickCmd, cmd, 'utf8')
  return writeHashFile(oneClickCmd)
}

ensureFile(appAsar, 'Packaged app.asar')

cleanDir(folderPortableDir)
cpSync(unpackedDir, folderPortableDir, { recursive: true })
writeFileSync(
  join(folderPortableDir, 'START.bat'),
  '@echo off\r\ncd /d "%~dp0"\r\nstart "" "Factory Takt Simulator.exe"\r\n',
  'utf8',
)
writeUtf8BomFile(
  join(folderPortableDir, 'README_UPDATE.zh-CN.txt'),
  [
    'Factory Takt Simulator 文件夹便携版',
    '',
    '首次发给别人时，请发送整个 Factory_Takt_Simulator_Portable_Folder 文件夹，或发送全量便携 ZIP。',
    '后续更新时，只需要发送 Factory_Takt_Simulator_Update_*.exe。',
    '',
    '一键更新方式：',
    '1. 关闭正在运行的软件。',
    '2. 把 Factory_Takt_Simulator_Update_*.exe 放到便携版文件夹内，或放到 Factory_Takt_Simulator_Portable_Folder 同级目录。',
    '3. 双击更新 EXE。更新器会自动寻找便携版目录，备份旧 app.asar，替换为新版本。',
    '4. 如果自动寻找失败，更新器才会弹出文件夹选择窗口。',
    '',
    '注意：单文件便携 EXE 是自解压程序，不适合做小体积增量替换。',
    '长期给别人发小更新包时，请优先使用文件夹便携版。',
    '',
  ].join('\r\n'),
)

cleanDir(workDir)
copyFileSync(appAsar, join(workDir, 'app.asar'))

const manifest = {
  app: pkg.name,
  productName: pkg.build?.productName || 'Factory Takt Simulator',
  version: pkg.version,
  buildId,
  generatedAt: new Date().toISOString(),
  payload: {
    file: 'app.asar',
    sha256: sha256(appAsar),
    size: sizeOf(appAsar),
  },
  target: {
    executable: 'Factory Takt Simulator.exe',
    resource: 'resources/app.asar',
  },
}
writeFileSync(join(workDir, 'update-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

const updatePs1 = String.raw`param(
  [string]$Target = "",
  [switch]$Quiet,
  [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"

function Show-Info([string]$Message, [string]$Title = "Factory Takt Simulator 更新") {
  if (-not $Quiet) {
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    [System.Windows.Forms.MessageBox]::Show($Message, $Title, "OK", "Information") | Out-Null
  } else {
    Write-Host $Message
  }
}

function Show-Error([string]$Message) {
  if (-not $Quiet) {
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    [System.Windows.Forms.MessageBox]::Show($Message, "Factory Takt Simulator 更新失败", "OK", "Error") | Out-Null
  } else {
    Write-Error $Message
  }
}

function Get-UpdateScriptDir {
  if ($PSScriptRoot) { return $PSScriptRoot }
  if ($PSCommandPath) { return (Split-Path -Parent $PSCommandPath) }
  if ($MyInvocation.MyCommand.Path) { return (Split-Path -Parent $MyInvocation.MyCommand.Path) }
  return (Get-Location).Path
}

$UpdateScriptDir = Get-UpdateScriptDir

function Test-PortableFolder([string]$Path) {
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return $false }
  $targetExe = Join-Path $Path "Factory Takt Simulator.exe"
  $targetAsar = Join-Path $Path "resources\app.asar"
  return (Test-Path -LiteralPath $targetExe) -and (Test-Path -LiteralPath $targetAsar)
}

function Add-Candidate([System.Collections.Generic.List[string]]$List, [string]$Path) {
  if (-not $Path) { return }
  try {
    $resolved = [System.IO.Path]::GetFullPath($Path)
    if (-not $List.Contains($resolved)) { $List.Add($resolved) | Out-Null }
  } catch {
  }
}

function Select-TargetFolder {
  if ($Target -and $Target.Trim().Length -gt 0) {
    $resolvedTarget = (Resolve-Path -LiteralPath $Target).Path
    if (Test-PortableFolder $resolvedTarget) { return $resolvedTarget }
    throw "指定的目录不是 Factory Takt Simulator 文件夹便携版目录。"
  }

  $scriptDir = $UpdateScriptDir
  $currentDir = (Get-Location).Path
  $parentCurrent = Split-Path -Parent $currentDir
  $candidates = New-Object 'System.Collections.Generic.List[string]'

  Add-Candidate $candidates $currentDir
  Add-Candidate $candidates (Join-Path $currentDir "Factory_Takt_Simulator_Portable_Folder")
  Add-Candidate $candidates (Join-Path $parentCurrent "Factory_Takt_Simulator_Portable_Folder")
  Add-Candidate $candidates $scriptDir
  Add-Candidate $candidates (Join-Path $scriptDir "Factory_Takt_Simulator_Portable_Folder")

  foreach ($candidate in $candidates) {
    if (Test-PortableFolder $candidate) { return $candidate }
  }

  Add-Type -AssemblyName System.Windows.Forms | Out-Null
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = "请选择 Factory_Takt_Simulator_Portable_Folder 文件夹，或包含 Factory Takt Simulator.exe 的便携版目录"
  $dialog.ShowNewFolderButton = $false
  $result = $dialog.ShowDialog()
  if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
    throw "已取消更新。"
  }
  if (-not (Test-PortableFolder $dialog.SelectedPath)) {
    throw "所选目录不是文件夹便携版目录，未找到 Factory Takt Simulator.exe 或 resources\app.asar。"
  }
  return $dialog.SelectedPath
}

try {
  $scriptDir = $UpdateScriptDir
  $payloadAsar = Join-Path $scriptDir "app.asar"
  $payloadManifest = Join-Path $scriptDir "update-manifest.json"
  if (-not (Test-Path -LiteralPath $payloadAsar)) { throw "更新包缺少 app.asar。" }
  if (-not (Test-Path -LiteralPath $payloadManifest)) { throw "更新包缺少 update-manifest.json。" }

  $targetDir = Select-TargetFolder
  $targetExe = Join-Path $targetDir "Factory Takt Simulator.exe"
  $targetResources = Join-Path $targetDir "resources"
  $targetAsar = Join-Path $targetResources "app.asar"

  $targetExeResolved = (Resolve-Path -LiteralPath $targetExe).Path
  $processes = Get-CimInstance Win32_Process -Filter "name = 'Factory Takt Simulator.exe'" -ErrorAction SilentlyContinue
  foreach ($process in $processes) {
    if ($process.ExecutablePath) {
      try {
        if ((Resolve-Path -LiteralPath $process.ExecutablePath).Path -eq $targetExeResolved) {
          Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
          Start-Sleep -Milliseconds 600
        }
      } catch {
      }
    }
  }

  $backupRoot = Join-Path $targetDir "updates"
  $backupDir = Join-Path $backupRoot ("backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
  Copy-Item -LiteralPath $targetAsar -Destination (Join-Path $backupDir "app.asar") -Force

  Copy-Item -LiteralPath $payloadAsar -Destination $targetAsar -Force
  Copy-Item -LiteralPath $payloadManifest -Destination (Join-Path $backupRoot "last-update.json") -Force

  if ($Quiet) {
    Write-Host "Factory Takt Simulator 更新完成：$targetDir"
  } else {
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    $answer = [System.Windows.Forms.MessageBox]::Show(
      "更新完成。旧版本已备份到 updates 文件夹。是否现在启动 Factory Takt Simulator？",
      "Factory Takt Simulator 更新完成",
      "YesNo",
      "Information"
    )
    if ($answer -eq [System.Windows.Forms.DialogResult]::Yes -and -not $NoLaunch) {
      Start-Process -FilePath $targetExe -WorkingDirectory $targetDir | Out-Null
    }
  }
} catch {
  Show-Error $_.Exception.Message
  exit 1
}
`
writeUtf8BomFile(join(workDir, 'update.ps1'), updatePs1.replace(/\n/g, '\r\n'))

const sedPath = join(workDir, 'iexpress.sed')
const workDirWithSlash = `${resolve(workDir)}\\`
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
  'FriendlyName=Factory Takt Simulator Update',
  'AppLaunched=powershell.exe -NoProfile -ExecutionPolicy Bypass -File update.ps1',
  'PostInstallCmd=<None>',
  'AdminQuietInstCmd=',
  'UserQuietInstCmd=',
  'SourceFiles=SourceFiles',
  '[Strings]',
  'FILE0="app.asar"',
  'FILE1="update.ps1"',
  'FILE2="update-manifest.json"',
  '[SourceFiles]',
  `SourceFiles0=${workDirWithSlash}`,
  '[SourceFiles0]',
  '%FILE0%=',
  '%FILE1%=',
  '%FILE2%=',
  '',
].join('\r\n')
writeFileSync(sedPath, sed, 'utf8')

let artifact = null
const iexpress = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'iexpress.exe')
if (existsSync(iexpress)) {
  rmSync(updateExe, { force: true })
  const iexpressSed = 'release\\update-work\\iexpress.sed'
  const iexpressCommand = `& '${iexpress.replace(/'/g, "''")}' /N /Q '${iexpressSed}'`
  const result = run('powershell.exe', ['-NoProfile', '-Command', iexpressCommand])
  if (waitForFile(updateExe)) {
    artifact = updateExe
  } else {
    console.warn('[update-packager] IExpress failed, falling back to zip.')
    if (result.stdout) console.warn(result.stdout)
    if (result.stderr) console.warn(result.stderr)
  }
}

if (!artifact) {
  rmSync(updateZip, { force: true })
  const psCommand = `Compress-Archive -Path '${join(workDir, '*').replace(/'/g, "''")}' -DestinationPath '${updateZip.replace(/'/g, "''")}' -Force`
  const result = run('powershell.exe', ['-NoProfile', '-Command', psCommand])
  if (result.status !== 0 || !existsSync(updateZip)) {
    if (result.stdout) console.error(result.stdout)
    if (result.stderr) console.error(result.stderr)
    fail('Unable to create update exe or zip.')
  }
  artifact = updateZip
}

const artifactHash = writeHashFile(artifact)
const oneClickHash = createOneClickCmd(manifest)

console.log('\n[update-packager] Portable folder:')
console.log(`  ${folderPortableDir}`)
console.log('[update-packager] Update artifact:')
console.log(`  ${artifact}`)
console.log(`  SHA256 ${artifactHash}`)
console.log('[update-packager] One-click CMD update artifact:')
console.log(`  ${oneClickCmd}`)
console.log(`  SHA256 ${oneClickHash}`)
console.log(`[update-packager] app.asar size: ${manifest.payload.size} bytes`)
console.log(`[update-packager] app.asar SHA256: ${manifest.payload.sha256}`)
