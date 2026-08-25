$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$venvPath = Join-Path $projectRoot '.venv-mineru'
$pythonPath = Join-Path $venvPath 'Scripts\python.exe'

if (-not (Test-Path -LiteralPath $pythonPath)) {
  py -3.12 -m venv $venvPath
}

& $pythonPath -m pip install --upgrade pip
& $pythonPath -m pip install 'mineru[core]==3.4.4'

Write-Host "MinerU installed: $venvPath"
