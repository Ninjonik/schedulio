param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Load-DotEnv {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    throw "Missing env file: $Path"
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) {
      return
    }

    [Environment]::SetEnvironmentVariable($parts[0], $parts[1])
  }
}

function Invoke-Appwrite {
  param([string[]]$CliArgs)

  $cmd = "bunx --bun appwrite-cli@latest " + ($CliArgs -join " ")
  Write-Host "> $cmd"

  if ($DryRun) {
    return
  }

  & bunx --bun appwrite-cli@latest @CliArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Appwrite CLI command failed with exit code $LASTEXITCODE"
  }
}

function Try-Run {
  param(
    [string]$Description,
    [scriptblock]$Action
  )

  try {
    & $Action
    Write-Host "[ok] $Description"
  } catch {
    Write-Host "[skip] $Description :: $($_.Exception.Message)"
  }
}

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root ".env.local"
$envExamplePath = Join-Path $root ".env.example"
$schemaPath = Join-Path $PSScriptRoot "appwrite-schema.json"

if (Test-Path $envPath) {
  Load-DotEnv -Path $envPath
} elseif ($DryRun -and (Test-Path $envExamplePath)) {
  Load-DotEnv -Path $envExamplePath
} else {
  throw "Missing env file: $envPath"
}
$schema = Get-Content $schemaPath -Raw | ConvertFrom-Json

$endpoint = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_APPWRITE_ENDPOINT")
$projectId = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_APPWRITE_PROJECT_ID")
$apiKey = [Environment]::GetEnvironmentVariable("APPWRITE_API_KEY")

if (-not $endpoint -or -not $projectId -or -not $apiKey) {
  throw "Missing one or more required env vars: NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY"
}

Invoke-Appwrite -CliArgs @("client", "--endpoint", $endpoint, "--project-id", $projectId, "--key", $apiKey)

Try-Run -Description "Create database $($schema.database.id)" -Action {
  Invoke-Appwrite -CliArgs @(
    "tables-db", "create",
    "--database-id", $schema.database.id,
    "--name", $schema.database.name,
    "--enabled", "true"
  )
}

foreach ($table in $schema.tables) {
  Try-Run -Description "Create table $($table.id)" -Action {
    $tableArgs = @(
      "tables-db", "create-table",
      "--database-id", $schema.database.id,
      "--table-id", $table.id,
      "--name", $table.name,
      "--row-security", ([string]$table.rowSecurity).ToLower()
    )

    if ($null -ne $table.permissions) {
      foreach ($permission in $table.permissions) {
        $tableArgs += @("--permissions", $permission)
      }
    }

    Invoke-Appwrite -CliArgs $tableArgs
  }

  foreach ($column in $table.columns) {
    $createCommand = "create-" + $column.type + "-column"
    $cliArgs = @(
      "tables-db", $createCommand,
      "--database-id", $schema.database.id,
      "--table-id", $table.id,
      "--key", $column.key,
      "--required", ([string]$column.required).ToLower()
    )

    switch ($column.type) {
      "varchar" {
        $cliArgs += @("--size", [string]$column.size)
      }
      "enum" {
        foreach ($element in $column.elements) {
          $cliArgs += @("--elements", $element)
        }
      }
      "integer" {
        if ($null -ne $column.min) {
          $cliArgs += @("--min", [string]$column.min)
        }
        if ($null -ne $column.max) {
          $cliArgs += @("--max", [string]$column.max)
        }
      }
    }

    if ($null -ne $column.default) {
      if ($column.type -eq "boolean") {
        $defaultValue = if ([bool]$column.default) { "true" } else { "false" }
        $cliArgs += @("--xdefault", $defaultValue)
      } else {
        $cliArgs += @("--xdefault", [string]$column.default)
      }
    }

    Try-Run -Description "Create column $($table.id).$($column.key)" -Action {
      Invoke-Appwrite -CliArgs $cliArgs
    }
  }

  foreach ($index in $table.indexes) {
    $indexArgs = @(
      "tables-db", "create-index",
      "--database-id", $schema.database.id,
      "--table-id", $table.id,
      "--key", $index.key,
      "--type", $index.type
    )

    foreach ($columnName in $index.columns) {
      $indexArgs += @("--columns", $columnName)
    }

    foreach ($order in $index.orders) {
      $indexArgs += @("--orders", $order)
    }

    Try-Run -Description "Create index $($table.id).$($index.key)" -Action {
      Invoke-Appwrite -CliArgs $indexArgs
    }
  }
}

Write-Host "Schema sync complete."




