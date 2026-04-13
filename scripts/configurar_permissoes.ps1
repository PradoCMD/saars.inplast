# ============================================================
#  Configurar permissões da pasta de Automação
#  Execute este script no Windows Server (PowerShell como Admin)
# ============================================================

$pastaBase = "C:\producao\2 - PCP\Pedidos transportadora (Automação)"

# Ajuste o caminho acima se o compartilhamento 'producao' 
# estiver em outro caminho local no servidor.
# Para descobrir, execute no servidor:
#   net share producao

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configurando permissoes..." -ForegroundColor Cyan  
Write-Host "  Pasta: $pastaBase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Dar permissão de Modificar para "Todos" (Everyone)
$acl = Get-Acl $pastaBase
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "Everyone",                              # Quem
    "Modify",                                # Permissão (Ler + Escrever + Modificar)
    "ContainerInherit,ObjectInherit",        # Herdar em subpastas e arquivos
    "None",                                  # Sem propagação bloqueada
    "Allow"                                  # Tipo: Permitir
)
$acl.AddAccessRule($rule)

# Aplicar na pasta e em todos os arquivos/subpastas
Set-Acl -Path $pastaBase -AclObject $acl

# Aplicar também em cada arquivo individualmente (para os já existentes)
Get-ChildItem -Path $pastaBase -Recurse | ForEach-Object {
    try {
        $itemAcl = Get-Acl $_.FullName
        $itemAcl.AddAccessRule($rule)
        Set-Acl -Path $_.FullName -AclObject $itemAcl
        Write-Host "  OK: $($_.Name)" -ForegroundColor Green
    } catch {
        Write-Host "  ERRO: $($_.Name) - $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  PERMISSOES CONFIGURADAS COM SUCESSO!" -ForegroundColor Green
Write-Host "  Todos podem editar os arquivos agora." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
