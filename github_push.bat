@echo off
chcp 65001 > nul
REM =========================================================
REM  SCRIPT PARA ENVIAR SEU PROJETO PARA O GITHUB
REM =========================================================

REM ATENÇÃO:
REM 1. Certifique-se de ter o Git instalado no seu sistema.
REM 2. Se você nunca fez login no GitHub pelo Git nesta máquina,
REM    o Git pode pedir suas credenciais (nome de usuário e Personal Access Token - PAT).
REM    O GitHub não aceita mais senhas de conta via linha de comando para autenticação.
REM    Crie seu PAT aqui: https://github.com/settings/tokens (selecione o escopo 'repo')
REM 3. Por favor, edite a linha 'set "GITHUB_REPO_URL="' abaixo com a URL CORRETA do seu repositório GitHub!

echo.
echo =========================================================
echo  INÍCIO DO PROCESSO DE ENVIO PARA O GITHUB
echo =========================================================
echo.

REM 1. DEFINE O DIRETÓRIO DO SEU PROJETO LOCAL
REM    Este é o caminho da sua pasta Better_Now.
set "PROJECT_DIR=C:\Users\renat\OneDrive\CESIRE\Cesire\Aplicativos\Better_Now"

REM 2. DEFINE A URL DO SEU REPOSITÓRIO GITHUB REMOTO
REM    !!! IMPORTANTE: VOCÊ DEVE SUBSTITUIR O VALOR ABAIXO PELA URL DO SEU REPOSITÓRIO !!!
REM    Exemplo: set "GITHUB_REPO_URL=https://github.com/renatoernan/Better_Now.git"
set "GITHUB_REPO_URL=https://github.com/renatoernan/Better_Now.git" 

REM --- VERIFICAÇÕES INICIAIS ---
if not exist "%PROJECT_DIR%" (
    echo ERRO: O diretório do projeto não foi encontrado: %PROJECT_DIR%
    echo Verifique o caminho especificado e tente novamente.
    pause
    exit /b 1
)

if "%GITHUB_REPO_URL%"=="" (
    echo ERRO: A URL do seu repositório GitHub NAO foi definida no script.
    echo Por favor, edite este arquivo .bat e insira a URL correta em GITHUB_REPO_URL.
    pause
    exit /b 1
)

echo Navegando para o diretório do projeto: %PROJECT_DIR%
cd /d "%PROJECT_DIR%"
if %errorlevel% neq 0 (
    echo ERRO: Não foi possível navegar para o diretório do projeto.
    pause
    exit /b %errorlevel%
)

REM 3. INICIALIZA OU GARANTE A CONFIGURAÇÃO DO REPOSITÓRIO GIT LOCAL
if not exist ".git" (
    echo Inicializando um novo repositório Git...
    git init --initial-branch=main
    if %errorlevel% neq 0 (
        echo ERRO ao inicializar o repositório Git.
        pause
        exit /b %errorlevel%
    )
) else (
    echo Repositório Git ja inicializado.
    REM Garante que o branch principal seja 'main'
    git branch -M main
    if %errorlevel% neq 0 (
        echo ERRO ao garantir o branch 'main'.
        pause
        exit /b %errorlevel%
    )
)

echo Adicionando todos os arquivos alterados/novos ao staging area...
git add .
if %errorlevel% neq 0 (
    echo ERRO ao adicionar arquivos ao staging area.
    pause
    exit /b %errorlevel%
)

echo Criando commit das alteracoes...
REM Uma mensagem de commit padrão é usada. Você pode alterá-la no script se desejar.
git commit -m "Atualizacao automatica via script BAT"
REM Se não houver alterações, o Git commit pode retornar um aviso, mas o script continuará.
if %errorlevel% neq 0 (
    echo Aviso: Nenhuma alteracao para commitar ou erro nao fatal ao commitar. Continuar com o push.
)

REM 4. ADICIONA OU VERIFICA O REPOSITÓRIO REMOTO (ORIGIN)
echo Verificando configuracao do repositorio remoto 'origin'...
git remote show origin >nul 2>&1
if %errorlevel% neq 0 (
    echo Adicionando repositorio remoto 'origin' com a URL: %GITHUB_REPO_URL%
    git remote add origin "%GITHUB_REPO_URL%"
    if %errorlevel% neq 0 (
        echo ERRO ao adicionar o repositorio remoto 'origin'.
        pause
        exit /b %errorlevel%
    )
) else (
    REM 'origin' já existe, verifica se a URL corresponde
    for /f "tokens=*" %%i in ('git remote get-url origin') do set "current_remote_url=%%i"
    if /i not "%current_remote_url%"=="%GITHUB_REPO_URL%" (
        echo ATENCAO: A URL remota 'origin' existente e diferente da definida no script.
        echo URL existente: %current_remote_url%
        echo URL definida no script: %GITHUB_REPO_URL%
        echo Removendo 'origin' existente e adicionando novamente com a URL do script.
        git remote remove origin
        if %errorlevel% neq 0 (
            echo ERRO ao remover o repositorio remoto existente.
            pause
            exit /b %errorlevel%
        )
        git remote add origin "%GITHUB_REPO_URL%"
        if %errorlevel% neq 0 (
            echo ERRO ao adicionar 'origin' com a URL correta.
            pause
            exit /b %errorlevel%
        )
    ) else (
        echo Repositorio remoto 'origin' ja configurado e com a URL correta.
    )
)

echo Enviando arquivos para o GitHub (branch main)...
REM O '-u' (ou '--set-upstream') define o branch remoto padrão e só precisa ser usado na primeira vez.
git push -u origin main
if %errorlevel% neq 0 (
    echo ERRO FATAL ao enviar para o GitHub.
    echo Por favor, verifique:
    echo 1. Sua conexao com a internet.
    echo 2. Suas credenciais Git (Personal Access Token - PAT/SSH) ou se voce esta logado corretamente.
    echo 3. A URL do repositorio definida no script esta correta e acessivel.
    pause
    exit /b %errorlevel%
)

echo.
echo =========================================================
echo  Projeto enviado com SUCESSO para o GitHub! ✨
echo =========================================================
echo.

pause