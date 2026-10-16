#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
$configPath = 'C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg'
$originalConfig = [System.IO.File]::ReadAllText($configPath)
if ($originalConfig -match '(?m)^replication\s*:') {
    if ($originalConfig -notmatch '(?m)^\s+replSetName:\s*rs0\s*$') {
        throw 'An existing replication configuration was found. It was not changed.'
    }
    Write-Output 'Replica set configuration rs0 already exists.'
    exit 0
}
$backupPath = $configPath + '.gaavli-backup-' + [DateTime]::UtcNow.ToString('yyyyMMddHHmmss')
[System.IO.File]::WriteAllText($backupPath, $originalConfig)
$updatedConfig = $originalConfig.TrimEnd() + "`r`n`r`nreplication:`r`n  replSetName: rs0`r`n  oplogSizeMB: 128`r`n"
try {
    [System.IO.File]::WriteAllText($configPath, $updatedConfig)
    Restart-Service -Name MongoDB
    (Get-Service -Name MongoDB).WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
    Write-Output 'MongoDB restarted with rs0 configured. Existing data directory and localhost binding preserved.'
    Write-Output ('Configuration backup: ' + $backupPath)
} catch {
    [System.IO.File]::WriteAllText($configPath, $originalConfig)
    Start-Service -Name MongoDB -ErrorAction SilentlyContinue
    throw
}
